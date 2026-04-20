import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth'; // Ensure this uses your already configured firebase
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
      // Use Firebase Auth client-side or your custom API
      // Since signup used /api/auth/signup, let's assume /api/auth/login exists
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
           email: formData.email,
           password: formData.password
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      // Store token and redirect
      const redirectUrl = router.query.redirect ? String(router.query.redirect) : '/dashboard';
      
      if (data.token) {
          localStorage.setItem('authToken', data.token);
          router.push(redirectUrl);
      } else {
          // Fallback if no token returned but success
          router.push(redirectUrl);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleHelper = async () => {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        if (result.user) {
            // After successful Firebase Google auth, authenticate with our own backend
            // to generate the JWT that the rest of the application (like /dashboard) expects.
            const res = await fetch('/api/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                 email: result.user.email,
                 displayName: result.user.displayName,
                 uid: result.user.uid
              })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Server Google authentication failed');
            
            if (data.token) {
                localStorage.setItem('authToken', data.token);
            }
            
            const redirectUrl = router.query.redirect ? String(router.query.redirect) : '/dashboard';
            router.push(redirectUrl);
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
           <div className={styles['brand-logo']}>
            {/* Graduation cap icon on orange bg */}
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 10L12 5L2 10L12 15L22 10Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 12V17C6 17.5523 12 19 12 19C12 19 18 17.5523 18 17V12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="15" x2="12" y2="19" stroke="white" strokeWidth="2" strokeLinecap="round"/>
             </svg>
           </div>
           <span className={styles['brand-name']}>udyogaprep</span>
        </div>

        <div className={styles['right-panel-content']}>
            <div className={styles['visual-container']}>
                <InterviewIllustration variant="login" />
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
