const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    ciphers: "SSLv3",
    rejectUnauthorized: false, // Allow self-signed certificates
  },
});

async function testEmail() {
  try {
    await transporter.verify();
    console.log("SMTP connection verified successfully");
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: "test@example.com", // Replace with an email you can access
      subject: "Test Email from Top10Enterprise",
      text: "This is a test email.",
    });
    console.log("Test email sent successfully");
  } catch (error) {
    console.error("Test email error:", error.message, error);
  }
}

testEmail();
