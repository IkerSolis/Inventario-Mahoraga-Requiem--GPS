/**
 * Middleware para la carga de imágenes usando Multer.
 * únicamente image/png, image/jpeg, image/jpg.
 * máximo 5MB.
 * Almacenamiento en disco local dentro de /uploads/products.
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Carpeta donde se guardaran las imágenes de productos
const uploadDir = path.resolve(__dirname, '../../uploads/products');

// Validacion de que el directorio existe
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de almacenamiento en disco
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generamos un nombre seguro para evitar colisiones: prod-<timestamp>-<random><extension>
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `prod-${uniqueSuffix}${ext}`);
  }
});

// Filtro estricto de tipos MIME
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de imagen inválido. Solo se admiten archivos JPG, JPEG y PNG.'), false);
  }
};

// Middleware configurado (límite de 5 MB)
const uploadProductImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

module.exports = uploadProductImage;

