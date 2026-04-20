import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Bad request' });
  }

  // Groq rejects extra message properties (e.g., createdAt), so only pass supported fields.
  const sanitizedMessages = messages
    .filter((m) => m && typeof m === 'object')
    .map((m) => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : String(m.content ?? '')
    }))
    .filter((m) => ['system', 'user', 'assistant'].includes(m.role) && m.content.trim().length > 0);

  if (sanitizedMessages.length === 0) {
    return res.status(400).json({ error: 'No valid messages found' });
  }

  const systemMessage = sanitizedMessages.find((m) => m.role === 'system');
  const userMessages = sanitizedMessages.filter((m) => m.role !== 'system');
  
  // Log the User's speech to the terminal
  const lastUserMsg = userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
  if (lastUserMsg && lastUserMsg.role === 'user') {
    console.log(`\n\x1b[36m[Candidate Spoke]:\x1b[0m ${lastUserMsg.content}`);
  }

  const groqKey = process.env.GROQ_KEY;
  if (!groqKey) {
    return res.status(503).json({ error: 'GROQ_KEY is missing from .env' });
  }

  try {
    const askRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          ...(systemMessage ? [systemMessage] : []),
          ...userMessages
        ],
        max_tokens: 500,
        temperature: 0.5
      })
    });
    
    const data = await askRes.json();

    if (data.error) {
      console.error("Groq error:", data.error);
      return res.status(500).json({ error: data.error.message || 'Groq API error' });
    }

    let finalReply = data.choices[0].message.content.trim();
    
    return res.status(200).json({ reply: finalReply });
  } catch (e) {
    console.error("Chat API fetch error:", e);
    return res.status(500).json({ error: 'Failed to contact model server' });
  }
}
