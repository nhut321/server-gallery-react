const mongoose = require("mongoose");

const ImageSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Tên ảnh
  like: { type: Number, default: 0 }      // Số lượt like, mặc định là 0
});

const Image = mongoose.model("Image", ImageSchema);

module.exports = Image;
