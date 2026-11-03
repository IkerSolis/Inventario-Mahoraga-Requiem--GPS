const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadBaseDir = path.resolve(__dirname, '../../uploads');
const avatarsDir = path.join(uploadBaseDir, 'avatars');
const logosDir = path.join(uploadBaseDir, 'logos');

// Asegurar que las carpetas existan
[uploadBaseDir, avatarsDir, logosDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Filtro estricto de tipos MIME permitidos
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se aceptan formatos PNG, JPG y WEBP.'), false);
  }
};

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  }
});

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, logosDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `logo-${uniqueSuffix}${ext}`);
  }
});

const maxSizeBytes = (Number(process.env.MAX_FILE_SIZE_MB) || 5) * 1024 * 1024;

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: maxSizeBytes },
  fileFilter
});

const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: maxSizeBytes },
  fileFilter
});

module.exports = {
  uploadAvatar,
  uploadLogo
};
