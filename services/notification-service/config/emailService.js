const nodemailer = require('nodemailer');

// Connect to Mailpit SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT) || 1025,
  secure: false,
  ignoreTLS: true
});

console.log(`Email service ready → sending to ${process.env.SMTP_HOST || 'localhost'}:${process.env.SMTP_PORT || 1025}`);

const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: '"Leave Management System" <noreply@lms.com>',
      to,
      subject,
      html
    });
    console.log(`Email sent to: ${to} | Subject: ${subject}`);
    console.log(`   View at: http://localhost:8025`);
  } catch (error) {
    console.error(`Email failed: ${error.message}`);
    // Don't throw — notification failure shouldn't crash service
  }
};

module.exports = { sendEmail };