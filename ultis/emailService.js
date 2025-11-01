import nodemailer from 'nodemailer';

// Gmail SMTP Configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: '	bbba77903@gmail.com',
    pass: 'your-app-password'
  }
});

export async function sendMail({ to, subject, html }) {
  try {
    const info = await transporter.sendMail({
        from: '"Online Academy" <bbba77903@gmail.com>',
        to,
      subject,
      html
    });
    return info;
  } catch (error) {
    throw error;
  }
}