import nodemailer from 'nodemailer';

// Configuración del transportador de email
const transporter = nodemailer.createTransport({
  service: 'gmail', // Puedes cambiar a SendGrid o otro servicio
  auth: {
    user: process.env.SENDGRID_FROM_EMAIL,
    pass: process.env.SENDGRID_API_KEY
  }
});

export const sendVerificationEmail = async (email: string, userId: string) => {
  try {
    const verificationUrl = `${process.env.CORS_ORIGIN}/verify-email?token=${userId}&email=${email}`;
    
    const mailOptions = {
      from: process.env.SENDGRID_FROM_EMAIL,
      to: email,
      subject: 'Verifica tu cuenta - FinZen AI',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">¡Bienvenido a FinZen AI!</h2>
          <p>Gracias por registrarte en nuestra plataforma de finanzas personales con IA.</p>
          <p>Para completar tu registro, por favor verifica tu cuenta haciendo clic en el siguiente enlace:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Verificar mi cuenta
            </a>
          </div>
          <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
          <p style="word-break: break-all; color: #6b7280;">${verificationUrl}</p>
          <p>Este enlace expirará en 24 horas.</p>
          <p>¡Saludos!<br>El equipo de FinZen AI</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

export const sendPasswordResetEmail = async (email: string, resetToken: string) => {
  try {
    const resetUrl = `${process.env.CORS_ORIGIN}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.SENDGRID_FROM_EMAIL,
      to: email,
      subject: 'Restablece tu contraseña - FinZen AI',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Restablece tu contraseña</h2>
          <p>Has solicitado restablecer tu contraseña en FinZen AI.</p>
          <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Restablecer contraseña
            </a>
          </div>
          <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
          <p style="word-break: break-all; color: #6b7280;">${resetUrl}</p>
          <p>Este enlace expirará en 1 hora.</p>
          <p>Si no solicitaste este cambio, puedes ignorar este email.</p>
          <p>¡Saludos!<br>El equipo de FinZen AI</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}; 