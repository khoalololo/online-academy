import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: process.env.SMTP_PORT || 587,
  auth: {
    user: process.env.SMTP_USER,  
    pass: process.env.SMTP_PASS      
  }
});

export async function sendMail({ to, subject, html }) {
  try {
    const info = await transporter.sendMail({
      from: '"Online Academy 🎓" <minhkhoa278kd@gmail.com>',  
      to,
      subject,
      html
    });
    console.log('Email sent via Brevo:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email error:', error);
    throw error;
  }
}