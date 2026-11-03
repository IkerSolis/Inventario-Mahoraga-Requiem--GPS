const { z } = require('zod');

// Validación de complejidad de contraseña: mín 8 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número y 1 símbolo
const passwordComplexityRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,64}$/;

const passwordField = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(64, 'La contraseña no puede exceder 64 caracteres')
  .regex(
    passwordComplexityRegex,
    'La contraseña debe contener al menos una letra mayúscula, una minúscula, un número y un carácter especial.'
  );

const loginSchema = z.object({
  email: z.string().trim().email('El formato de correo electrónico no es válido').toLowerCase(),
  password: z.string().min(1, 'La contraseña es requerida')
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('El formato de correo electrónico no es válido').toLowerCase()
});

const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Token de recuperación inválido'),
  newPassword: passwordField
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
  newPassword: passwordField
});

module.exports = {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema
};
