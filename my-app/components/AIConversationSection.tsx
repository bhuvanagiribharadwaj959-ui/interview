import React, { useState, useEffect, useRef } from 'react';
import styles from '../styles/AIConversationSection.module.css';

export default function AIConversationSection() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentText, setCurrentText] = useState("Hello! Can you explain how you'd optimize the space complexity of this approach?");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleSpeak = async () => {
    if (isSpeaking) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsSpeaking(false);
      return;
    }

    try {
      setIsSpeaking(true); // Optimistic UI update

      // Call the local TTS API
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: currentText }),
      });

      if (!response.ok) {
        throw new Error('TTS API failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(url);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url); // Clean up
      };

      audio.onerror = () => {
        console.error("Audio playback error");
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };

      await audio.play();

    } catch (error) {
      console.error('TTS Error:', error);
      setIsSpeaking(false);
      // alert('Failed to generate speech. ensure the TTS server is running.');
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      window.speechSynthesis.cancel();
    };
  }, []);




  return (
    <section className={styles.section}>
      <div className={styles.container}>
        
        {/* Left Side - Orb */}
        <div className={styles.colLeft}>
          <div className={styles.orbWrapper}>
            <div className={`${styles.orbCore} ${isSpeaking ? styles.speaking : ''}`}>
               {/* Optional Soundwave inside the core for effect */}
               {isSpeaking && (
                 <div className={styles.soundwave}>
                   <span className={styles.bar} style={{ animationDelay: '0s' }} />
                   <span className={styles.bar} style={{ animationDelay: '0.1s' }} />
                   <span className={styles.bar} style={{ animationDelay: '0.2s' }} />
                   <span className={styles.bar} style={{ animationDelay: '0.1s' }} />
                   <span className={styles.bar} style={{ animationDelay: '0s' }} />
                 </div>
               )}
            </div>
            <div className={`${styles.orbRing} ${styles.ring1}`} />
            <div className={`${styles.orbRing} ${styles.ring2}`} />
            <div className={`${styles.orbRing} ${styles.ring3}`} />
            <div className={styles.orbGlow} />
          </div>

          <div className={styles.speechBubble}>
            <textarea 
              className={styles.speechText} 
              value={currentText}
              onChange={(e) => setCurrentText(e.target.value)}
              placeholder="Type something to speak..."
            />
            <button className={styles.speakBtn} onClick={handleSpeak}>
              {isSpeaking ? "Stop" : "▶ Speak"}
            </button>
          </div>
        </div>

        {/* Right Side - Content */}
        <div className={styles.colRight}>
          <span className={styles.eyebrow}>REAL-TIME INTERACTION</span>
          <h2 className={styles.heading}>Natural conversations with advanced AI</h2>
          <p className={styles.description}>
            Our AI doesn't just grade code. It listens, interprets your logic, and engages in a back-and-forth technical discussion, mimicking a real senior engineer.
          </p>

          <div className={styles.featureList}>
            <div className={styles.featureItem}>
              <div className={styles.checkIcon}>✓</div>
              <span>Voice-enabled mock interviews</span>
            </div>
            <div className={styles.featureItem}>
              <div className={styles.checkIcon}>✓</div>
              <span>Dynamic follow-up questions</span>
            </div>
            <div className={styles.featureItem}>
              <div className={styles.checkIcon}>✓</div>
              <span>Tone and confidence sentiment analysis</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
