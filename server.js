const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const nodemailer = require("nodemailer");
const cors = require("cors");
const dotenv = require("dotenv");
const sanitizeHtml = require("sanitize-html");

const app = express();
const port = process.env.PORT || 3000;

// Load environment variables
dotenv.config();

// Initialize SQLite database
const db = new sqlite3.Database("./database.db", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    db.run(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT,
        message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS inquiries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT,
        product TEXT,
        message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
});

// Middleware
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : [
          "http://localhost:5173",
          "https://www.top10enterprise.com",
          "https://api.top10enterprise.com",
        ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json());

// Nodemailer setup for Hostinger Email
const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Sanitize input
const sanitizeInput = (input) => {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  });
};

// Page Routing Endpoint
app.get("/api/page", (req, res) => {
  console.log("Received /api/page request with query:", req.query); // Debug log
  const { path } = req.query;
  const routes = {
    "/": { component: "Homepage" },
    "/products": { component: "Products" },
    "/contact": { component: "ContactUs" },
    "/aboutUs": { component: "AboutUs" },
  };

  if (routes[path]) {
    console.log("Returning page data:", routes[path]); // Debug log
    res.status(200).json(routes[path]);
  } else {
    console.log("Page not found for path:", path); // Debug log
    res.status(404).json({ error: "Page not found" });
  }
});

// Contact Form Endpoint
app.post("/api/contact", async (req, res) => {
  console.log("Received /api/contact request with body:", req.body); // Debug log
  const { name, email, message } = req.body;

  // Validate input
  if (!name || !email || !message) {
    console.log("Validation failed: Missing fields");
    return res.status(400).json({ error: "All fields are required" });
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    console.log("Validation failed: Invalid email");
    return res.status(400).json({ error: "Invalid email" });
  }

  const sanitizedName = sanitizeInput(name);
  const sanitizedEmail = sanitizeInput(email);
  const sanitizedMessage = sanitizeInput(message);

  // Store in database
  db.run(
    "INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)",
    [sanitizedName, sanitizedEmail, sanitizedMessage],
    (err) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ error: "Failed to save contact" });
      }
    }
  );

  // Send email notification
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_TO || "zuby@top10enterprise.com",
    subject: "New Contact Form Submission",
    text: `Name: ${sanitizedName}\nEmail: ${sanitizedEmail}\nMessage: ${sanitizedMessage}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
    res.status(200).json({ message: "Contact form submitted successfully" });
  } catch (error) {
    console.error("Email error:", error.message, error);
    res.status(500).json({ error: `Failed to send email: ${error.message}` });
  }
});

// Subscription Endpoint
app.post("/api/subscribe", async (req, res) => {
  console.log("Received /api/subscribe request with body:", req.body); // Debug log
  const { email } = req.body;

  // Validate input
  if (!email) {
    console.log("Validation failed: Email is required");
    return res.status(400).json({ error: "Email is required" });
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    console.log("Validation failed: Invalid email");
    return res.status(400).json({ error: "Invalid email" });
  }

  const sanitizedEmail = sanitizeInput(email);

  // Store in database
  db.run(
    "INSERT OR IGNORE INTO subscriptions (email) VALUES (?)",
    [sanitizedEmail],
    (err) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ error: "Failed to save subscription" });
      }
    }
  );

  // Send email notification
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_TO || "zuby@top10enterprise.com",
    subject: "New Email Subscription",
    text: `Email: ${sanitizedEmail}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
    res.status(200).json({ message: "Subscription successful" });
  } catch (error) {
    console.error("Email error:", error.message, error);
    res.status(500).json({ error: `Failed to send email: ${error.message}` });
  }
});

// Product Inquiry Endpoint
app.post("/api/inquiry", async (req, res) => {
  console.log("Received /api/inquiry request with body:", req.body); // Debug log
  const { name, email, product, message } = req.body;

  // Validate input
  if (!name || !email || !product || !message) {
    console.log("Validation failed: Missing fields");
    return res.status(400).json({ error: "All fields are required" });
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    console.log("Validation failed: Invalid email");
    return res.status(400).json({ error: "Invalid email" });
  }

  const sanitizedName = sanitizeInput(name);
  const sanitizedEmail = sanitizeInput(email);
  const sanitizedProduct = sanitizeInput(product);
  const sanitizedMessage = sanitizeInput(message);

  // Store in database
  db.run(
    "INSERT INTO inquiries (name, email, product, message) VALUES (?, ?, ?, ?)",
    [sanitizedName, sanitizedEmail, sanitizedProduct, sanitizedMessage],
    (err) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ error: "Failed to save inquiry" });
      }
    }
  );

  // Send email notification
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_TO || "zuby@top10enterprise.com",
    subject: `New Inquiry for ${sanitizedProduct}`,
    text: `Name: ${sanitizedName}\nEmail: ${sanitizedEmail}\nProduct: ${sanitizedProduct}\nMessage: ${sanitizedMessage}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
    res.status(200).json({ message: "Inquiry submitted successfully" });
  } catch (error) {
    console.error("Email error:", error.message, error);
    res.status(500).json({ error: `Failed to send email: ${error.message}` });
  }
});

// Catch-all route for debugging
app.use((req, res) => {
  console.log(`Unhandled request: ${req.method} ${req.url}`);
  res.status(404).json({ error: "Route not found" });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
