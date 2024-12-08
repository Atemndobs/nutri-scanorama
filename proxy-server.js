import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const TARGET_URL = 'https://mac.goose-neon.ts.net' 
// const TARGET_URL = 'http://localhost:1234';


// Add body parsing middleware
app.use(express.json());

// Enable CORS for all routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept']
}));

// Handle chat completions endpoint
app.post('/api/v1/chat/completions', async (req, res) => {
  try {
    console.log('Received request:', {
      method: req.method,
      headers: req.headers,
      body: req.body
    });

    const response = await fetch(`${TARGET_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`API Error: ${response.status} - ${errorText || response.statusText}`);
    }

    const data = await response.json();
    console.log('Response from API:', data);

    res.json(data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Proxy Error',
      message: error.message
    });
  }
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
