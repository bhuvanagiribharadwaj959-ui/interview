import { db } from '@/lib/firebaseClient';
import { collection, addDoc } from 'firebase/firestore';
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
  const { type, difficulty } = req.body;

  try {
    const sessionsRef = collection(db, 'users', userId, 'sessions');

    const newSession = {
      resumeId: null, // will be updated when resume is parsed/attached
      topic: type || 'Mock Interview',
      difficulty: difficulty || 'medium',
      status: 'ongoing',
      score: 0,
      feedback: '',
      startedAt: new Date(),
      endedAt: null,

      // Keep legacy fields to support existing dashboard and history logic
      userId,
      startTime: new Date().toISOString(),
      type: type || 'Mock Interview',
      readinessScore: 0,
      vocabularyScore: 0, 
      communicationScore: 0,
      technicalScore: 0,
      confidenceScore: 0,
      logicScore: 0,
      duration: '0 min'
    };

    const result = await addDoc(sessionsRef, newSession);
    
    return res.status(200).json({ 
      success: true, 
      interviewId: result.id 
    });

  } catch (err) {
    console.error('Error starting interview:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

