import { getDb } from '@/lib/mongodb';
import { verifyAuthToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

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
    const db = await getDb();
    const interviewsCollection = db.collection('interviews');

    if (interviewId) {
      // Update existing interview
      const filter = { _id: new ObjectId(interviewId), userId: userId };
      const update = {
        $set: {
          endTime: new Date(),
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
          startedAt: startedAt ? new Date(startedAt) : undefined,
          endedAt: endedAt ? new Date(endedAt) : new Date(),
        },
      };

      const result = await interviewsCollection.updateOne(filter, update);

      if (result.matchedCount === 0) {
        return res
          .status(404)
          .json({ error: 'Interview not found or not owned by user' });
      }

      return res.status(200).json({ success: true, interviewId });
    } else {
      // Create new interview (legacy behavior)
      const interviewData = {
        userId,
        startTime: new Date(),
        endTime: new Date(),
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
        startedAt: startedAt ? new Date(startedAt) : new Date(),
        endedAt: endedAt ? new Date(endedAt) : new Date(),
      };

      const result = await interviewsCollection.insertOne(interviewData);
      return res
        .status(201)
        .json({ message: 'Interview saved', id: result.insertedId });
    }
  } catch (error) {
    console.error('Error saving interview:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
