import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema({
    studentId: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    type: { type: String, required: true },
    department: { type: String, required: true },
    date: { type: Date, required: true },
    complaintText: { type: String, required: true },
    status: { type: String, default: "Pending" }, // Pending, In Progress, Resolved
    attachments: [{
        filename: { type: String, required: true },
        contentType: { type: String, required: true },
        path: { type: String, required: true }
    }]
}, { timestamps: true });

const Complaint = mongoose.model("Complaint", complaintSchema);

export default Complaint;
