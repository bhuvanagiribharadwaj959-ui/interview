import { getDb } from '@/lib/mongodb';
import { createAuthToken, normalizeEmail } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { email, displayName, uid } = req.body || {};

    const safeEmail = normalizeEmail(email);

    if (!safeEmail) {
      return res.status(400).json({ error: 'Email is required for Google login.' });
    }

    const db = await getDb();
    const users = db.collection('users');

    let userDoc = await users.findOne({ email: safeEmail });
    if (!userDoc) {
      // Create user if they don't exist
      const result = await users.insertOne({
        name: displayName || 'Google User',
        email: safeEmail,
        firebaseUid: uid,
        createdAt: new Date(),
      });
      userDoc = {
        _id: result.insertedId,
        name: displayName || 'Google User',
        email: safeEmail,
      };
    }

    const user = {
      id: userDoc._id.toString(),
      name: userDoc.name,
      email: userDoc.email,
    };

    const token = createAuthToken(user);

    return res.status(200).json({ message: 'Login successful.', user, token });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to process Google login.',
      message: error?.message || 'Unknown error',
    });
  }
}
