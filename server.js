// const express = require("express");
// const cloudinary = require("cloudinary").v2;
// const multer = require("multer");
// const path = require("path");
// const cors = require("cors");
// const connectDB = require("./db/index.js");
// const Image = require("./models/Image.js");
// const http = require("http");
// const { Server } = require("socket.io");

// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: "*",
//     methods: ["GET", "POST"]
//   }
// });

// app.use(cors());
// app.use(express.json());

// connectDB();

// cloudinary.config({
//   cloud_name: "dn0ohbo3r",
//   api_key: "995924347891571",
//   api_secret: "0Ag49RB9uUxpHCw-KHR-yxHK6yI"
// });

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "uploads/");
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + path.extname(file.originalname));
//   }
// });

// const upload = multer({ storage: storage });

// app.post("/upload", async (req, res) => {
//   try {
//     const { name, like, url, title, description } = req.body;
//     const newImage = new Image({ name, like, url, title, description });
//     const savedImage = await newImage.save();
//     res.status(201).json(savedImage);
//   } catch (error) {
//     console.error("Error saving image:", error);
//     res.status(500).json({ message: "Error saving image", error });
//   }
// });

// app.get("/images", async (req, res) => {
//   try {
//     const result = await cloudinary.api.resources({
//       type: "upload",
//       prefix: "gallery/",
//       resource_type: "image",
//       context: true,
//       max_results: 500,
//     });

//     const images = result.resources.map(resource => ({
//       id: resource.public_id,
//       url: resource.secure_url,
//       title: resource.context?.custom?.title || "No title",
//       description: resource.context?.custom?.description || "No description",
//       tags: resource.tags || [],
//       created_at: new Date(resource.created_at).toLocaleString(),
//     }));
    
//     res.json(images);
//   } catch (error) {
//     console.log(error)
//     res.status(500).json({ error: error.message });
//   }
// });

// app.get("/images/gallery/:id", async (req, res) => {
//   const { id } = req.params;
//   const image = await Image.find({ name: id });

//   try {
//     const result = await cloudinary.api.resource("gallery/" + id, {
//       resource_type: "image",
//       context: true,
//     });

//     const imageData = {
//       id: result.public_id,
//       url: result.secure_url,
//       title: result.context?.custom?.title || "No title",
//       description: result.context?.custom?.description || "No description",
//       tags: result.tags || [],
//       created_at: new Date(result.created_at).toLocaleString(),
//       like: image.like
//     };

//     res.json(imageData);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// app.get("/status", (req, res) => {
//   res.json({ status: "ready" });
// });

// // Socket.io Chat Feature
// let onlineUsers = 0;

// io.on("connection", (socket) => {
//   console.log(`User connected: ${socket.id}`);

//   socket.on("send_message", (data) => {
//     socket.broadcast.emit("receive_message", data);
//   });

//   onlineUsers++;
//   io.emit("update_online_users", onlineUsers); // Gửi số người online cho tất cả client
//   console.log(`User connected: ${socket.id}, Online: ${onlineUsers}`);

//   socket.on("disconnect", () => {
//     onlineUsers--;
//     io.emit("update_online_users", onlineUsers); // Cập nhật khi user rời đi
//     console.log(`User disconnected: ${socket.id}, Online: ${onlineUsers}`);
//   });
// });

// server.listen(5000, () => {
//   console.log("Server is running on port 5000");
// });

//cloudinary =====================

// const express = require("express");
// const cloudinary = require("cloudinary").v2;
// const multer = require("multer");
// const path = require("path");
// const cors = require("cors");
// const connectDB = require("./db/index.js");
// const Image = require("./models/Image.js");
// const http = require("http");
// const { Server } = require("socket.io");
// const redisClient = require("./redisClient");

// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: "*",
//     methods: ["GET", "POST"]
//   }
// });

// // const redisClient = redis.createClient();
// // redisClient.connect().catch(console.error);

// app.use(cors());
// app.use(express.json());

// connectDB();

// cloudinary.config({
//   cloud_name: "dn0ohbo3r",
//   api_key: "995924347891571",
//   api_secret: "0Ag49RB9uUxpHCw-KHR-yxHK6yI"
// });

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "uploads/");
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + path.extname(file.originalname));
//   }
// });

// const upload = multer({ storage: storage });

// app.post("/upload", async (req, res) => {
//   try {
//     const { name, like, url, title, description } = req.body;
//     const newImage = new Image({ name, like, url, title, description });
//     const savedImage = await newImage.save();
//     res.status(201).json(savedImage);
//   } catch (error) {
//     console.error("Error saving image:", error);
//     res.status(500).json({ message: "Error saving image", error });
//   }
// });

// app.get("/images", async (req, res) => {
//   try {
//     const cachedImages = await redisClient.get("gallery_images");
//     if (cachedImages) {
//       return res.json(JSON.parse(cachedImages));
//     }

//     const result = await cloudinary.api.resources({
//       type: "upload",
//       prefix: "gallery/",
//       resource_type: "image",
//       context: true,
//       max_results: 500,
//     });

//     const images = result.resources.map(resource => ({
//       id: resource.public_id,
//       url: resource.secure_url,
//       title: resource.context?.custom?.title || "No title",
//       description: resource.context?.custom?.description || "No description",
//       tags: resource.tags || [],
//       created_at: new Date(resource.created_at).toLocaleString(),
//     }));
    
//     await redisClient.setEx("gallery_images", 600, JSON.stringify(images));
//     res.json(images);
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ error: error.message });
//   }
// });

// app.get("/images/gallery/:id", async (req, res) => {
//   const { id } = req.params;

//   try {
//     const cachedImage = await redisClient.get(`image_${id}`);
//     if (cachedImage) {
//       return res.json(JSON.parse(cachedImage));
//     }

//     const result = await cloudinary.api.resource("gallery/" + id, {
//       resource_type: "image",
//       context: true,
//     });

//     const image = await Image.findOne({ name: id });

//     const imageData = {
//       id: result.public_id,
//       url: result.secure_url,
//       title: result.context?.custom?.title || "No title",
//       description: result.context?.custom?.description || "No description",
//       tags: result.tags || [],
//       created_at: new Date(result.created_at).toLocaleString(),
//       like: image?.like || 0
//     };

//     await redisClient.setEx(`image_${id}`, 600, JSON.stringify(imageData));
//     res.json(imageData);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// app.get("/status", (req, res) => {
//   res.json({ status: "ready" });
// });

// let onlineUsers = 0;

// io.on("connection", (socket) => {
//   console.log(`User connected: ${socket.id}`);

//   socket.on("send_message", (data) => {
//     socket.broadcast.emit("receive_message", data);
//   });

//   onlineUsers++;
//   io.emit("update_online_users", onlineUsers);
//   console.log(`User connected: ${socket.id}, Online: ${onlineUsers}`);

//   socket.on("disconnect", () => {
//     onlineUsers--;
//     io.emit("update_online_users", onlineUsers);
//     console.log(`User disconnected: ${socket.id}, Online: ${onlineUsers}`);
//   });
// });

// server.listen(5000, () => {
//   console.log("Server is running on port 5000");
// });

//imgBB ====================
const express = require("express");
const multer = require("multer");
const axios = require("axios");
const cors = require("cors");
const connectDB = require("./db/index.js");
const Image = require("./models/Image.js");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
connectDB();

const storage = multer.memoryStorage();
const upload = multer({ storage: multer.memoryStorage() }); // Lưu vào RAM

const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

let imageCache = [];

// Hàm preload ảnh từ ImgBB
const preloadImages = async () => {
  try {
    console.log("Preloading images...");
    const images = await Image.find();

    for (const img of images) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 300)); // Delay 300ms
        const response = await axios.get(img.url, { responseType: "arraybuffer" });
        imageCache.push({ ...img.toObject(), buffer: response.data });
      } catch (error) {
        console.error(`Failed to preload image ${img.url}`, error.message);
      }
    }

    console.log("Images preloaded successfully!");
  } catch (error) {
    console.error("Error preloading images:", error);
  }
};


// Gọi preloadImages khi server khởi động
preloadImages();

// Upload ảnh lên ImgBB
app.post("/upload", async (req, res) => {
  try {
    const { name, url, title, description } = req.body;
    
    if (!name || !url || !title) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newImage = new Image({ name, url, title, description, like: 0 });
    await newImage.save();

    res.status(201).json({ message: "Image saved successfully", data: newImage });
  } catch (error) {
    console.error("Error saving image:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Lấy danh sách ảnh từ MongoDB
app.get("/images", async (req, res) => {
  try {
    const images = await Image.find();
    res.json(images);
  } catch (error) {
    console.error("Error fetching images:", error);
    res.status(500).json({ message: "Error fetching images", error });
  }
});

// Lấy chi tiết ảnh theo ID
app.get("/images/:id", async (req, res) => {
  try {
    const image = await Image.findById(req.params.id);
    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }
    res.json(image);
  } catch (error) {
    console.error("Error fetching image:", error);
    res.status(500).json({ message: "Error fetching image", error });
  }
});

// Like một ảnh (tăng số lượt like lên 1)
app.put("/images/:id/like", async (req, res) => {
  try {
    const image = await Image.findByIdAndUpdate(
      req.params.id,
      { $inc: { like: 1 } }, // Tăng giá trị like lên 1
      { new: true } // Trả về document đã được cập nhật
    );

    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }

    res.json({ message: "Liked successfully", image });
  } catch (error) {
    console.error("Error liking image:", error);
    res.status(500).json({ message: "Error liking image", error });
  }
});

app.get("/status", (req, res) => {
  res.json({ status: "ready" });
});

let onlineUsers = 0;

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("send_message", (data) => {
    socket.broadcast.emit("receive_message", data);
  });

  onlineUsers++;
  io.emit("update_online_users", onlineUsers);
  console.log(`User connected: ${socket.id}, Online: ${onlineUsers}`);

  socket.on("disconnect", () => {
    onlineUsers--;
    io.emit("update_online_users", onlineUsers);
    console.log(`User disconnected: ${socket.id}, Online: ${onlineUsers}`);
  });
});

server.listen(5000, () => {
  console.log("Server is running on port 5000");
});

