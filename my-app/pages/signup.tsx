import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebaseClient';
import styles from '../styles/SignUp.module.css';
import InterviewIllustration from '../components/ui/InterviewIllustration';

export default function Signup() {
  const router = useRouter();
  
  // State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    agree: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Refs for interactions - REMOVED


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
        setError('Please fill in all fields.');
        return;
    }
    if (!formData.agree) {
        setError('You must agree to the Terms and Privacy Policy.');
        return;
    }
    if (formData.password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
           name: formData.name,
           email: formData.email,
           password: formData.password 
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');
      
      // Auto login or redirect
      if (data.token) {
          localStorage.setItem('authToken', data.token);
          router.push('/login');
      } else {
          router.push('/login');
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleHelper = async () => {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        if (result.user) {
            router.push('/home');
        }
      } catch (err: any) {
        setError('Google signup failed. ' + err.message);
      }
  }

  return (
    <div className={styles['signup-page']}>
      <Head>
        <title>Sign Up | udyogaprep</title>
      </Head>

      {/* LEFT PANEL */}
      <div className={styles['signup-left-panel']}>
        
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

        <div className={styles['left-panel-content']}>
            <div className={styles['visual-container']}>
                <InterviewIllustration />
            </div>

            <div className={styles['left-panel-text']}>
                <h1>Master your next big interview</h1>
                <p>Join 10,000+ students practicing with our AI-driven interview coach. Get personalized feedback and land your dream job.</p>
            </div>
        </div>

        <div className={styles['left-panel-footer']}>
          © {new Date().getFullYear()} udyogaprep Inc. All rights reserved.
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className={styles['signup-right-panel']}>
         <div className={styles['signup-form-container']}>
            <h2 className={styles['signup-title']}>Create an account</h2>
            <p className={styles['signup-subtitle']}>Start your career journey with udyogaprep today.</p>

            {error && <div className={styles['error-message']}>{error}</div>}

            <form onSubmit={handleSubmit}>
                <div className={styles['form-group']}>
                    <label className={styles['form-label']}>Full Name</label>
                    <div className={styles['input-wrapper']}>
                        <User size={18} className={styles['input-icon']} />
                        <input 
                          type="text" 
                          className={styles['form-input']} 
                          placeholder="John Doe"
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                        />
                    </div>
                </div>

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
                    <p className={styles['password-helper']}>Must be at least 8 characters long.</p>
                </div>

                <div className={styles['checkbox-group']}>
                    <input 
                      type="checkbox" 
                      id="agree" 
                      className={styles['checkbox-input']}
                      checked={formData.agree}
                      onChange={e => setFormData({...formData, agree: e.target.checked})} 
                    />
                    <label htmlFor="agree" className={styles['checkbox-label']}>
                       By signing up, I agree to the <Link href="/terms">Terms of Service</Link> and <Link href="/privacy">Privacy Policy</Link>.
                    </label>
                </div>

                <button type="submit" className={styles['cta-button']} disabled={isSubmitting} >
                   {isSubmitting ? 'Creating Account...' : 'Create Account →'}
                </button>
            </form>

            <div className={styles['divider']}>OR JOIN WITH</div>

            <button type="button" className={styles['oauth-button']} onClick={handleGoogleHelper}>
                {/* Google Icon */}
                <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                    <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.547 0 9a8.998 8.998 0 0 0 .957 4.042l3.007-2.332z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
                Continue with Google
            </button>

            <div className={styles['form-footer']}>
               <Link href="/login">Already have an account? Log in</Link>
            </div>
         </div>
      </div>
    </div>
  );
}
