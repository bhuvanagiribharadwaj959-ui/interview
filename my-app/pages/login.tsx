import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebaseClient';
import styles from '../styles/Login.module.css';
import InterviewIllustration from '../components/ui/InterviewIllustration';

export default function Login() {
  const router = useRouter();
  
  // State
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
        setError('Please fill in all fields.');
        return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // 1. Authenticate with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // 2. Check email verification status
      if (!user.emailVerified) {
        router.push('/verify-email');
        return;
      }

      // 3. Exchange credentials for backend JWT token
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
           email: user.email,
           displayName: user.displayName,
           uid: user.uid
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Authentication failed');
      
      // Store token and redirect
      const redirectUrl = router.query.redirect ? String(router.query.redirect) : '/dashboard';
      
      if (data.token) {
          localStorage.setItem('authToken', data.token);
          window.location.href = redirectUrl;
      } else {
          window.location.href = redirectUrl;
      }

    } catch (err: any) {
      console.error(err);
      let friendlyError = 'Invalid email or password.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        friendlyError = 'Incorrect email or password. Please try again.';
      } else if (err.code === 'auth/invalid-email') {
        friendlyError = 'Please enter a valid email address.';
      } else if (err.message) {
        friendlyError = err.message;
      }
      setError(friendlyError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleHelper = async () => {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        if (result.user) {
            // After successful Firebase Google auth, authenticate with our own backend
            const res = await fetch('/api/auth/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                 email: result.user.email,
                 displayName: result.user.displayName,
                 uid: result.user.uid
              })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || data.error || 'Server Google authentication failed');
            
            if (data.token) {
                localStorage.setItem('authToken', data.token);
            }
            
            const redirectUrl = router.query.redirect ? String(router.query.redirect) : '/dashboard';
            window.location.href = redirectUrl;
        }
      } catch (err: any) {
        setError('Google login failed. ' + err.message);
      }
  }

  return (
    <div className={styles['login-page']}>
      <Head>
        <title>Log In | udyogaprep</title>
      </Head>

      {/* LEFT PANEL - FORM (Swapped from Signup) */}
      <div className={styles['login-left-panel']}>
         <div className={styles['login-form-container']}>
            <h2 className={styles['login-title']}>Welcome back</h2>
            <p className={styles['login-subtitle']}>Please enter your details to sign in.</p>

            {error && <div className={styles['error-message']}>{error}</div>}

            <form onSubmit={handleSubmit}>
                <div className={styles['form-group']}>
                    <label className={styles['form-label']}>Email Address</label>
                    <div className={styles['input-wrapper']}>
                        <Mail size={18} className={styles['input-icon']} />
                        <input 
                          type="email" 
                          className={styles['form-input']} 
                          placeholder="name@university.edu"
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                    </div>
                </div>

                <div className={styles['form-group']}>
                    <label className={styles['form-label']}>Password</label>
                    <div className={styles['input-wrapper']}>
                        <Lock size={18} className={styles['input-icon']} />
                        <input 
                          type={showPassword ? "text" : "password"} 
                          className={styles['form-input']} 
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={e => setFormData({...formData, password: e.target.value})}
                        />
                        <button type="button" className={styles['password-toggle']} onClick={() => setShowPassword(!showPassword)}>
                           {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    <div className={styles['password-helper']}>
                        <Link href="/forgot-password">Forgot Password?</Link>
                    </div>
                </div>

                <div className={styles['checkbox-group']}>
                    <input 
                      type="checkbox" 
                      id="remember" 
                      className={styles['checkbox-input']}
                      checked={formData.rememberMe}
                      onChange={e => setFormData({...formData, rememberMe: e.target.checked})} 
                    />
                    <label htmlFor="remember" className={styles['checkbox-label']}>
                       Remember me for 30 days
                    </label>
                </div>

                <button type="submit" className={styles['cta-button']} disabled={isSubmitting} >
                   {isSubmitting ? 'Signing In...' : 'Sign In'}
                </button>
            </form>

            <div className={styles['divider']}>OR LOGIN WITH</div>

            <button type="button" className={styles['oauth-button']} onClick={handleGoogleHelper}>
                <svg width="18" height="18" viewBox="0 0 18 18" style={{marginRight: '8px'}}>
                    <title>Google</title>
                    <g fill="none" fillRule="evenodd">
                        <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"></path>
                        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"></path>
                        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.547 0 9a8.998 8.998 0 0 0 .957 4.042l3.007-2.332z" fill="#FBBC05"></path>
                        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"></path>
                    </g>
                </svg>
                Sign in with Google
            </button>

            <div className={styles['bottom-helper']}>
               Don't have an account? <Link href="/signup">Sign up for free</Link>
            </div>
         </div>
      </div>

      {/* RIGHT PANEL - BRANDING/VISUAL (Swapped from Signup) */}
      <div className={styles['login-right-panel']}>
        
        <div className={styles['brand-header']}>
           <div className={styles['logo-icon']}></div>
           <span className={styles['brand-name']}>Udyoga<span className={styles['logo-accent']}>PRP</span></span>
        </div>

        <div className={styles['right-panel-content']}>
            <div className={styles['visual-container']}>
                <img 
                  src="https://www.founditgulf.com/career-advice/wp-content/uploads/2023/11/Hirevue-Interview-Questions-1.jpg" 
                  alt="Login Illustration" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)' }} 
                />
            </div>

            <div className={styles['right-panel-text']}>

                <h1>Welcome back to your preparation journey</h1>
                <p>Continue practicing with our AI-driven interview coach and get one step closer to your dream job.</p>
            </div>
        </div>

        <div className={styles['right-panel-footer']}>
          © {new Date().getFullYear()} udyogaprep Inc. All rights reserved.
        </div>
      </div>

    </div>
  );
}
