export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, language } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
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
          {
            role: "system",
            content: "You are a senior technical interviewer. Review the provided code snippet and ask exactly ONE insightful, concise follow-up question regarding its time/space complexity, edge cases, or potential optimizations. Do not provide the answer, just ask the question. Keep it under 2 sentences."
          },
          {
            role: "user",
            content: `Language: ${language}\n\nCode:\n${code}`
          }
        ],
        max_tokens: 100,
        temperature: 0.5
      })
    });
    
    const data = await askRes.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message || 'Groq API error' });
    }

    let question = data.choices[0].message.content.trim();
    return res.status(200).json({ question });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to contact model server' });
  }
}
