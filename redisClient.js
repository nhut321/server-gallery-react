const redis = require("redis");

const client = redis.createClient({
  socket: {
    host: "redis-10116.c54.ap-northeast-1-2.ec2.redns.redis-cloud.com",
    port: 10116,
  },
  username: "default",
  password: "zFFVISFNtuIXB9kFXbmxNcmjqqIOlzIT",
});

client.on("error", (err) => console.error("❌ Redis Error:", err));
client.on("connect", () => console.log("✅ Connected to Redis Cloud"));

(async () => {
  try {
    if (!client.isOpen) await client.connect();
    console.log("✅ Redis is ready!");

    // Kiểm tra Redis bằng cách set & get dữ liệu
    await client.set("test_key", "Hello Redis!");
    const value = await client.get("test_key");
    console.log("🔹 Redis value:", value);
  } catch (error) {
    console.error("❌ Redis connection failed:", error);
  }
})();

// Chỉ đóng Redis khi server shutdown
process.on("SIGINT", async () => {
  await client.quit();
  console.log("❌ Redis client closed.");
  process.exit(0);
});

module.exports = client;
