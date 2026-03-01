import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Helper to get Project ID
async function getProjectId(apiKey: string): Promise<string> {
  if (process.env.DEEPGRAM_PROJECT_ID) {
    return process.env.DEEPGRAM_PROJECT_ID;
  }

  const response = await fetch('https://api.deepgram.com/v1/projects', {
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Deepgram projects');
  }

  const data = await response.json();
  if (data.projects && data.projects.length > 0) {
    return data.projects[0].project_id;
  }

  throw new Error('No Deepgram projects found');
}

// API Route: Generate Temporary Key
app.get('/api/deepgram-token', async (req, res) => {
  try {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Deepgram API Key is missing on server' });
    }

    const projectId = await getProjectId(apiKey);

    // Create a temporary key that expires in 15 minutes
    // Note: Deepgram expects expiration_date in ISO format
    const expirationDate = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const response = await fetch(`https://api.deepgram.com/v1/projects/${projectId}/keys`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        comment: 'Temporary key for direct upload',
        scopes: ['usage:write'], // Basic scope, usually sufficient for transcription if member role is implied or added
        expiration_date: expirationDate,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create temporary key: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    res.json({ key: data.key });

  } catch (error: any) {
    console.error('Token generation error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Vite Middleware (for development)
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
