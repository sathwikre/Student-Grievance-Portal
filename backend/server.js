// server.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

dotenv.config({ path: path.resolve("./.env") }); // explicitly point to your .env
console.log("Loaded MONGO_URI:", process.env.MONGO_URI);
// Import routes
import authRoutes from "./routes/auth.js";
import complaintRoutes from "./routes/complaint.js";

// Initialize Express
const app = express();
const PORT = 9000;

// To use __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware
// During development, allow requests from any origin to simplify testing (adjust in production)
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend"))); // serve frontend
app.use('/uploads', express.static(path.join(__dirname, "../uploads"))); // serve uploaded files

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ DB Error:", err));

// API routes
app.use("/api/auth", authRoutes(upload));
app.use("/api/complaints", complaintRoutes);

// Serve admin-login.html
app.get("/admin-login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/admin-login.html"));
});

// Specific frontend routes
app.get("/student.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/student.html"));
});

app.get("/view.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/view.html"));
});

// Serve studentlogin.html for /studentlogin.html path
app.get("/studentlogin.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/studentlogin.html"));
});

// Default route - serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Start server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
