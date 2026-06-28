import { db } from '@/lib/firebaseClient';
import { collection, doc, updateDoc, addDoc, getDoc } from 'firebase/firestore';
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
  } = req.body;

  if (readinessScore === undefined) {
    return res.status(400).json({ error: 'Missing interview data' });
  }

  try {
    if (interviewId) {
      // Update existing interview
      const interviewRef = doc(db, 'interviews', interviewId);
      const interviewSnap = await getDoc(interviewRef);

      if (!interviewSnap.exists() || interviewSnap.data().userId !== userId) {
        return res
          .status(404)
          .json({ error: 'Interview not found or not owned by user' });
      }

      await updateDoc(interviewRef, {
        endTime: new Date().toISOString(),
        duration: duration || '0 min',
        status: 'completed',
        readinessScore,
        vocabularyScore,
        communicationScore,
        technicalScore,
        confidenceScore,
        logicScore,
        rating,
        feedback,
        transcript,
        codingEvents: Array.isArray(codingEvents) ? codingEvents : [],
        startedAt: startedAt ? new Date(startedAt).toISOString() : null,
        endedAt: endedAt ? new Date(endedAt).toISOString() : new Date().toISOString(),
      });

      return res.status(200).json({ success: true, interviewId });
    } else {
      // Create new interview (legacy behavior)
      const interviewsRef = collection(db, 'interviews');
      const interviewData = {
        userId,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        type: type || 'Mock Interview',
        difficulty: difficulty || 'Medium',
        duration: duration || '0 min',
        status: 'completed',
        readinessScore,
        vocabularyScore,
        communicationScore,
        technicalScore,
        confidenceScore,
        logicScore,
        rating:
          rating ||
          (readinessScore > 80
            ? 'Excellent'
            : readinessScore > 60
            ? 'Good'
            : 'Needs Work'),
        feedback,
        transcript,
        codingEvents: Array.isArray(codingEvents) ? codingEvents : [],
        startedAt: startedAt ? new Date(startedAt).toISOString() : new Date().toISOString(),
        endedAt: endedAt ? new Date(endedAt).toISOString() : new Date().toISOString(),
      };

      const result = await addDoc(interviewsRef, interviewData);
      return res
        .status(201)
        .json({ message: 'Interview saved', id: result.id });
    }
  } catch (error) {
    console.error('Error saving interview:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

