import { db } from '@/lib/firebaseClient';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { verifyAuthToken } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const decoded = verifyAuthToken(token);
  if (!decoded || !decoded.id) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  const userId = decoded.id;
  const {
    interviewId,
    type,
    difficulty,
    duration,
    readinessScore,
    vocabularyScore,
    communicationScore,
    technicalScore,
    confidenceScore,
    logicScore,
    rating,
    feedback,
    transcript, // Array of { role, content }
    codingEvents,
    startedAt,
    endedAt,
    resumeId,
    technical_depth,
    communication,
    dsa_performance,
    problem_solving,
    confidence,
    vocabulary_correct,
    vocabulary_incorrect,
    dsa_outcome,
    dsa_solve_time_minutes,
    weak_areas,
    insight,
    expected_answer
  } = req.body;

  // We no longer strictly require readinessScore if new fields exist
  if (technical_depth === undefined && readinessScore === undefined) {
    return res.status(400).json({ error: 'Missing interview data' });
  }

  try {
    const finalSessionId = interviewId;
    if (!finalSessionId) {
      return res.status(400).json({ error: 'Missing session ID' });
    }

    const sessionRef = doc(db, 'users', userId, 'sessions', finalSessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // 1. Update the session document
    const updatedData = {
      status: 'completed',
      score: readinessScore,
      feedback: feedback || '',
      endedAt: new Date(),
      
      // Legacy fields
      endTime: new Date().toISOString(),
      duration: duration || '0 min',
      readinessScore,
      vocabularyScore,
      communicationScore,
      technicalScore,
      confidenceScore,
      logicScore,
      rating: rating || (readinessScore > 80 ? 'Excellent' : readinessScore > 60 ? 'Good' : 'Needs Work'),
      transcript,
      codingEvents: Array.isArray(codingEvents) ? codingEvents : [],
      endedAtLegacy: endedAt ? new Date(endedAt).toISOString() : new Date().toISOString(),
      
      // New schema fields
      technical_depth: technical_depth || 0,
      communication_new: communication || 0,
      dsa_performance: dsa_performance || 0,
      problem_solving: problem_solving || 0,
      confidence_new: confidence || 0,
      vocabulary_correct: vocabulary_correct || 0,
      vocabulary_incorrect: vocabulary_incorrect || 0,
      dsa_outcome: dsa_outcome || 'none',
      dsa_solve_time_minutes: dsa_solve_time_minutes || 0,
      weak_areas: Array.isArray(weak_areas) ? weak_areas : [],
      insight: insight || '',
      expected_answer: expected_answer || ''
    };

    if (resumeId) updatedData.resumeId = resumeId;

    await updateDoc(sessionRef, updatedData);

    // 2. Save transcript messages to the messages subcollection
    if (Array.isArray(transcript)) {
      for (let i = 0; i < transcript.length; i++) {
        const msg = transcript[i];
        const messageRef = doc(db, 'users', userId, 'sessions', finalSessionId, 'messages', `msg_${i}`);
        await setDoc(messageRef, {
          role: msg.role === 'assistant' || msg.role === 'ai' ? 'ai' : 'user',
          content: msg.content,
          turnNumber: i + 1,
          createdAt: new Date()
        });
      }

      // 3. Populate evaluations subcollection based on Q&A pairs
      let evalIndex = 0;
      for (let i = 0; i < transcript.length - 1; i++) {
        if ((transcript[i].role === 'assistant' || transcript[i].role === 'ai') && transcript[i+1].role === 'user') {
          const question = transcript[i].content;
          const userAnswer = transcript[i+1].content;
          
          const evalRef = doc(db, 'users', userId, 'sessions', finalSessionId, 'evaluations', `eval_${evalIndex}`);
          await setDoc(evalRef, {
            question: question.substring(0, 500),
            userAnswer: userAnswer.substring(0, 500),
            score: Math.round((readinessScore || 70) / 10), // Approximate question score based on overall readiness
            feedback: "Evaluated in session.",
            tags: ["completed"],
            createdAt: new Date()
          });
          evalIndex++;
        }
      }
    }

    return res.status(200).json({ success: true, interviewId: finalSessionId });
  } catch (error) {
    console.error('Error saving session:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

