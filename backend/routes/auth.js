import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Admin from "../models/Admin.js";

const router = express.Router();

export default function(authUpload) {

  // --------------------
  // TEMPORARY: Delete all students
  router.delete("/delete-all-students", async (req, res) => {
    try {
      const result = await User.deleteMany({ role: "student" });
      res.status(200).json({ message: `Deleted ${result.deletedCount} students.` });
    } catch (err) {
      console.error("Delete students error:", err);
      res.status(500).json({ message: "Server error" });
    }
  });
  // Student registration
  // --------------------
  router.post("/register", async (req, res) => {
    const { username, email, password, studentId, department, role } = req.body;

    try {
      const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
      if (existingUser) return res.status(400).json({ message: "Email already exists" });

      const newUser = new User({
        username,
        email: email.trim().toLowerCase(),
        password: password.trim(),
        role,
        studentId,
        department,
      });

      await newUser.save();
      res.status(201).json({ message: "Account created successfully" });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ message: "Server error" });
    }
  });

  // --------------------
  // Login (student or admin)
  // --------------------
  router.post("/login", async (req, res) => {
    console.log("Login request received with body:", req.body);
    const { email, password } = req.body;
    if (!email || !password) {
      console.log("Missing email or password in request");
      return res.status(400).json({ message: "Email and password are required" });
    }
    const trimmedEmail = email.trim().toLowerCase();

    // Check hardcoded admins first
    // Removed hardcoded admin check to avoid ReferenceError
    // Admin login is handled separately in /admin-login route

    // Then check students
    try {
      const student = await User.findOne({ email: trimmedEmail });
      if (!student) {
        console.log("Student not found for email:", trimmedEmail);
        return res.status(401).json({ message: "Student not found" });
      }

      // 🔧 FIXED: trim the password before comparing
      console.log("Entered password:", password);
      console.log("Stored password:", student.password);

      let isMatch;
      if (student.password.startsWith('$2')) {
        // Hashed password
        isMatch = await bcrypt.compare(password.trim(), student.password);
      } else {
        // Plain text password (legacy), compare directly
        isMatch = password.trim() === student.password.trim();
        if (isMatch) {
          // Re-hash the password for security
          const salt = await bcrypt.genSalt(10);
          student.password = await bcrypt.hash(password.trim(), salt);
          await student.save();
          console.log("Password re-hashed for user:", student.email);
        }
      }
      console.log("Compare result:", isMatch);

      if (!isMatch) {
        console.log("Incorrect student password for:", trimmedEmail);
        return res.status(401).json({ message: "Incorrect student password" });
      }

      console.log("Student login successful for:", trimmedEmail);
      res.status(200).json({
        message: "Student login successful",
        user: {
          id: student._id,
          email: student.email,
          username: student.username,
          studentId: student.studentId,
          department: student.department,
          isAdmin: false,
          photo: student.photo || null,
        },
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: "Server error" });
    }
  });

  // --------------------
  // Admin Registration (temporary for creating admin users)
  // --------------------
  router.post("/register-admin", async (req, res) => {
    const { username, email, password, department } = req.body;

    try {
      const existingAdmin = await Admin.findOne({ email: email.trim().toLowerCase() });
      if (existingAdmin) return res.status(400).json({ message: "Email already exists" });

      const newAdmin = new Admin({
        username,
        email: email.trim().toLowerCase(),
        password: password.trim(),
        department,
      });

      await newAdmin.save();
      res.status(201).json({ message: "Admin account created successfully" });
    } catch (err) {
      console.error("Admin register error:", err);
      res.status(500).json({ message: "Server error" });
    }
  });

  // --------------------
  // Admin Login
  // --------------------
  router.post("/admin-login", async (req, res) => {
    console.log("Admin login request received with body:", req.body);
    const { email, password, department } = req.body;
    if (!email || !password || !department) {
      console.log("Missing email, password, or department in request");
      return res.status(400).json({ message: "Email, password, and department are required" });
    }
    const trimmedEmail = email.trim().toLowerCase();

    try {
      const admin = await Admin.findOne({ email: trimmedEmail, department });
      if (!admin) {
        console.log("Admin not found for email and department:", trimmedEmail, department);
        return res.status(401).json({ message: "Admin not found" });
      }

      const isMatch = await admin.matchPassword(password.trim());
      if (!isMatch) {
        console.log("Incorrect admin password for:", trimmedEmail);
        return res.status(401).json({ message: "Incorrect admin password" });
      }

      console.log("Admin login successful for:", trimmedEmail);
      res.status(200).json({
        message: "Admin login successful",
        user: {
          id: admin._id,
          email: admin.email,
          username: admin.username,
          department: admin.department,
          isAdmin: true,
          photo: admin.photo || null,
        },
      });
    } catch (err) {
      console.error("Admin login error:", err);
      res.status(500).json({ message: "Server error" });
    }
  });

  // --------------------
  // Upload profile photo
  // --------------------
  // Accept the file under either 'photo' or 'file' fields (frontend may vary)
  router.post("/upload-photo", authUpload.single("photo"), async (req, res) => {
    try {
      console.log("Upload photo request body:", req.body);
      console.log("Upload photo file (raw):", req.file);

      const userEmail = req.body.email;
      if (!userEmail) {
        console.warn("Upload photo error: Email is required");
        return res.status(400).json({ message: "Email is required" });
      }

      // Multer might put the file in req.file (single) or req.files (array). Also accept alternative field names.
      const file = req.file || (req.files && req.files.photo && req.files.photo[0]) || (req.files && req.files.file && req.files.file[0]);
      if (!file || !file.buffer) {
        console.warn("Upload photo error: Photo file is required or missing buffer", { hasFile: !!file });
        return res.status(400).json({ message: "Photo file is required" });
      }

      const normalizedEmail = userEmail.trim().toLowerCase();
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        // Check admin model
        const admin = await Admin.findOne({ email: normalizedEmail });
        if (!admin) {
          console.warn("Upload photo error: No user or admin found for email", normalizedEmail);
          return res.status(404).json({ message: "User not found" });
        }

        // Convert buffer to base64 and save
        const base64Image = file.buffer.toString("base64");
        admin.photo = base64Image;
        await admin.save();
        console.log("Profile photo updated successfully for admin:", admin.email);
        return res.status(200).json({ message: "Profile photo updated successfully for admin", photo: base64Image });
      }

      const base64Image = file.buffer.toString("base64");
      user.photo = base64Image;
      await user.save();
      console.log("Profile photo updated successfully for user:", user.email);
      return res.status(200).json({ message: "Profile photo updated successfully", photo: base64Image });
    } catch (err) {
      console.error("Upload photo error:", err && err.stack ? err.stack : err);
      return res.status(500).json({ message: "Server error", error: err && err.message });
    }
  });

  // --------------------
  // Update admin profile (username)
  // --------------------
  router.put("/update-profile", async (req, res) => {
    try {
      console.log("Update profile request body:", req.body);
      const { email, username } = req.body;
      if (!email || !username) {
        console.log("Update profile error: Email and username are required");
        return res.status(400).json({ message: "Email and username are required" });
      }
      const admin = await Admin.findOne({ email: email.trim().toLowerCase() });
      if (!admin) {
        console.log("Update profile error: Admin not found for email", email);
        return res.status(404).json({ message: "Admin not found" });
      }
      admin.username = username.trim();
      await admin.save();
      console.log("Profile updated successfully for admin:", admin.email);
      res.status(200).json({ message: "Profile updated successfully", user: { username: admin.username } });
    } catch (err) {
      console.error("Update profile error:", err);
      res.status(500).json({ message: "Server error" });
    }
  });

  return router;
}
