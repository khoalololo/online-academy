import nodemailer from 'nodemailer';

// Create transporter with Ethereal test account
let transporter;

async function initMailer() {
  const testAccount = await nodemailer.createTestAccount();

  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });

  console.log('Ethereal mail ready!');
  console.log(`Login URL: ${nodemailer.getTestMessageUrl({
    messageId: testAccount.user
  }) || 'Open email preview will appear after sending.'}`);
}

// Call it immediately
await initMailer();

export async function sendMail({ to, subject, html }) {
  const info = await transporter.sendMail({
    from: '"Online Academy 🎓" <no-reply@onlineacademy.com>',
    to,
    subject,
    html
  });

  console.log('Message sent:', info.messageId);
  console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
}
