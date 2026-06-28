import { db } from '@/lib/firebaseClient';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { createAuthToken, hashPassword, normalizeEmail } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { name, email, password } = req.body || {};

    const safeName = String(name || '').trim();
    const safeEmail = normalizeEmail(email);
    const safePassword = String(password || '');

    if (!safeEmail || !safePassword) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const finalName = safeName || safeEmail.split('@')[0];

    if (safePassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', safeEmail));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return res.status(409).json({ error: 'User already exists with this email.' });
    }

    const passwordHash = await hashPassword(safePassword);
    const now = new Date();

    const result = await addDoc(usersRef, {
      name: finalName,
      email: safeEmail,
      passwordHash,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      authProvider: 'email',
    });

    const user = {
      id: result.id,
      name: finalName,
      email: safeEmail,
    };

    const token = createAuthToken(user);

    return res.status(201).json({ message: 'Account created successfully.', user, token });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to create account.',
      message: error?.message || 'Unknown error',
    });
  }
}

