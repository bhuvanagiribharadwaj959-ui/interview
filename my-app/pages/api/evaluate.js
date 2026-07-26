export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { transcript, type, difficulty } = req.body || {};

  if (!transcript || !Array.isArray(transcript)) {
    return res.status(400).json({ error: 'Invalid transcript array' });
  }

  // Filter valid transcript entries and truncate overly large content strings
  const sanitizedTranscript = transcript
    .filter(m => m && typeof m === 'object' && typeof m.content === 'string')
    .map(m => ({
      role: String(m.role || 'candidate').slice(0, 20),
      content: String(m.content).slice(0, 5000)
    }));

  // Check how much the candidate actually spoke
  const candidateWords = sanitizedTranscript
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

  let conversationText = sanitizedTranscript.map(m => `${m.role === 'assistant' || m.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${m.content}`).join('\n');

  const systemPrompt = `You are an expert strict technical interviewer evaluating a candidate's interview.
The interview type was "${type}" at "${difficulty}" difficulty.
Here is the transcript of the interview:
${conversationText}

Please evaluate the candidate strictly and return ONLY a JSON object with the following schema:
  "technical_depth": <0-10>,
  "communication": <0-10>,
  "dsa_performance": <0-10>,
  "problem_solving": <0-10>,
  "confidence": <0-10>,
  "vocabulary_correct": <count of technical terms used correctly>,
  "vocabulary_incorrect": <count of technical terms used wrongly>,
  "dsa_outcome": <"accepted" | "wrong_answer" | "gave_up">,
  "dsa_solve_time_minutes": <number>,
  "weak_areas": ["<list of topic strings where score < 5>"],
  "insight": "<one sentence about the biggest area to improve>",
  "expected_answer": "<the ideal, model answer the candidate SHOULD have given to the LAST technical question asked>"
}

Scoring guide:
- technical_depth: accuracy of "under the hood" answers (Phase 2)
- communication: clarity, structure, use of examples
- dsa_performance: 10=accepted+complexity explained, 7=accepted, 4=wrong answer with good approach, 1=gave up
- problem_solving: quality of system design / stress test answer (Phase 4)
- confidence: response speed, no filler words, directness
- expected_answer: give a clear, correct 3-4 sentence answer to the final technical question posed by the interviewer, so the candidate can learn from their mistake.

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
    
    if (parsedData && parsedData.technical_depth !== undefined) {
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
  const base10 = Math.min(10, Math.max(1, Math.floor(wordCount / 20)));

  return {
    technical_depth: base10,
    communication: Math.min(10, base10 + 2),
    dsa_performance: base10,
    problem_solving: base10,
    confidence: base10,
    vocabulary_correct: Math.floor(wordCount / 50),
    vocabulary_incorrect: 2,
    dsa_outcome: "wrong_answer",
    dsa_solve_time_minutes: 15,
    weak_areas: ["Algorithms"],
    insight: "The evaluation API encountered an error. This is a fallback score based on transcript length."
  };
}