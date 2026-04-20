const FALLBACK_QUESTION = {
  question: 'Valid Parentheses',
  difficulty: 'Easy',
  category: 'DSA',
  description:
    'Given a string s containing just the characters (), {}, and [], determine if the input string is valid. An input string is valid if open brackets are closed by the same type of brackets and in the correct order.',
  constraints: [
    '1 <= s.length <= 10^4',
    's consists of parentheses only: (), {}, and []'
  ],
  examples: [
    {
      input: 's = "()[]{}"',
      output: 'true',
      explanation: 'Every opening bracket has a matching closing bracket in the correct order.'
    },
    {
      input: 's = "(]"',
      output: 'false',
      explanation: 'The closing bracket does not match the most recent opening bracket.'
    }
  ]
};

function extractJsonObject(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch (_) {
    return null;
  }
}

async function generateDsaQuestion() {
  const groqKey = process.env.GROQ_KEY;
  if (!groqKey) return FALLBACK_QUESTION;

  const systemPrompt = `You generate one interview-quality DSA question for a coding platform.
Return only valid JSON with this exact shape:
{
  "question": string,
  "difficulty": "Easy" | "Medium" | "Hard",
  "category": "DSA",
  "description": string,
  "constraints": string[],
  "examples": [
    {
      "input": string,
      "output": string,
      "explanation": string
    }
  ]
}

Rules:
- Generate a fresh, realistic DSA question.
- Include a clear problem description.
- Include 2 to 4 constraints.
- Include at least 2 sample input/output examples.
- Do not wrap the response in markdown or code fences.`;

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
        { role: 'user', content: 'Generate a brand new DSA question now.' }
      ],
      max_tokens: 700,
      temperature: 0.4
    })
  });

  const data = await askRes.json();
  const content = data?.choices?.[0]?.message?.content || '';
  const parsed = extractJsonObject(content);

  if (!parsed) return FALLBACK_QUESTION;

  return {
    question: parsed.question || FALLBACK_QUESTION.question,
    difficulty: parsed.difficulty || FALLBACK_QUESTION.difficulty,
    category: parsed.category || FALLBACK_QUESTION.category,
    description: parsed.description || FALLBACK_QUESTION.description,
    constraints: Array.isArray(parsed.constraints) ? parsed.constraints : FALLBACK_QUESTION.constraints,
    examples: Array.isArray(parsed.examples) && parsed.examples.length > 0 ? parsed.examples : FALLBACK_QUESTION.examples
  };
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const question = await generateDsaQuestion();
    return res.status(200).json(question);
  } catch (error) {
    console.error('Error fetching coding question:', error);
    return res.status(200).json(FALLBACK_QUESTION);
  }
}
