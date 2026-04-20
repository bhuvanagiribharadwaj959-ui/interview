import fs from 'fs';
import path from 'path';

async function findRunningModelServer() {
  // 1. Check ENV for external Colab URL
  const envUrl = process.env.INTERVIEW_MODEL_URL;
  if (envUrl) {
    try {
      const checkUrl = envUrl.replace('/v1/ask', '') + '/health';
      const resp = await fetch(checkUrl, { 
        method: 'GET', 
        headers: { 'ngrok-skip-browser-warning': '1' },
      }).catch(() => null);
      if (resp && resp.ok) {
        return envUrl.endsWith('/v1/ask') ? envUrl : `${envUrl}/v1/ask`;
      }
    } catch (e) {}
  }

  // 2. Check Local File
  try {
    const portFile = path.join(process.cwd(), 'interview_model_port.txt');
    if (fs.existsSync(portFile)) {
      const port = fs.readFileSync(portFile, 'utf8').trim();
      if (port) {
        return `http://127.0.0.1:${port}/v1/ask`;
      }
    }
  } catch (e) {}
  
  for (let port = 8090; port <= 8100; port++) {
    try {
      const url = `http://127.0.0.1:${port}/health`;
      const resp = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(500) }).catch(() => null);
      if (resp && resp.ok) return `http://127.0.0.1:${port}/v1/ask`;
    } catch (e) {}
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { transcript, type, difficulty } = req.body;

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

Do not include markdown blocks, do not include any other text except the JSON.`;

  const url = await findRunningModelServer();
  
  if (!url) {
    console.warn("[Evaluate] Model server not found. Returning fallback scores.");
    return res.status(200).json(generateFallbackScores(transcript));
  }

  try {
    const askRes = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '1'
      },
      body: JSON.stringify({
        question: "Evaluate the interview transcript and return the JSON object.",
        system_prompt: systemPrompt,
        max_new_tokens: 300,
        temperature: 0.2 // low temp for stricter, more consistent json
      })
    });
    
    const data = await askRes.json();
    
    let parsedData = null;
    try {
      // Find JSON bounds in case the model wraps it with text or codeblocks
      const reply = data.reply;
      const jsonMatch = reply.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
         parsedData = JSON.parse(jsonMatch[0]);
      }
    } catch(e) {
      console.error("Failed to parse evaluation JSON:", data.reply);
    }
    
    if (parsedData && parsedData.readinessScore) {
       return res.status(200).json(parsedData);
    }

    return res.status(200).json(generateFallbackScores(transcript));

  } catch (e) {
    console.error("Evaluation API fetch error:", e);
    return res.status(200).json(generateFallbackScores(transcript));
  }
}

function generateFallbackScores(transcript) {
  // Deterministic fallback based on transcript to avoid randomized graphs
  const textBody = transcript.map(t => t.content).join(' ');
  const wordCount = textBody.split(/\s+/).length || 10;
  const base = Math.min(100, Math.max(40, wordCount));

  return {
    readinessScore: Math.min(100, base + (textBody.length % 10)),
    vocabularyScore: Math.min(10, Math.floor(base / 10) + (textBody.length % 3)),
    communicationScore: Math.min(100, base + 5),
    technicalScore: Math.min(100, base - 5),
    confidenceScore: Math.min(100, base + (wordCount % 15)),
    logicScore: Math.min(100, base + (textBody.length % 5)),
    feedback: "The interview was evaluated locally. Try providing more detailed answers.",
    rating: base > 70 ? "Good" : "Fair"
  };
}