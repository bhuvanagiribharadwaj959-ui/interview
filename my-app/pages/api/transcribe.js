export const config = {
  api: {
    bodyParser: false,
  },
};

async function getBuffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const groqKey = process.env.GROQ_KEY;
  if (!groqKey) {
    return res.status(500).json({ error: 'Groq API key not configured' });
  }

  try {
    const buffer = await getBuffer(req);
    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ error: 'No audio data received' });
    }

    const formData = new FormData();
    // Wrap the buffer in a Blob and append it as 'file'
    const audioBlob = new Blob([buffer], { type: 'audio/webm' });
    formData.append('file', audioBlob, 'answer.webm');
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('language', 'en');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq Whisper API error:', errorText);
      return res.status(response.status).json({ error: 'Failed to transcribe audio', details: errorText });
    }

    const data = await response.json();
    return res.status(200).json({ transcript: data.text || '' });
  } catch (error) {
    console.error('Transcription handler error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
