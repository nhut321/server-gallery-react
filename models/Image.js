const mongoose = require("mongoose");

const ImageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // Tên ảnh
    url: { type: String, required: true },  // Đường dẫn ảnh từ ImgBB
    title: { type: String, required: true }, // Tiêu đề ảnh
    description: { type: String, required: true }, // Mô tả ảnh
    like: { type: Number, default: 0 }      // Số lượt like, mặc định là 0
  },
  { timestamps: true } // Tự động thêm createdAt và updatedAt
);

const Image = mongoose.model("Image", ImageSchema);

module.exports = Image;
