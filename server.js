const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store messages in memory (in production, use a database)
let messages = [];
let clients = []; // For long-polling

// Routes to serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sender.html'));
});

app.get('/sender', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sender.html'));
});

app.get('/receiver', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'receiver.html'));
});

// POST endpoint to send messages
app.post('/api/messages', (req, res) => {
    const { text } = req.body;
    
    if (!text || text.trim() === '') {
        return res.status(400).json({ error: 'Message text is required' });
    }

    const newMessage = {
        id: Date.now().toString(),
        text: text.trim(),
        timestamp: new Date().toISOString()
    };

    // Store the message
    messages.push(newMessage);
    
    // Notify all waiting clients (for long-polling)
    clients.forEach(client => {
        client.res.json([newMessage]);
    });
    clients = [];

    console.log('Message received:', newMessage);
    res.json({ success: true, message: newMessage });
});

// GET endpoint to retrieve messages (with long-polling)
app.get('/api/messages', (req, res) => {
    const lastMessageId = req.query.lastMessageId || '0';
    
    // Check if there are new messages
    const newMessages = messages.filter(msg => msg.id > lastMessageId);
    
    if (newMessages.length > 0) {
        // Return immediately if there are new messages
        res.json(newMessages);
    } else {
        // Store the client request for long-polling
        const client = {
            id: Date.now(),
            res: res,
            lastMessageId: lastMessageId
        };
        clients.push(client);
        
        // Set timeout for long-polling (30 seconds max)
        setTimeout(() => {
            const index = clients.findIndex(c => c.id === client.id);
            if (index !== -1) {
                clients.splice(index, 1);
                res.json([]);
            }
        }, 30000);
    }
});

// Alternative: Simple polling endpoint
app.get('/api/messages/poll', (req, res) => {
    const lastMessageId = req.query.lastMessageId || '0';
    const newMessages = messages.filter(msg => msg.id > lastMessageId);
    res.json(newMessages);
});

// Get all messages (for initial load)
app.get('/api/messages/all', (req, res) => {
    res.json(messages);
});

// Clear all messages (optional endpoint)
app.delete('/api/messages', (req, res) => {
    messages = [];
    clients = [];
    res.json({ success: true, message: 'All messages cleared' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Sender: http://localhost:${PORT}/sender`);
    console.log(`Receiver: http://localhost:${PORT}/receiver`);
});
