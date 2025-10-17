const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files from React/Vue/HTML frontend if you have one
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.get('/api/data', (req, res) => {
    res.json({ message: 'Hello from Render server!' });
});
// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Function to send text message to Telegram
async function sendTextToTelegram(text) {
    try {
        const response = await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                chat_id: TELEGRAM_CHAT_ID,
                text: text,
                parse_mode: 'HTML'
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error sending text to Telegram:', error.message);
        throw error;
    }
}

// Function to send photo to Telegram
async function sendPhotoToTelegram(photoPath, caption = '') {
    try {
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_CHAT_ID);
        formData.append('photo', fs.createReadStream(photoPath));
        if (caption) {
            formData.append('caption', caption);
        }

        const response = await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
            formData,
            {
                headers: {
                    ...formData.getHeaders()
                }
            }
        );
        
        // Clean up the uploaded file
        fs.unlinkSync(photoPath);
        
        return response.data;
    } catch (error) {
        console.error('Error sending photo to Telegram:', error.message);
        // Clean up file even if there's an error
        if (fs.existsSync(photoPath)) {
            fs.unlinkSync(photoPath);
        }
        throw error;
    }
}

// Main form submission endpoint
app.post('/api/data', upload.single('selfie'), async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;
        const selfieFile = req.file;

        if (!selfieFile) {
            return res.status(400).json({ error: 'Selfie picture is required' });
        }

        // Format text data for Telegram
        const formattedText = `
📋 <b>New Form Submission</b>

👤 <b>Name:</b> ${name}
📧 <b>Email:</b> ${email}
📞 <b>Phone:</b> ${phone}
💬 <b>Message:</b> ${message}

🕒 <b>Submitted at:</b> ${new Date().toLocaleString()}
        `.trim();

        // Send text data to Telegram
        await sendTextToTelegram(formattedText);

        // Send selfie to Telegram with a caption
        const caption = `📸 Selfie from: ${name}`;
        await sendPhotoToTelegram(selfieFile.path, caption);

        res.json({ 
            success: true, 
            message: 'Form submitted and data sent to Telegram successfully' 
        });

    } catch (error) {
        console.error('Error processing form submission:', error);
        res.status(500).json({ 
            error: 'Failed to process form submission',
            details: error.message 
        });
    }
});

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ message: 'Form submission server is running' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
