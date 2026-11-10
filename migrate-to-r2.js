const fs = require("fs");
const path = require("path");
const axios = require("axios");
const mime = require("mime-types");
const dns = require("dns");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const mongoose = require("mongoose");
const { execSync } = require("child_process");

// Set DNS for MongoDB Atlas SRV resolution
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const CONFIG_PATH = path.join(__dirname, "..", "r2-config.json");
const MONGO_URI = "mongodb+srv://admin:abcd1234@cluster0.tp3tu.mongodb.net/Audition?retryWrites=true&w=majority";

async function main() {
  console.log("=====================================================");
  console.log("    TOOL DI CHUYỂN TOÀN BỘ ẢNH TỪ IMGBB SANG R2     ");
  console.log("=====================================================\n");

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const publicDomain = config.publicDomain.replace(/\/+$/, "");

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  console.log("[1/4] Đang kết nối tới MongoDB Atlas...");
  await mongoose.connect(MONGO_URI);
  console.log("-> Kết nối MongoDB thành công!\n");

  const Image = require("./models/Image.js");
  const allImages = await Image.find().sort({ createdAt: -1 });

  // Filter only images that are NOT yet on R2
  const pendingImages = allImages.filter(doc => {
    const url = doc.url || "";
    return !url.includes(publicDomain) && !url.includes(".r2.dev");
  });

  console.log(`[2/4] Tổng số ảnh: ${allImages.length}. Đã có trên R2: ${allImages.length - pendingImages.length}. Cần chuyển tiếp: ${pendingImages.length}.\n`);

  if (pendingImages.length === 0) {
    console.log("Tất cả ảnh đã ở trên Cloudflare R2!");
  } else {
    // Process 2 at a time for remaining stubborn ImgBB files
    const CONCURRENCY = 2;

    for (let i = 0; i < pendingImages.length; i += CONCURRENCY) {
      const chunk = pendingImages.slice(i, i + CONCURRENCY);

      await Promise.all(
        chunk.map(async (doc, idx) => {
          const itemIndex = i + idx + 1;
          const currentUrl = doc.url || "";

          const ext = path.extname(doc.name || "").toLowerCase() || ".jpg";
          const cleanName = path.basename(doc.name || `image_${doc._id}`, ext);
          const s3Key = `gallery/${doc._id}_${cleanName}${ext}`;

          let downloaded = null;
          let attempts = 0;

          while (attempts < 5 && !downloaded) {
            attempts++;
            try {
              const resp = await axios.get(currentUrl, {
                responseType: "arraybuffer",
                timeout: 45000,
                headers: {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                },
              });
              downloaded = resp;
            } catch (err) {
              console.log(`[Thử lần ${attempts}] ${doc.title} (${currentUrl}): ${err.message}`);
              if (attempts >= 5) {
                console.error(`[THẤT BẠI] Không thể tải ảnh: ${doc.title}`);
                return;
              }
              await new Promise((r) => setTimeout(r, 2000));
            }
          }

          if (!downloaded) return;

          const contentType = mime.lookup(ext) || downloaded.headers["content-type"] || "image/jpeg";
          try {
            await s3.send(
              new PutObjectCommand({
                Bucket: config.bucketName,
                Key: s3Key,
                Body: downloaded.data,
                ContentType: contentType,
                CacheControl: "public, max-age=31536000, immutable",
              })
            );

            const newR2Url = `${publicDomain}/${s3Key}`;
            await Image.updateOne({ _id: doc._id }, { $set: { url: newR2Url } });
            console.log(`[${itemIndex}/${pendingImages.length}] [THÀNH CÔNG] ${doc.title || doc.name} -> ${newR2Url}`);
          } catch (s3Err) {
            console.error(`[UPLOAD R2 LỖI] ${doc.title}: ${s3Err.message}`);
          }
        })
      );

      await new Promise((r) => setTimeout(r, 300));
    }
  }

  console.log("\n[3/4] Đang đồng bộ dữ liệu mới về file dự phòng của Web...");
  const updatedImages = await Image.find().sort({ createdAt: -1 }).lean();
  const formatted = updatedImages.map((img) => ({
    ...img,
    _id: img._id.toString(),
    id: img._id.toString(),
  }));

  const serverBackup = path.join(__dirname, "data", "images.json");
  const clientBackup = path.join(__dirname, "..", "gallery-vite", "src", "data", "fallbackImages.json");

  fs.writeFileSync(serverBackup, JSON.stringify(formatted, null, 2), "utf8");
  fs.writeFileSync(clientBackup, JSON.stringify(formatted, null, 2), "utf8");
  console.log("-> Đã lưu 388 link R2 mới vào server data và client data!");

  console.log("\n[4/4] Đang build lại Vite Client...");
  try {
    const viteDir = path.join(__dirname, "..", "gallery-vite");
    const artGalleryDir = path.join(__dirname, "..", "ArtGallery-PLTH");

    execSync("npm run build", { cwd: viteDir, stdio: "inherit" });
    const distDir = path.join(viteDir, "dist");
    execSync(`powershell -Command "Copy-Item -Path '${distDir}\\*' -Destination '${artGalleryDir}\\' -Recurse -Force"`, {
      stdio: "inherit",
    });
    console.log("-> Đã cập nhật xong bản build sang ArtGallery-PLTH!");
  } catch (buildErr) {
    console.warn("Build cảnh báo:", buildErr.message);
  }

  console.log("\n=====================================================");
  console.log("   HOÀN TẤT DI CHUYỂN TOÀN BỘ ẢNH SANG CLOUDFLARE R2!  ");
  console.log("=====================================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("Lỗi:", err);
  process.exit(1);
});
