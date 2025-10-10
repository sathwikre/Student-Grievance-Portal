import express from "express";
import Complaint from "../models/Complaint.js";
import Admin from "../models/Admin.js";
import { sendMail } from "../utils/mailer.js";
import multer from "multer";

const router = express.Router();

// Multer setup for file uploads
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
    // Accept images, PDFs, and common document types
    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'), false);
    }
};
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// PUT update complaint status
router.put("/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!['Pending', 'Resolved', 'Rejected', 'InProgress'].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
    }
    try {
        const complaint = await Complaint.findById(id);
        if (!complaint) {
            return res.status(404).json({ message: "Complaint not found" });
        }
        complaint.status = status;
        await complaint.save();

        // Send email to the complainant
        await sendMail(
            complaint.email,
            "Complaint Status Update",
            `Your complaint status has been updated to: ${status}\n\nComplaint Details:\n${complaint.complaintText}`
        );

        res.status(200).json({ message: `Complaint status updated to ${status}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// PUT update complaint by student
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { studentId, ...updateData } = req.body;
    try {
        const complaint = await Complaint.findById(id);
        if (!complaint) {
            return res.status(404).json({ message: "Complaint not found" });
        }
        if (complaint.studentId !== studentId) {
            return res.status(403).json({ message: "Unauthorized" });
        }
        Object.assign(complaint, updateData);
        await complaint.save();
        res.status(200).json({ message: "Complaint updated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// DELETE complaint by student
router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    const { studentId } = req.body;
    try {
        const complaint = await Complaint.findById(id);
        if (!complaint) {
            return res.status(404).json({ message: "Complaint not found" });
        }
        if (complaint.studentId !== studentId) {
            return res.status(403).json({ message: "Unauthorized" });
        }
        await Complaint.findByIdAndDelete(id);
        res.status(200).json({ message: "Complaint deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// POST new complaint
router.post("/", upload.array('files'), async (req, res) => {
    const { studentId, name, email, type, department, date, complaintText } = req.body;

    try {
        const attachments = req.files ? req.files.map(file => ({
            filename: file.originalname,
            contentType: file.mimetype,
            data: file.buffer
        })) : [];

        const newComplaint = new Complaint({
            studentId,
            name,
            email,
            type,
            department,
            date,
            complaintText,
            attachments
        });

        await newComplaint.save();

        // Send confirmation email to the student
        console.log(`Sending confirmation email to ${newComplaint.email}`);
        try {
            await sendMail(
                newComplaint.email,
                "Complaint Submitted Successfully",
                `Dear ${newComplaint.name},\n\nYour complaint has been submitted successfully.\n\nComplaint Details:\n- Type: ${newComplaint.type}\n- Department: ${newComplaint.department}\n- Date: ${newComplaint.date}\n- Description: ${newComplaint.complaintText}\n\nWe will review your complaint and get back to you soon.\n\nThank you.`
            );
            console.log(`Confirmation email sent successfully to ${newComplaint.email}`);
        } catch (error) {
            console.error(`Failed to send confirmation email to ${newComplaint.email}:`, error);
        }

        // Send email to admins of the relevant department
        const admins = await Admin.find({ department: newComplaint.type.toLowerCase() });
        for (const admin of admins) {
            await sendMail(
                admin.email,
                "New Complaint Submitted",
                `A new complaint has been submitted in your department (${newComplaint.type}):\n\n${newComplaint.complaintText}\n\nSubmitted by: ${newComplaint.name} (${newComplaint.email})`
            );
        }

        res.status(201).json({ message: "Complaint submitted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// GET all complaints (optional: for admin dashboard)
// GET complaints for a specific student
router.get('/student/:studentId', async (req, res) => {
    try {
        const complaints = await Complaint.find({ studentId: req.params.studentId });
        res.status(200).json(complaints);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});
router.get("/", async (req, res) => {
    try {
        const { department } = req.query;
        let complaints;
        if (department) {
            complaints = await Complaint.find({ department });
        } else {
            complaints = await Complaint.find();
        }
        res.status(200).json(complaints);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// GET search complaints by type
router.get("/search", async (req, res) => {
    const { type } = req.query;
    try {
        let complaints;
        if (type) {
            complaints = await Complaint.find({ type: new RegExp(type, 'i') });
        } else {
            complaints = await Complaint.find();
        }
        res.status(200).json(complaints);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
