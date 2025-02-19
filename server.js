// Import các thư viện cần thiết
const express = require('express');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const cors = require('cors')
const connectDB = require("./db/index.js");
const Image = require("./models/Image.js");

// Khởi tạo ứng dụng Express
const app = express();

app.use(cors());
app.use(express.json());

connectDB()

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: 'dn0ohbo3r',    // Thay 'your-cloud-name' bằng cloud name của bạn
  api_key: '995924347891571',          // Thay 'your-api-key' bằng API key của bạn
  api_secret: '0Ag49RB9uUxpHCw-KHR-yxHK6yI'     // Thay 'your-api-secret' bằng API secret của bạn
});

// Cấu hình Multer để lưu ảnh vào thư mục tạm thời trước khi upload lên Cloudinary
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Route để upload ảnh
app.post('/upload', async (req, res) => {
  try {
    const { name, like, url, title, description } = req.body;
    
    // Tạo và lưu ảnh mới vào MongoDB
    const newImage = new Image({
      name: name,
      like: like,
      url: url,
      title: title,
      description: description
    });

    const savedImage = await newImage.save();
    res.status(201).json(savedImage);
  } catch (error) {
    console.error('Error saving image:', error);
    res.status(500).json({ message: 'Error saving image', error });
  }
});




app.get('/images', async (req, res) => {
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'gallery/', // Lọc ảnh trong thư mục 'gallery'
      resource_type: 'image',
      context: true,
      max_results: 500, // Tăng số lượng ảnh trả về
    });

    console.log(result.resources.length)
    
    const images = result.resources.map(resource => ({
      id: resource.public_id,
      url: resource.secure_url,
      title: resource.context?.custom?.title || 'No title', // Lấy title từ context
      description: resource.context?.custom?.description || 'No description', // Lấy description từ context
      tags: resource.tags || [], // Lấy tags của ảnh
      created_at: new Date(resource.created_at).toLocaleString(),
    }));
    
    res.json(images); // Trả về dữ liệu hình ảnh với title, description, tags
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get('/images/gallery/:id', async (req, res) => {
  const { id } = req.params; // Lấy ID từ params trong URL

  const image = await Image.find({name: id})

  try {
    // Gọi Cloudinary API để lấy thông tin ảnh cụ thể
    const result = await cloudinary.api.resource('gallery/' + id, {
      resource_type: 'image',
      context: true, // Lấy context
    });

    // Trả về thông tin ảnh dưới dạng JSON
    const imageData = {
      id: result.public_id,
      url: result.secure_url,
      title: result.context?.custom?.title || 'No title',
      description: result.context?.custom?.description || 'No description',
      tags: result.tags || [],
      created_at: new Date(result.created_at).toLocaleString(),
      like: image.like
    };

    res.json(imageData); // Trả về dữ liệu ảnh
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.get('/status', (req,res) => {
  res.json({
    status: 'ready'
  })
})




// Chạy server trên port 5000
app.listen(5000, () => {
  console.log('Server is running on port 5000');
});
