const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const axios = require('axios');

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

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// API endpoint to send email
app.post('/api/data', (req, res) => {
  try {
    // Extract the message from FormData
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'No message provided' });
    }

    // Send the message to Telegram
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown', // Enable Markdown formatting for bold text, etc.
    });

    res.json({ message: 'Message sent to Telegram successfully' });
  } catch (error) {
    console.error('Error sending to Telegram:', error.message);
    res.status(500).json({ message: 'Failed to send message to Telegram' });
  }
});


  
// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
