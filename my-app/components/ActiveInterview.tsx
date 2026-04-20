import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

const formatTime = (time: number) => {
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  const seconds = time % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const ActiveInterview = ({ selections }) => {
  const router = useRouter();
  const [timer, setTimer] = useState(0); // Start from 0
  const [isEnding, setIsEnding] = useState(false);
  const [interviewId, setInterviewId] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(
    selections?.resume 
      ? "Hello! I've reviewed your resume. To get started, could you briefly walk me through your experience and background?"
      : "Hello! To get started, could you tell me which technical domain or field you are most comfortable with?"
  );
  const [resumeText, setResumeText] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [networkStatus, setNetworkStatus] = useState('Stable');
  const [callEnded, setCallEnded] = useState(false);
  const [interviewStats, setInterviewStats] = useState<any>(null);
  const [showingStats, setShowingStats] = useState(false);

  // --- Speech Recognition & Interview State ---
  const [interviewState, setInterviewState] = useState<'idle' | 'listening' | 'analyzing' | 'speaking'>('idle');
    const [conversationHistory, setConversationHistory] = useState<Array<{role: 'user' | 'ai' | 'assistant', content: string}>>([]);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const maxListenTimerRef = useRef<any>(null);
  const handleResponseRef = useRef<(transcript: string) => void>(() => {});

  useEffect(() => {
    if (selections && selections.resume) {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const resultStr = reader.result as string;
          const base64Data = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;
          const fileName = (selections.resume as File).name;
          const response = await fetch('/api/parse-resume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileData: base64Data, fileName })
          });
          if (response.ok) {
            const data = await response.json();
            if (data.text) setResumeText(data.text);
          }
        } catch (e) {
          console.error("Resume parse error", e);
        }
      };
      reader.readAsDataURL(selections.resume as File);
    }
  }, [selections]);

  useEffect(() => {
    handleResponseRef.current = handleUserResponseDone;
  });

  const handleUserResponseDone = async (transcript: string) => {
      setInterviewState('analyzing');
      const updatedHistory = [...conversationHistory, { role: 'user' as const, content: transcript }];
      setConversationHistory(updatedHistory);
      console.log("[Interview] User:", transcript);

      let systemPrompt = 'You are a technical AI interviewer. Keep your responses short, conversational, and direct.';
      if (resumeText) {
          systemPrompt += ` The candidate has provided their resume. Based on the resume, ask a specific project-based or domain-specific interview question. Resume content: ${resumeText.substring(0, 4000)}`;
      } else {
          systemPrompt += ` The candidate is responding with their area of expertise or answering a domain question. Based on their answers, generate a relevant domain-specific interview question.`;
      }

      try {
          const res = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  messages: [
                      { role: 'system', content: systemPrompt },
                      ...updatedHistory
                  ]
              })
          });
          const data = await res.json();
          if (data.message) {
              const cleanedReply = data.message.replace(/\*\*/g, '').replace(/`/g, '');
              const newHistory = [...updatedHistory, { role: 'assistant' as const, content: cleanedReply }];
              setConversationHistory(newHistory);
              setCurrentQuestion(cleanedReply);
              speakText(cleanedReply);
          } else if (data.reply) {
              const cleanedReply = data.reply.replace(/\*\*/g, '').replace(/`/g, '');
              const newHistory = [...updatedHistory, { role: 'assistant' as const, content: cleanedReply }];
              setConversationHistory(newHistory);
              setCurrentQuestion(cleanedReply);
              speakText(cleanedReply);
          }
      } catch (error) {
          console.error("Chat API error:", error);
          setInterviewState('listening');
      }
  };

  const speakText = async (text: string) => {
      setInterviewState('speaking');
      try {
          const res = await fetch('/api/tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text })
          });
          if (res.ok) {
              const blob = await res.blob();
              const audio = new Audio(URL.createObjectURL(blob));
              audio.onended = () => {
                  setInterviewState('listening');
              };
              audio.play();
          } else {
              setInterviewState('listening');
          }
      } catch (e) {
          console.error('TTS failed', e);
          setInterviewState('listening');
      }
  };

  useEffect(() => {
      if (interviewState !== 'listening' || isMuted) {
          if (recognitionRef.current) {
              try { recognitionRef.current.stop(); } catch {}
              recognitionRef.current = null;
          }
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          if (maxListenTimerRef.current) clearTimeout(maxListenTimerRef.current);
          return;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
          console.warn('SpeechRecognition not supported');
          return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let finalTranscript = '';
      let stopped = false;

      const finish = (transcript: string) => {
          if (stopped) return;
          stopped = true;
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          if (maxListenTimerRef.current) clearTimeout(maxListenTimerRef.current);
          try { recognition.stop(); } catch {}
          recognitionRef.current = null;
          handleResponseRef.current(transcript);
      };

      recognition.onresult = (event: any) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                  finalTranscript += transcript + ' ';
              } else {
                  interimTranscript += transcript;
              }
          }

          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
              const combined = (finalTranscript + ' ' + interimTranscript).trim();
              if (combined) finish(combined);
          }, 2000); // 2 second pause
      };

      try {
          recognition.start();
          recognitionRef.current = recognition;
      } catch (e) {
          console.error("Recognition start error", e);
      }

      maxListenTimerRef.current = setTimeout(() => {
          finish(finalTranscript.trim() || 'No response provided.');
      }, 45000);

      return () => {
          stopped = true;
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          if (maxListenTimerRef.current) clearTimeout(maxListenTimerRef.current);
          try { recognition.stop(); } catch {}
          recognitionRef.current = null;
      };
  }, [interviewState, isMuted]);

  useEffect(() => {
    const updateNetworkStatus = () => {
      if (typeof navigator !== 'undefined' && 'connection' in navigator) {
         const conn = (navigator as any).connection;
         if (conn) {
           const downlink = conn.downlink;
           const rtt = conn.rtt;
           if (downlink < 1.0 || rtt > 500) {
             setNetworkStatus('Weak Signal');
           } else if (downlink < 3.0 || rtt > 300) {
             setNetworkStatus('Moderate');
           } else {
             setNetworkStatus('Stable');
           }
         }
      }
      if (!navigator.onLine) {
        setNetworkStatus('Offline');
      }
    };

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    // Check periodically as connection properties change
    const interval = setInterval(updateNetworkStatus, 5000);
    updateNetworkStatus();

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const startSession = async () => {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        try {
            // Start Interview Session
            const res = await fetch('/api/interview/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    type: selections?.type || 'Behavioral Interview',
                    difficulty: selections?.difficulty || 'Medium'
                })
            });
            if (res.ok) {
                const data = await res.json();
                setInterviewId(data.interviewId);
            }
        } catch (e) {
            console.error('Failed to start interview session', e);
        }
    };
    
    const speakIntro = async () => {
         speakText(currentQuestion);
         setConversationHistory([{ role: 'assistant', content: currentQuestion }]);
    };

    startSession();
    // Small delay for TTS to feel natural after page load
    setTimeout(speakIntro, 1000);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleEndInterview = async () => {
      // 1. Immediate Visual Feedback (Like hanging up a phone)
      setCallEnded(true);
      setIsEnding(true);

      const token = localStorage.getItem('authToken');
      if (!token) {
          router.push('/login');
          return;
      }

      // Evaluate using AI
      let evalData = null;
      try {
        const evalRes = await fetch('/api/evaluate_interview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            transcript: conversationHistory,
            type: selections?.type || 'Behavioral Interview',
            difficulty: selections?.difficulty || 'Medium'
          })
        });
        if (evalRes.ok) {
          evalData = await evalRes.json();
        }
      } catch (err) {
        console.error("AI Evaluation failed:", err);
      }

        // Default fallback if AI fails (deterministic to avoid randomized charts)
        const textBody = conversationHistory.map((m: any) => m.content || '').join(' ');
        const wordCount = textBody.split(/\\s+/).length || 10;
        const baseScore = Math.min(100, Math.max(40, wordCount));

        const readinessScore = evalData?.readinessScore ?? Math.min(100, baseScore + (textBody.length % 10));
        const vocabularyScore = evalData?.vocabularyScore ?? Math.min(10, Math.floor(baseScore / 10) + (textBody.length % 3));
        const communicationScore = evalData?.communicationScore ?? Math.min(100, baseScore + 5);
        const technicalScore = evalData?.technicalScore ?? Math.min(100, baseScore - 5);
        const confidenceScore = evalData?.confidenceScore ?? Math.min(100, baseScore + (wordCount % 15));
        const logicScore = evalData?.logicScore ?? Math.min(100, baseScore + (textBody.length % 5));
      const payload = {
          interviewId, // Add ID for update
          type: selections?.type || 'Behavioral Interview', 
          difficulty: selections?.difficulty || 'Medium',
          duration: `${Math.floor(timer / 60)} min`,
          readinessScore,
          vocabularyScore,
          communicationScore,
          technicalScore,
          confidenceScore,
          logicScore,
          feedback: '',
          transcript: conversationHistory // Send the full conversation
      };

      try {
          // 2. Perform Save in background (or await briefly)
          const res = await fetch('/api/interview/save', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(payload)
          });

      // 3. Show stats instead of navigating to dashboard
      setInterviewStats(payload);
      setShowingStats(true); // Immediate stats
    } catch (e) {
      console.error(e);
      setInterviewStats(payload);
      setShowingStats(true); // Ensure stats show on error
    }
  };


          if (callEnded) {
        if (showingStats && interviewStats) {
            return (
                <div className="fixed inset-0 z-50 bg-surface font-body text-on-surface flex flex-col items-center justify-center p-8 overflow-y-auto">
                    <div className="w-full max-w-3xl bg-surface-container-lowest rounded-[2rem] p-8 md:p-12 shadow-sm border border-outline-variant/30 mt-8">
                        <header className="mb-8 text-center mt-20">
                            <h2 className="text-3xl md:text-4xl font-headline font-bold text-on-surface tracking-tight mb-2">Interview Complete</h2>
                            <p className="text-on-surface-variant">Here's a quick overview of your performance</p>
                        </header>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <div className="bg-surface-container p-6 rounded-2xl text-center">
                                <p className="text-sm text-on-surface-variant font-label uppercase tracking-wider mb-2">Overall</p>
                                <p className="text-3xl font-headline font-bold text-primary">{interviewStats.readinessScore}%</p>
                            </div>
                            <div className="bg-surface-container p-6 rounded-2xl text-center">
                                <p className="text-sm text-on-surface-variant font-label uppercase tracking-wider mb-2">Logic</p>
                                <p className="text-3xl font-headline font-bold text-primary">{interviewStats.logicScore}%</p>
                            </div>
                            <div className="bg-surface-container p-6 rounded-2xl text-center">
                                <p className="text-sm text-on-surface-variant font-label uppercase tracking-wider mb-2">Vocabulary</p>
                                <p className="text-3xl font-headline font-bold text-primary">{interviewStats.vocabularyScore}/10</p>
                            </div>
                            <div className="bg-surface-container p-6 rounded-2xl text-center">
                                <p className="text-sm text-on-surface-variant font-label uppercase tracking-wider mb-2">Confidence</p>
                                <p className="text-3xl font-headline font-bold text-primary">{interviewStats.confidenceScore}%</p>
                            </div>
                        </div>

                        <div className="bg-surface-container-high p-6 rounded-2xl mb-10">
                            <h3 className="font-headline font-bold text-lg mb-2">Key Feedback</h3>
                            <p className="text-on-surface-variant leading-relaxed">
                                {interviewStats.feedback} Keep practicing to improve clarity and structure in your answers. Your technical foundation is solid!
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button 
                                onClick={() => router.push('/dashboard')}
                                className="w-full sm:w-auto px-8 py-3 rounded-full border-2 border-outline-variant text-on-surface font-semibold hover:border-primary hover:text-primary transition-colors"
                            >
                                Back to Dashboard
                            </button>
                            <button 
                                onClick={() => window.location.href = '/interview'}
                                className="w-full sm:w-auto px-8 py-3 rounded-full bg-primary hover:bg-primary-container text-white font-semibold flex items-center justify-center gap-2 transition-colors shadow-md shadow-primary/20"
                            >
                                <span className="material-symbols-outlined text-[20px]">refresh</span>
                                Re-interview
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center animate-fadeOut">
                <div className="flex flex-col items-center gap-6 animate-pulse">
                    <span className="material-symbols-outlined text-red-500 text-6xl">call_end</span>
                    <h2 className="text-white text-2xl font-headline font-bold tracking-widest uppercase">Call Ended</h2>
                </div>
            </div>
        );
    }

  return (
    <>
      <Head>
        <title>udyogaprep - AI Interview</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
      </Head>

      <style jsx global>{`
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .ai-orb-glow {
            background: radial-gradient(circle, rgba(0,88,190,0.15) 0%, rgba(249,249,255,0) 70%);
        }
        .ai-orb-core {
            background: linear-gradient(135deg, #0058be 0%, #2170e4 50%, #994100 100%);
            box-shadow: 0 0 80px rgba(0, 88, 190, 0.4), inset 0 0 30px rgba(255, 255, 255, 0.3);
            animation: orbPulse 4s ease-in-out infinite;
        }
        .ai-orb-inner {
            background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 70%);
        }
        @keyframes orbPulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.08); opacity: 0.9; }
        }
        .waveform-bar {
            width: 4px;
            background-color: #0058be;
            border-radius: 99px;
            animation: wave 1.2s ease-in-out infinite;
        }
        @keyframes wave {
            0%, 100% { height: 8px; }
            50% { height: 32px; }
        }
        .glass-panel {
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
        }
      `}</style>
      
      <div className="bg-surface font-body text-on-surface selection:bg-primary-fixed min-h-screen w-screen flex flex-col pt-0 relative">
        {/* Top Navigation Bar */}
        <header className="absolute top-0 w-full z-50 flex justify-between items-center px-8 h-20 bg-[#f8faff] border-b border-outline-variant/10">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-error animate-pulse"></span>
                    <span className="font-headline font-bold text-lg tracking-tight text-on-surface">Software Engineer - Backend</span>
                </div>
                <div className="h-6 w-px bg-outline-variant/30"></div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-highest/50 rounded-full">
                    <span className="material-symbols-outlined text-primary scale-75">schedule</span>
                    <span className="font-label text-sm font-semibold tracking-wide text-primary">
                        {formatTime(timer)}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-primary">
                    <span className="material-symbols-outlined text-xl" style={{fontVariationSettings: "'FILL' 1"}}>graphic_eq</span>
                    <span className="font-label text-xs font-bold uppercase tracking-widest">
                        {interviewState === 'listening' ? 'AI Listening' : 
                         interviewState === 'analyzing' ? 'AI Analyzing' : 
                         interviewState === 'speaking' ? 'AI Speaking' : 'AI Ready'}
                    </span>
                </div>
                <button className="flex items-center justify-center p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors duration-200">
                    <span className="material-symbols-outlined" data-icon="account_circle">account_circle</span>
                </button>
            </div>
        </header>

        {/* Main Content Canvas */}
        <main className="flex-grow flex flex-col items-center justify-center relative px-6 pt-32 pb-40">
            {/* Background Layering */}
            <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
                <div className="w-[1000px] h-[1000px] ai-orb-glow rounded-full"></div>
            </div>

            {/* AI Orb Section */}
            <div className="relative z-10 flex flex-col items-center mb-12">
                <div className="w-56 h-56 rounded-full ai-orb-core relative flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 ai-orb-inner"></div>
                    {/* Core Psychology Icon */}
                    <div className="relative z-20 w-32 h-32 rounded-full border border-white/20 flex items-center justify-center bg-white/5 backdrop-blur-sm">
                        <span className="material-symbols-outlined text-white text-6xl opacity-90" style={{fontVariationSettings: "'FILL' 1"}}>psychology</span>
                    </div>
                    {/* Swirling light accents */}
                    <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent,rgba(255,182,144,0.2),transparent)] animate-[spin_8s_linear_infinite]"></div>
                </div>

                {/* Voice Frequency Waveform */}
                <div className="mt-8 flex items-end gap-1.5 h-10">
                    <div className="waveform-bar" style={{animationDelay: '0.1s', height: '12px'}}></div>
                    <div className="waveform-bar" style={{animationDelay: '0.3s', height: '24px'}}></div>
                    <div className="waveform-bar" style={{animationDelay: '0.5s', height: '18px'}}></div>
                    <div className="waveform-bar" style={{animationDelay: '0.2s', height: '32px'}}></div>
                    <div className="waveform-bar" style={{animationDelay: '0.4s', height: '14px'}}></div>
                    <div className="waveform-bar" style={{animationDelay: '0.6s', height: '28px'}}></div>
                    <div className="waveform-bar" style={{animationDelay: '0.1s', height: '10px'}}></div>
                    <div className="waveform-bar" style={{animationDelay: '0.7s', height: '20px'}}></div>
                    <div className="waveform-bar" style={{animationDelay: '0.3s', height: '16px'}}></div>
                </div>
            </div>

            {/* Question Text Container */}
            <div className="relative z-10 max-w-4xl text-center space-y-6">
                <span className="inline-block px-4 py-1.5 bg-primary-fixed text-on-primary-fixed-variant font-label text-[10px] font-extrabold uppercase tracking-[0.2em] rounded-full">Current Question</span>
                <h1 className="font-headline text-4xl md:text-5xl font-extrabold text-on-surface leading-tight tracking-tight px-4">
                    "{currentQuestion}"
                </h1>
            </div>

            {/* User Camera Preview (Small Bottom Right) - REMOVED */}
            {/* <div className="fixed bottom-28 right-8 z-40">...</div> */}
        </main>

        {/* Bottom Navigation Bar (Interview Controls) */}
        <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-between items-center px-12 pb-8 pt-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-[0_-4px_32px_rgba(17,28,45,0.06)] rounded-t-3xl border-t border-outline-variant/10">
            {/* Status Indicator Left */}
            <div className={`flex items-center gap-3 px-5 py-3 rounded-full ${networkStatus === 'Stable' ? 'bg-surface-container-low' : 'bg-red-100 dark:bg-red-900/30'}`}>
                <span className="material-symbols-outlined text-primary text-sm" style={{fontVariationSettings: "'FILL' 1"}}>
                  {networkStatus === 'Stable' ? 'signal_cellular_alt' : 'signal_cellular_alt_1_bar'}
                </span>
                <span className={`font-label text-xs font-bold uppercase tracking-wider ${networkStatus === 'Stable' ? 'text-on-surface' : 'text-red-700 dark:text-red-300'}`}>
                  Network {networkStatus}
                </span>
            </div>

            {/* Central Control Cluster */}
            <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className={`flex flex-col items-center justify-center p-4 ${isMuted ? 'bg-error-container text-on-error-container' : 'bg-surface-container-high text-on-surface'} hover:bg-surface-container-highest rounded-full transition-all duration-200 active:scale-90`}
                >
                    <span className="material-symbols-outlined" data-icon={isMuted ? "mic_off" : "mic"}>{isMuted ? "mic_off" : "mic"}</span>
                </button>
                {/* Video Button Removed */}
                
                <button className="flex flex-col items-center justify-center p-4 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-full transition-all duration-200 active:scale-90">
                    <span className="material-symbols-outlined" data-icon="settings">settings</span>
                </button>
                <div className="w-px h-10 bg-outline-variant/30 mx-2"></div>
                <button className="flex items-center gap-3 px-8 py-4 bg-tertiary hover:bg-tertiary-container text-white rounded-full font-headline font-bold transition-all duration-200 active:scale-95 shadow-lg shadow-tertiary/20" onClick={handleEndInterview} disabled={isEnding}>
                    <span className="material-symbols-outlined" data-icon="call_end">call_end</span>
                    <span>{isEnding ? 'Ending...' : 'End Interview'}</span>
                </button>
            </div>

            {/* Right help button */}
            <div className="w-[160px] flex justify-end">
                <button className="p-3 bg-transparent text-on-surface-variant hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">help_outline</span>
                </button>
            </div>
        </nav>
      </div>
    </>
  );
};

export default ActiveInterview;


