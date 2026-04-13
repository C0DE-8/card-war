// backend/middleware/uploadCardImage.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = "uploads/cards";

// ensure folder exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedMimeTypes = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif"
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const name = req.body.name || "card";
    const ext = path.extname(file.originalname).toLowerCase();

    const safeName = name
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_]/g, "");

    cb(null, `${safeName}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (png, jpg, webp, gif)"), false);
  }
};

const uploadCardImage = multer({ storage, fileFilter });

module.exports = uploadCardImage;