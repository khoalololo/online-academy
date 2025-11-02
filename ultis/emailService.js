import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  auth: {
    user: '9a8f55001@smtp-brevo.com',  
    pass: 'Cn2bspxzBqTvkjEa'      
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