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

const express = require("express");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const connectDB = require("./db/index.js");
const Image = require("./models/Image.js");
const http = require("http");
const { Server } = require("socket.io");
const redisClient = require("./redisClient");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// const redisClient = redis.createClient();
// redisClient.connect().catch(console.error);

app.use(cors());
app.use(express.json());

connectDB();

cloudinary.config({
  cloud_name: "dn0ohbo3r",
  api_key: "995924347891571",
  api_secret: "0Ag49RB9uUxpHCw-KHR-yxHK6yI"
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

app.post("/upload", async (req, res) => {
  try {
    const { name, like, url, title, description } = req.body;
    const newImage = new Image({ name, like, url, title, description });
    const savedImage = await newImage.save();
    res.status(201).json(savedImage);
  } catch (error) {
    console.error("Error saving image:", error);
    res.status(500).json({ message: "Error saving image", error });
  }
});

app.get("/images", async (req, res) => {
  try {
    const cachedImages = await redisClient.get("gallery_images");
    if (cachedImages) {
      return res.json(JSON.parse(cachedImages));
    }

    const result = await cloudinary.api.resources({
      type: "upload",
      prefix: "gallery/",
      resource_type: "image",
      context: true,
      max_results: 500,
    });

    const images = result.resources.map(resource => ({
      id: resource.public_id,
      url: resource.secure_url,
      title: resource.context?.custom?.title || "No title",
      description: resource.context?.custom?.description || "No description",
      tags: resource.tags || [],
      created_at: new Date(resource.created_at).toLocaleString(),
    }));
    
    await redisClient.setEx("gallery_images", 600, JSON.stringify(images));
    res.json(images);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/images/gallery/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const cachedImage = await redisClient.get(`image_${id}`);
    if (cachedImage) {
      return res.json(JSON.parse(cachedImage));
    }

    const result = await cloudinary.api.resource("gallery/" + id, {
      resource_type: "image",
      context: true,
    });

    const image = await Image.findOne({ name: id });

    const imageData = {
      id: result.public_id,
      url: result.secure_url,
      title: result.context?.custom?.title || "No title",
      description: result.context?.custom?.description || "No description",
      tags: result.tags || [],
      created_at: new Date(result.created_at).toLocaleString(),
      like: image?.like || 0
    };

    await redisClient.setEx(`image_${id}`, 600, JSON.stringify(imageData));
    res.json(imageData);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
