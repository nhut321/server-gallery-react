const mongoose = require("mongoose");
const dns = require("dns");

// Set reliable DNS servers for SRV record lookup on Windows/ISP
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://admin:abcd1234@cluster0.tp3tu.mongodb.net/Audition?retryWrites=true&w=majority";

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected successfully to Audition database!");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
  }
};

module.exports = connectDB;
