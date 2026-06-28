import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { auth } from '../lib/firebaseClient';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { Mail, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import styles from '../styles/Login.module.css'; // Reuse Login styles or extend

export default function VerifyEmail() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Listen for auth state
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      if (currentUser) {
        if (currentUser.emailVerified) {
          // If already verified, get token and redirect
          handleSuccessfulVerification(currentUser);
        }
      } else {
        // If not logged in, redirect to login
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Set up auto-refresh interval to check verification status
  useEffect(() => {
    if (!user || user.emailVerified) return;

    const interval = setInterval(async () => {
      try {
        await user.reload();
        if (auth.currentUser?.emailVerified) {
          clearInterval(interval);
          handleSuccessfulVerification(auth.currentUser);
        }
      } catch (err) {
        console.error('Error reloading user status:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [user]);

  const handleSuccessfulVerification = async (verifiedUser: any) => {
    try {
      // Exchange Firebase Auth for backend JWT token
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: verifiedUser.email,
          displayName: verifiedUser.displayName,
          uid: verifiedUser.uid
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to authenticate session');

      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Verification succeeded, but failed to start session.');
    }
  };

  const handleCheckVerification = async () => {
    if (!user) return;
    setError('');
    setMessage('');
    
    try {
      await user.reload();
      if (auth.currentUser?.emailVerified) {
        setMessage('Email verified! Redirecting...');
        handleSuccessfulVerification(auth.currentUser);
      } else {
        setError('Email not verified yet. Please check your inbox and click the verification link.');
      }
    } catch (err: any) {
      setError('Failed to check verification status. ' + err.message);
    }
  };

  const handleResendEmail = async () => {
    if (!user) return;
    setResending(true);
    setError('');
    setMessage('');

    try {
      await sendEmailVerification(user);
      setMessage('Verification email resent successfully! Please check your inbox.');
    } catch (err: any) {
      setError('Failed to send verification email. ' + err.message);
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('authToken');
      router.push('/login');
    } catch (err: any) {
      setError('Failed to sign out. ' + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#090a0f', color: '#fff' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <RefreshCw className="animate-spin" size={32} style={{ color: '#2563eb' }} />
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#94a3b8' }}>Loading verification status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['login-page']} style={{ background: '#090a0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Head>
        <title>Verify Your Email | udyogaprep</title>
      </Head>

      <div style={{
        maxWidth: '450px',
        width: '100%',
        padding: '40px',
        background: 'rgba(17, 18, 28, 0.75)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        textAlign: 'center',
        color: '#fff',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          background: 'rgba(37, 99, 235, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          color: '#3b82f6',
          border: '1px solid rgba(37, 99, 235, 0.25)'
        }}>
          <Mail size={32} />
        </div>

        <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px', letterSpacing: '-0.025em' }}>Verify your email</h2>
        <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '32px' }}>
          We've sent a verification link to <strong style={{ color: '#f1f5f9' }}>{user?.email}</strong>. Please click the link to confirm your account.
        </p>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#f87171',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '13px',
            marginBottom: '20px',
            textAlign: 'left'
          }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            color: '#34d399',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '13px',
            marginBottom: '20px',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} />
            <span>{message}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button 
            onClick={handleCheckVerification} 
            style={{
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              padding: '14px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#1d4ed8')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#2563eb')}
          >
            I have verified my email
          </button>

          <button 
            onClick={handleResendEmail} 
            disabled={resending}
            style={{
              background: 'transparent',
              color: '#94a3b8',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '14px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            }}
          >
            {resending ? 'Resending...' : 'Resend verification email'}
          </button>
        </div>

        <div style={{
          marginTop: '32px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          paddingTop: '20px',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <button 
            onClick={handleSignOut}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'color 0.2s'
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#94a3b8')}
            onMouseOut={(e) => (e.currentTarget.style.color = '#64748b')}
          >
            <ArrowLeft size={14} />
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
