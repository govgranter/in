const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


// Routes to serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sender.html'));
});

// Store messages in memory (in production, use a database)

const MESSAGES_FILE = path.join(__dirname, 'messages.json');

// Load messages from file on startup
let messages = [];
let clients = [];

async function loadMessages() {
    try {
        const data = await fs.readFile(MESSAGES_FILE, 'utf8');
        messages = JSON.parse(data);
        console.log(`Loaded ${messages.length} messages from file`);
    } catch (error) {
        console.log('No existing messages file, starting fresh');
        messages = [];
    }
}

async function saveMessages() {
    try {
        await fs.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2));
        console.log('Saved');
    } catch (error) {
        console.log('Error saving messages:', error);
    }
}

app.post('/api/messages', async (req, res) => {
    const { text } = req.body;
    
    const newMessage = {
        id: Date.now().toString(),
        text: text.trim(),
        timestamp: new Date().toISOString()
    };

    // Save to memory
    messages.push(newMessage);
    
    // Also save to file
    await saveMessages();
    
    // Notify waiting clients
    clients.forEach(client => {
        client.res.json([newMessage]);
    });
    clients = [];
    
    res.json({ success: true, message: newMessage });
});

// Load messages when server starts
loadMessages();


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
