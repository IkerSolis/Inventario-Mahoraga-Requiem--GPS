const { ZodError } = require('zod');
const multer = require('multer');

function errorHandler(err, req, res, next) {
  // Manejo de errores de validación de esquemas Zod
  if (err instanceof ZodError) {
    const fieldErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message
    }));

    return res.status(400).json({
      error: 'Error de validación',
      message: 'Los datos enviados en la petición no cumplen con el formato esperado.',
      details: fieldErrors
    });
  }

  // Manejo de errores de Multer (archivos pesados o tipos no válidos)
  if (err instanceof multer.MulterError) {
    let message = 'Error en la subida del archivo.';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'El archivo supera el tamaño máximo permitido (5MB).';
    }
    return res.status(400).json({
      error: 'Archivo no válido',
      code: err.code,
      message
    });
  }

  // Error de sintaxis JSON en el cuerpo de la petición
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'JSON malformado',
      message: 'El cuerpo de la petición contiene un formato JSON inválido.'
    });
  }

  // Errores con código de estado HTTP explícito
  if (err.statusCode || err.status) {
    return res.status(err.statusCode || err.status).json({
      error: err.name || 'Error en la solicitud',
      message: err.message
    });
  }

  // Error no controlado / 500 Internal Server Error
  console.error('[UNHANDLED ERROR]', err);
  return res.status(500).json({
    error: 'Error interno del servidor',
    message:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'Ocurrió un error inesperado al procesar la solicitud.'
  });
}

module.exports = errorHandler;
