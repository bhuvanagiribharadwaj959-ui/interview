import { getDb } from '@/lib/mongodb';
import { createAuthToken, normalizeEmail, verifyPassword } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { email, password } = req.body || {};

    const safeEmail = normalizeEmail(email);
    const safePassword = String(password || '');

    if (!safeEmail || !safePassword) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const db = await getDb();
    const users = db.collection('users');

    const userDoc = await users.findOne({ email: safeEmail });
    if (!userDoc) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isValidPassword = await verifyPassword(safePassword, userDoc.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
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
      error: 'Failed to login.',
      message: error?.message || 'Unknown error',
    });
  }
}
