export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { transcript, type, difficulty } = req.body;

  if (!transcript || !Array.isArray(transcript)) {
    return res.status(400).json({ error: 'Invalid transcript' });
  }

  // Check how much the candidate actually spoke
  const candidateWords = transcript
    .filter(m => m.role === 'user' || m.role === 'candidate')
    .map(m => m.content)
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0).length;

  // If the candidate said essentially nothing, fail them immediately
  if (candidateWords < 5) {
    return res.status(200).json({
      readinessScore: 0,
      vocabularyScore: 0,
      communicationScore: 0,
      technicalScore: 0,
      confidenceScore: 0,
      logicScore: 0,
      feedback: "The interview ended prematurely or the candidate did not provide substantial responses.",
      rating: "Needs Work"
    });
  }

  let conversationText = transcript.map(m => `${m.role === 'assistant' || m.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${m.content}`).join('\n');

  const systemPrompt = `You are an expert strict technical interviewer evaluating a candidate's interview.
The interview type was "${type}" at "${difficulty}" difficulty.
Here is the transcript of the interview:
${conversationText}

Please evaluate the candidate strictly and return ONLY a JSON object with the following schema:
{
  "readinessScore": <int 0-100>,
  "vocabularyScore": <int 0-10>,
  "communicationScore": <int 0-100>,
  "technicalScore": <int 0-100>,
  "confidenceScore": <int 0-100>,
  "logicScore": <int 0-100>,
  "feedback": "<string: honest, strict paragraph of feedback>",
  "rating": "<string: Excellent, Good, Fair, Poor, or Needs Work>"
}

CRITICAL RULES:
1. If the candidate struggled, gave wrong answers, or spoke very little, score them VERY harshly (e.g., scores under 30, vocab 1-3).
2. Do not inflate scores. Be a realistic, top-tier tech company interviewer.
3. Return ONLY valid JSON. Do not include markdown blocks like \`\`\`json.`;

  const groqKey = process.env.GROQ_KEY;
  if (!groqKey) {
    return res.status(200).json(generateFallbackScores(candidateWords));
  }

  try {
    const askRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Evaluate the interview transcript and return the JSON object.' }
        ],
        max_tokens: 300,
        temperature: 0.1
      })
    });
    
    const data = await askRes.json();
    
    if (data.error) {
      console.error("Groq evaluation error:", data.error);
      return res.status(200).json(generateFallbackScores(candidateWords));
    }

    let parsedData = null;
    try {
      const reply = data.choices[0].message.content.trim();
      const jsonMatch = reply.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
         parsedData = JSON.parse(jsonMatch[0]);
      }
    } catch(e) {
      console.error("Failed to parse evaluation JSON:", data.choices?.[0]?.message?.content);
    }
    
    if (parsedData && parsedData.readinessScore !== undefined) {
       return res.status(200).json(parsedData);
    }

    return res.status(200).json(generateFallbackScores(candidateWords));

  } catch (e) {
    console.error("Evaluation API fetch error:", e);
    return res.status(200).json(generateFallbackScores(candidateWords));
  }
}

function generateFallbackScores(wordCount) {
  // If the Groq API fails, we use a harsh fallback based on word count
  const base = Math.min(50, Math.max(10, wordCount));

  return {
    readinessScore: base,
    vocabularyScore: Math.floor(base / 10),
    communicationScore: base + 5,
    technicalScore: Math.max(0, base - 10),
    confidenceScore: base,
    logicScore: base,
    feedback: "The evaluation API encountered an error. This is a fallback score based on transcript length.",
    rating: base > 40 ? "Fair" : "Needs Work"
  };
}