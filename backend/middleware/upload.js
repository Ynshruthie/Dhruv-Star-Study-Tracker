const multer = require('multer');

// Store files in memory so we can upload them directly to Supabase Storage
const storage = multer.memoryStorage();

// Accept PNG, JPG, WEBP
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024, files: 100 }, // 15MB limit per file, up to 100 files max
  fileFilter
});

module.exports = upload;
