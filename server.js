const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const http = require("http");
const multer = require("multer");
const mime = require("mime-types");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
require("dotenv").config();

const connectDB = require("./db/index.js");
const Image = require("./models/Image.js");

const app = express();
const server = http.createServer(app);

// CORS configuration
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Multer memory storage for uploads up to 50MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Load Cloudflare R2 Config
const R2_CONFIG_PATH = path.join(__dirname, "..", "r2-config.json");
let r2Config = null;
if (fs.existsSync(R2_CONFIG_PATH)) {
  try {
    r2Config = JSON.parse(fs.readFileSync(R2_CONFIG_PATH, "utf8"));
  } catch (e) {
    console.error("Could not parse r2-config.json:", e.message);
  }
}

// S3 Client for Cloudflare R2
let s3Client = null;
if (r2Config && r2Config.accountId && r2Config.accessKeyId) {
  s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2Config.accessKeyId,
      secretAccessKey: r2Config.secretAccessKey,
    },
  });
  console.log("Cloudflare R2 S3 Client initialized.");
}

// Local backup path
const DATA_DIR = path.join(__dirname, "data");
const BACKUP_FILE = path.join(DATA_DIR, "images.json");
const CLIENT_FALLBACK = path.join(__dirname, "..", "gallery-vite", "src", "data", "fallbackImages.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory cache for fast responses
let memoryCache = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 min

// Helper to fetch all images from MongoDB and cache to disk
async function getImagesFromDB() {
  try {
    const images = await Image.find().sort({ createdAt: -1 }).lean();
    if (images && images.length > 0) {
      memoryCache = images.map(img => ({
        ...img,
        _id: img._id.toString(),
        id: img._id.toString()
      }));
      lastFetchTime = Date.now();

      // Save backups
      fs.writeFileSync(BACKUP_FILE, JSON.stringify(memoryCache, null, 2), "utf8");
      if (fs.existsSync(path.dirname(CLIENT_FALLBACK))) {
        fs.writeFileSync(CLIENT_FALLBACK, JSON.stringify(memoryCache, null, 2), "utf8");
      }
      return memoryCache;
    }
  } catch (err) {
    console.error("MongoDB fetch error, using backup:", err.message);
  }

  // Fallback to local backup if DB query failed
  if (fs.existsSync(BACKUP_FILE)) {
    try {
      const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, "utf8"));
      memoryCache = backup;
      return backup;
    } catch (e) {
      console.error("Backup read error:", e.message);
    }
  }

  return memoryCache || [];
}

// Routes
app.get("/status", (req, res) => {
  res.json({ status: "ready" });
});
app.get("/api/status", (req, res) => {
  res.json({ status: "ready" });
});

// GET /images & /api/images
const handleGetImages = async (req, res) => {
  try {
    const now = Date.now();
    if (!memoryCache || (now - lastFetchTime > CACHE_TTL_MS)) {
      await getImagesFromDB();
    }

    const result = memoryCache || [];

    // Pagination query support: ?page=1&limit=20
    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);
    if (!isNaN(page) && !isNaN(limit) && page > 0 && limit > 0) {
      const start = (page - 1) * limit;
      const end = start + limit;
      return res.json({
        total: result.length,
        page,
        limit,
        hasMore: end < result.length,
        data: result.slice(start, end)
      });
    }

    res.json(result);
  } catch (error) {
    console.error("Error serving images:", error);
    res.status(500).json({ error: error.message });
  }
};

app.get("/images", handleGetImages);
app.get("/api/images", handleGetImages);

// GET /images/:id & /api/images/:id
const handleGetSingleImage = async (req, res) => {
  try {
    const id = req.params.id;
    let found = null;

    try {
      found = await Image.findById(id).lean();
    } catch (e) {}

    if (!found && memoryCache) {
      found = memoryCache.find(img => img._id === id || img.name === id);
    }

    if (!found) {
      return res.status(404).json({ message: "Image not found" });
    }

    res.json(found);
  } catch (error) {
    console.error("Error fetching single image:", error);
    res.status(500).json({ error: error.message });
  }
};

app.get("/images/:id", handleGetSingleImage);
app.get("/api/images/:id", handleGetSingleImage);

// LIKE endpoint: POST or PUT /images/:id/like
const handleLike = async (req, res) => {
  try {
    const id = req.params.id;
    let updated = null;

    try {
      updated = await Image.findByIdAndUpdate(
        id,
        { $inc: { like: 1 } },
        { new: true }
      ).lean();
    } catch (e) {
      console.warn("MongoDB like update error:", e.message);
    }

    if (memoryCache) {
      const item = memoryCache.find(img => img._id === id);
      if (item) {
        item.like = updated ? updated.like : (item.like || 0) + 1;
      }
    }

    const finalLikes = updated ? updated.like : 1;
    res.json({ message: "Liked successfully", id, like: finalLikes });
  } catch (error) {
    console.error("Error liking image:", error);
    res.status(500).json({ error: error.message });
  }
};

app.put("/images/:id/like", handleLike);
app.post("/images/:id/like", handleLike);
app.put("/api/images/:id/like", handleLike);
app.post("/api/images/:id/like", handleLike);

// UPLOAD ENDPOINT: Uploads to Cloudflare R2 & saves directly to MongoDB
const handleUpload = async (req, res) => {
  try {
    let fileBuffer = null;
    let originalName = "uploaded_image.jpg";
    let contentType = "image/jpeg";

    if (req.file) {
      fileBuffer = req.file.buffer;
      originalName = req.file.originalname;
      contentType = req.file.mimetype || mime.lookup(originalName) || "image/jpeg";
    } else if (req.body.fileBase64) {
      // Support Base64 JSON upload
      fileBuffer = Buffer.from(req.body.fileBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
      originalName = req.body.name || "image.jpg";
      contentType = mime.lookup(originalName) || "image/jpeg";
    } else if (req.body.url) {
      // Direct URL save
      const newImage = new Image({
        name: req.body.name || "image.jpg",
        url: req.body.url,
        title: req.body.title || "Tác phẩm mới",
        description: req.body.description || "",
        like: 0
      });
      const saved = await newImage.save();
      await getImagesFromDB();
      return res.status(201).json({ success: true, message: "Saved to MongoDB", data: saved });
    } else {
      return res.status(400).json({ success: false, message: "Vui lòng chọn file ảnh để tải lên!" });
    }

    const title = req.body.title || originalName;
    const description = req.body.description || "";

    if (!s3Client || !r2Config) {
      return res.status(500).json({
        success: false,
        message: "Chưa cấu hình Cloudflare R2 trong r2-config.json!"
      });
    }

    // Build unique R2 Key
    const ext = path.extname(originalName).toLowerCase() || ".jpg";
    const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    const s3Key = `gallery/${Date.now()}_${baseName}${ext}`;

    // Upload to Cloudflare R2
    console.log(`Đang tải ảnh lên Cloudflare R2 [${s3Key}]...`);
    await s3Client.send(
      new PutObjectCommand({
        Bucket: r2Config.bucketName,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    const publicDomain = r2Config.publicDomain.replace(/\/+$/, "");
    const r2Url = `${publicDomain}/${s3Key}`;
    console.log(`-> Đã tải lên R2 thành công: ${r2Url}`);

    // Save to MongoDB Audition.images
    const newImage = new Image({
      name: originalName,
      url: r2Url,
      title: title,
      description: description,
      like: 0,
    });
    const saved = await newImage.save();
    console.log(`-> Đã lưu vào MongoDB với ID: ${saved._id}`);

    // Refresh memory cache & backup files
    await getImagesFromDB();

    res.status(201).json({
      success: true,
      message: "Đã tải ảnh lên Cloudflare R2 và lưu vào MongoDB thành công!",
      data: saved,
      url: r2Url
    });
  } catch (error) {
    console.error("Lỗi khi upload ảnh:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

app.post("/upload", upload.single("file"), handleUpload);
app.post("/api/upload", upload.single("file"), handleUpload);

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await connectDB();
  const imgs = await getImagesFromDB();
  console.log(`Loaded ${imgs.length} images from MongoDB ready to serve.`);
});
