import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import styles from '../styles/HeroPage.module.css';
import GravityBackground from './ui/GravityBackground';
import FeaturesSection from './FeaturesSection';
import CodeEditorSection from './CodeEditorSection';
import AIConversationSection from './AIConversationSection';

const Navbar = () => {
  const router = useRouter();

  const handleNavClick = (item: string) => {
    if (item === 'Features') {
      const element = document.getElementById('features-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleGetStarted = () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  };

  return (
    <motion.nav 
      className={styles.navbar}
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <motion.div 
        className={styles.logo}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <img src="/favicon.svg" alt="Udyoga Prep" className={styles.logoIcon} />
        Udyoga Prep
      </motion.div>
      
      <div className={styles.navLinks}>
        {['Features', 'How it Works'].map((item) => (
          <motion.span 
            key={item} 
            className={styles.navLink}
            whileHover={{ scale: 1.05, color: "var(--primary-color)" }}
            whileTap={{ scale: 0.95 }}
            style={{ cursor: 'pointer' }}
            onClick={() => handleNavClick(item)}
          >
            {item}
          </motion.span>
        ))}
      </div>

      <div className={styles.navAuth}>
        <motion.span 
          className={styles.loginLink}
          whileHover={{ scale: 1.05 }}
          style={{ cursor: 'pointer' }}
          onClick={() => router.push('/login')}
        >
          Login
        </motion.span>
        <motion.button 
          className={styles.getStartedBtn}
          whileHover={{ scale: 1.05, boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)" }}
          whileTap={{ scale: 0.95 }}
          onClick={handleGetStarted}
        >
          Get Started
        </motion.button>
      </div>
    </motion.nav>
  );
};

const HeroLeft = () => {
  const router = useRouter();

  const handleStartForFree = () => {
    router.push('/dashboard');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 50, damping: 20 }
    }
  };

  return (
    <motion.div 
      className={styles.heroLeft}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.h1 className={styles.headline} variants={itemVariants as any}>
        Master Your<br />
        <span className={styles.highlight}>AI-Powered</span><br />
        Interview Prep
      </motion.h1>
      
      <motion.p className={styles.subtext} variants={itemVariants as any}>
        Practice with realistic AI interviewers, get instant feedback on your answers, 
        and land your dream job faster. Trusted by candidates worldwide.
      </motion.p>

      <motion.div className={styles.ctaRow} variants={itemVariants as any}>
        <motion.button 
          className={styles.primaryBtn}
          whileHover={{ scale: 1.05, boxShadow: "0 8px 25px rgba(59, 130, 246, 0.4)" }}
          whileTap={{ scale: 0.95 }}
          onClick={handleStartForFree}
        >
          Start for Free
        </motion.button>
      </motion.div>

      <motion.div className={styles.socialProof} variants={itemVariants as any}>
        <div className={styles.avatars}>
          <div className={styles.avatar}></div>
          <div className={styles.avatar}></div>
          <div className={styles.avatar}></div>
        </div>
        <span className={styles.proofText}>Trusted by 500+ recruitment teams worldwide</span>
      </motion.div>
    </motion.div>
  );
};

const HeroRight = () => {
  return (
    <motion.div 
      className={styles.heroRight}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
    >
      <div className={styles.sceneWrapper}>
        
        {/* Character 1: Interviewer */}
        <motion.div 
          className={`${styles.character} ${styles.interviewer}`}
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        >
          <div className={styles.head}></div>
          <div className={styles.body}></div>
          <div className={`${styles.arm} ${styles.leftArm}`}></div>
          <div className={`${styles.arm} ${styles.rightArm}`}></div>
          <div className={styles.desk}></div>
        </motion.div>

        {/* Character 2: Candidate */}
        <motion.div 
          className={`${styles.character} ${styles.candidate}`}
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
        >
          <div className={styles.head}></div>
          <div className={styles.body}></div>
          <div className={`${styles.arm} ${styles.leftArm}`}></div>
          <div className={`${styles.arm} ${styles.rightArm}`}></div>
          <div className={styles.desk}></div>
        </motion.div>

        {/* AI Brain */}
        <motion.div 
          className={styles.aiBrain}
          animate={{ scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
        >
          <div className={styles.core}></div>
          <div className={`${styles.ring} ${styles.ring1}`}></div>
          <div className={`${styles.ring} ${styles.ring2}`}></div>
        </motion.div>

        {/* Connecting Lines */}
        <div className={`${styles.connector} ${styles.lineLeft}`}></div> 
        <div className={`${styles.connector} ${styles.lineRight}`}></div>

        {/* Badges */}
        <motion.div 
          className={`${styles.badge} ${styles.fitScore}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.2, type: "spring", stiffness: 200, damping: 20 }}
          whileHover={{ scale: 1.1, y: -5 }}
        >
          <span className={styles.dot}></span>
          98% Fit Score
        </motion.div>

        <motion.div 
          className={`${styles.badge} ${styles.sentiment}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.4, type: "spring", stiffness: 200, damping: 20 }}
          whileHover={{ scale: 1.1, y: -5 }}
        >
          <div className={styles.barChart}>
            <span></span><span></span><span></span>
          </div>
          Sentiment Analysis
        </motion.div>

      </div>
    </motion.div>
  );
};

const Footer = () => {
  return (
    <footer className={styles.footer}>
      &copy; 2023 InterviewAI Inc. All rights reserved. Privacy Policy | Terms of Service
    </footer>
  );
};

export default function HeroPage() {
  return (
    <main className={styles.heroPage}>
      <GravityBackground />
      <Navbar />
      <div className={styles.heroContainer}>
        <HeroLeft />
        <HeroRight />
      </div>
      <div id="features-section">
        <FeaturesSection />
        <CodeEditorSection />
        <AIConversationSection />
      </div>
      <Footer />
    </main>
  );
}
