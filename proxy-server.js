import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const GLHF_URL = process.env.VITE_GLHF_CHAT_BASE_URL;

if (!GLHF_URL) {
  console.error('Error: VITE_GLHF_CHAT_BASE_URL is not set in environment variables');
  process.exit(1);
}

// Add body parsing middleware
app.use(express.json());

// Enable CORS for all routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle GLHF chat completions endpoint
app.post('/glhf/chat/', async (req, res) => {
  try {
    console.log('[GLHF] Received request:', {
      method: req.method,
      headers: {
        ...req.headers,
        authorization: req.headers.authorization ? '(present)' : '(missing)'
      },
      body: req.body
    });

    // Get the API key from the Authorization header
    const authHeader = req.headers.authorization;
    console.log('[GLHF] Auth header:', authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[GLHF] Missing or invalid Authorization header');
      res.status(401).json({
        error: 'Authorization Error',
        message: 'Missing or invalid Authorization header'
      });
      return;
    }

    const requestBody = {
      model: req.body.model,
      messages: req.body.messages,
      temperature: req.body.temperature || 0.1
    };

    // Log the curl command
    console.log('\n[GLHF] Equivalent curl command:');
    console.log(`curl --location '${GLHF_URL}/chat/completions' \\
--header 'Content-Type: application/json' \\
--header 'Authorization: ${authHeader}' \\
--data '${JSON.stringify(requestBody, null, 2)}'`);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 30000); // 30 second timeout

    try {
      console.log('[GLHF] Sending request to:', `${GLHF_URL}/chat/completions`);
      console.log('[GLHF] Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${GLHF_URL}/chat/completions0000000000`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[GLHF] API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          error: errorText,
          requestBody: JSON.stringify(requestBody, null, 2)
        });
        
        res.status(response.status).json({
          error: 'GLHF API Error',
          message: errorText || response.statusText,
          details: {
            status: response.status,
            statusText: response.statusText
          }
        });
        return;
      }

      const data = await response.json();
      console.log('[GLHF] Response:', JSON.stringify(data, null, 2));
      res.json(data);
    } catch (error) {
      console.error('[GLHF] Request Error:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        requestBody: JSON.stringify(requestBody, null, 2)
      });
      res.status(500).json({
        error: 'Proxy Error',
        message: error.message,
        details: {
          name: error.name,
          requestBody: requestBody
        }
      });
    }
  } catch (error) {
    console.error('[GLHF] Error:', error);
    res.status(500).json({
      error: 'Proxy Error',
      message: error.message
    });
  }
});

const port = process.env.PORT || 3002;
app.listen(port, () => {
  console.log(`Proxy server running on port ${port}`);
  console.log('GLHF endpoint:', `${GLHF_URL}/chat/completions`);
});
