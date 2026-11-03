const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: Number(process.env.SMTP_PORT) || 2525,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
});

/**
 * Envío seguro de correos transaccionales con fallback en desarrollo
 */
async function sendMail({ to, subject, text, html }) {
  const from = process.env.EMAIL_FROM || '"Inventarios Mahoraga" <soporte@mahoraga.local>';

  // Si estamos en entorno de prueba o no hay credenciales SMTP completas, logueamos el enlace sin romper la petición
  if (process.env.NODE_ENV === 'test' || !process.env.SMTP_USER) {
    console.log(`[MAIL NOTIFICATION SIMULATION] Para: ${to} | Asunto: ${subject}`);
    if (text) console.log(`[MAIL CONTENT]:\n${text}`);
    return { messageId: 'simulated-mail-id' };
  }

  try {
    return await transporter.sendMail({ from, to, subject, text, html });
  } catch (error) {
    console.error('[MAIL ERROR] Error enviando correo:', error.message);
    // En desarrollo no interrumpimos el flujo si falla el envío de correo real
    return { error: error.message };
  }
}

async function sendPasswordResetEmail(email, resetUrl) {
  const subject = 'Recuperación de Contraseña - Inventarios Mahoraga';
  const text = `Has solicitado restablecer tu contraseña en Inventarios Mahoraga.\n\nPor favor ingresa al siguiente enlace para continuar:\n${resetUrl}\n\nEste enlace expirará en 1 hora. Si tú no solicitaste este cambio, puedes ignorar este mensaje.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #4F46E5;">Inventarios Mahoraga</h2>
      <p>Has solicitado restablecer tu contraseña.</p>
      <p style="margin: 25px 0;">
        <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Restablecer Contraseña
        </a>
      </p>
      <p style="font-size: 13px; color: #64748b;">Este enlace es de un solo uso y expirará en 1 hora.</p>
      <p style="font-size: 12px; color: #94a3b8;">Si no solicitaste este cambio, ignora este correo de forma segura.</p>
    </div>
  `;
  return sendMail({ to: email, subject, text, html });
}

async function sendInvitationEmail(email, inviteUrl, businessName) {
  const subject = `Invitación para unirte a ${businessName || 'Inventarios Mahoraga'}`;
  const text = `Has sido invitado a formar parte del equipo de ${businessName || 'Inventarios Mahoraga'}.\n\nPor favor completa tu registro y define tu contraseña en el siguiente enlace:\n${inviteUrl}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #4F46E5;">Inventarios Mahoraga</h2>
      <p>Has sido invitado a formar parte del equipo en <strong>${businessName || 'Inventarios Mahoraga'}</strong>.</p>
      <p style="margin: 25px 0;">
        <a href="${inviteUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Activar mi Cuenta y Crear Contraseña
        </a>
      </p>
      <p style="font-size: 13px; color: #64748b;">Una vez establecida tu contraseña podrás acceder a las funciones asignadas a tu rol.</p>
    </div>
  `;
  return sendMail({ to: email, subject, text, html });
}

module.exports = {
  sendMail,
  sendPasswordResetEmail,
  sendInvitationEmail
};
