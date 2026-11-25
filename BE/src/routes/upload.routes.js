const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * POST /api/v1/upload
 * Payload: { image: "data:image/png;base64,...", name?: "diagram.png" }
 */
router.post('/', async (req, res, next) => {
  try {
    const { image, name } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu hình ảnh (base64) không được để trống'
      });
    }

    // Check if it's base64 data url
    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let extension = 'png';
    let buffer;

    if (matches && matches.length === 3) {
      const mime = matches[1];
      if (mime.includes('jpeg') || mime.includes('jpg')) extension = 'jpg';
      else if (mime.includes('png')) extension = 'png';
      else if (mime.includes('gif')) extension = 'gif';
      else if (mime.includes('webp')) extension = 'webp';
      else if (mime.includes('svg')) extension = 'svg';

      buffer = Buffer.from(matches[2], 'base64');
    } else {
      // Direct raw base64 string
      buffer = Buffer.from(image, 'base64');
    }

    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    const cleanName = (name || 'upload').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${Date.now()}_${uniqueSuffix}_${cleanName}.${extension}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, buffer);

    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol || 'http';
    const fileUrl = `${protocol}://${host}/uploads/${fileName}`;

    return res.status(201).json({
      success: true,
      message: 'Tải hình ảnh lên thành công',
      data: {
        file_name: fileName,
        url: fileUrl
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
