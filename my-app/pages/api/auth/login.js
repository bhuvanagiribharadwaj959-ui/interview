import { db } from '@/lib/firebaseClient';
import { collection, query, where, getDocs } from 'firebase/firestore';
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

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', safeEmail));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    const isValidPassword = await verifyPassword(safePassword, userData.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = {
      id: userDoc.id,
      name: userData.name,
      email: userData.email,
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

