// EdgeTTS server running in TTS.ipynb (Cell 5) - Port 8081
// Set DIA_TTS_API_URL and DIA_TTS_API_KEY in .env.local
const fs = require('fs');
const path = require('path');
const DIA_TTS_KEY = process.env.DIA_TTS_API_KEY;

// Helper to check if a port is open and return the base URL
async function findRunningTTSServer() {
  // 1. Priority: Check tts_port.txt (Shared file)
  try {
    const portFile = path.join(process.cwd(), 'tts_port.txt');
    if (fs.existsSync(portFile)) {
      const port = fs.readFileSync(portFile, 'utf8').trim();
      if (port) {
        const url = `http://127.0.0.1:${port}/health`;
        try {
          // Explicitly use 127.0.0.1 to match Python binding
          const resp = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(500) }).catch(() => null);
          if (resp && resp.ok) return `http://127.0.0.1:${port}/v1/tts`;
        } catch (e) {
          console.warn(`[TTS] Port file says ${port} but not reachable:`, e.message);
        }
      }
    }
  } catch (e) { console.error('[TTS] Error reading port file:', e.message); }

  // 2. Check .env
  const envUrl = process.env.DIA_TTS_API_URL;
  if (envUrl) {
    console.log(`[TTS] Checking configured URL: ${envUrl}`);
    try {
      const resp = await fetch(envUrl.replace('/v1/tts', '/health'), { 
        method: 'GET', 
        headers: { 'ngrok-skip-browser-warning': '1' },
        signal: AbortSignal.timeout(3000) // Increased timeout for external URLs
      }).catch((e) => {
        console.warn(`[TTS] Configured URL check failed: ${e.message}`);
        return null; 
      });
      
      if (resp && resp.ok) return envUrl;
    } catch (e) {
      console.error(`[TTS] Error checking configured URL: ${e}`);
    }
  }

  // 3. Fallback: Scan ports 8080-8090 on 127.0.0.1
  for (let port = 8080; port <= 8090; port++) {
    try {
      const url = `http://127.0.0.1:${port}/health`;
      // Increased timeout to 500ms per port
      const resp = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(500) }).catch(() => null);
      if (resp && resp.ok) {
        console.log(`[TTS] Auto-discovered server at port ${port}`);
        return `http://127.0.0.1:${port}/v1/tts`;
      }
    } catch (e) {}
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body || {};

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Missing or empty text in request body' });
  }

  // Find the server dynamically if needed
  const DIA_TTS_URL = await findRunningTTSServer();
  
  if (!DIA_TTS_URL) {
    console.error('TTS Server not found on ports 8080-8090');
    return res.status(503).json({ error: 'TTS Server not running. Please run Cell 5 in TTS.ipynb.' });
  }

  console.log(`TTS → EdgeTTS (${DIA_TTS_URL}):`, text.slice(0, 50));

  try {
    const headers = {
      Accept: 'audio/wav',
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': '1'
    };
    if (DIA_TTS_KEY) {
      headers.Authorization = `Bearer ${DIA_TTS_KEY}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // Allow longer synthesis for post-submit responses

    const response = await fetch(DIA_TTS_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Dia TTS returned ${response.status}: ${errorText}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    if (audioBuffer.length === 0) {
      return res.status(500).json({ error: 'Generated empty audio' });
    }

    res.setHeader('Content-Type', response.headers.get('content-type') || 'audio/wav');
    res.setHeader('Content-Length', audioBuffer.length);
    res.status(200).end(audioBuffer);

  } catch (error) {
    console.error('TTS API error:', error.message);
    res.status(500).json({ error: 'TTS failed', message: error.message });
  }
}
