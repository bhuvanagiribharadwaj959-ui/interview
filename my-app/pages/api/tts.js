import { EdgeTTS } from 'node-edge-tts';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body || {};

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Missing or empty text in request body' });
  }

  try {
    // We use a high quality, deployment-friendly English voice
    const tts = new EdgeTTS({ voice: 'en-US-ChristopherNeural' });
    
    // Create a temporary file path for the mp3 output
    const tmpFilePath = path.join('/tmp', `tts_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`);
    
    await tts.ttsPromise(text, tmpFilePath);

    const audioBuffer = fs.readFileSync(tmpFilePath);
    
    // Clean up the temp file
    fs.unlinkSync(tmpFilePath);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.status(200).end(audioBuffer);

  } catch (error) {
    console.error('TTS API error:', error.message);
    res.status(500).json({ error: 'TTS failed', message: error.message });
  }
}
