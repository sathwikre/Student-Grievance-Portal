import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// For testing, use Gmail SMTP
let transporter;
async function setupTransporter() {
    try {
        if (process.env.NODE_ENV === 'production') {
            // Use real SMTP in production
            transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                secure: process.env.SMTP_SECURE === "true",
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
        } else {
            // Use Gmail for development/testing
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'suramsathwikreddy292@gmail.com',
                    pass: 'hrqd lgyw fnuu rlza'
                },
            });
            console.log('Gmail transporter set up for development');
        }
    } catch (error) {
        console.error('Error setting up email transporter:', error);
    }
}

await setupTransporter();

const sendMail = async (to, subject, text) => {
    const mailOptions = {
        from: 'suramsathwikreddy292@gmail.com',
        to,
        subject,
        text,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${to} with subject: ${subject}`);
        console.log('Message ID:', info.messageId);
    } catch (error) {
        console.error("Error sending email:", error);
    }
};

export { sendMail };
