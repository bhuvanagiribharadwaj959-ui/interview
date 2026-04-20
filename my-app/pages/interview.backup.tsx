"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { VoicePoweredOrb } from "@/components/ui/voice-powered-orb";
import { Button } from "@/components/ui/button";
import { Upload, ArrowRight, Volume2, Eye, X, Check, Briefcase, Zap, Info, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

import { getInterviewState, updateInterviewState } from "@/lib/interviewStore";

// ── TTS Text Preprocessing ──────────────────────────────────────────────────
const preprocessTextForTTS = (text: string): string => {
  return text
    // Remove markdown symbols
    .replace(/\*\*/g, '') // Remove bold markers
    .replace(/`/g, '') // Remove backticks
    .replace(/\[/g, '') // Remove brackets
    .replace(/\]/g, '') // Remove closing brackets
    // Expand common abbreviations
    .replace(/\be\.g\./gi, 'for example')
    .replace(/\bi\.e\./gi, 'that is')
    .replace(/\betc\./gi, 'et cetera')
    .replace(/\bvs\./gi, 'versus')
    .replace(/\bmax\b/gi, 'maximum')
    .replace(/\bmin\b/gi, 'minimum')
    .replace(/\barray\b/gi, 'array')
    .replace(/\btarget\b/gi, 'target')
    .replace(/\bconstraints\b/gi, 'constraints')
    // Clean up extra spaces
    .replace(/\s+/g, ' ')
    .trim();
};

export default function InterviewPage() {
  const [interviewState, setInterviewState] = useState<'idle' | 'uploading' | 'analyzing' | 'interviewing' | 'listening'>('idle');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const maxListenTimerRef = useRef<any>(null);
  const handleResponseRef = useRef<(transcript: string) => void>(() => {});
  
  // Dashboard State
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [jobType, setJobType] = useState<'Full-time' | 'Internship'>('Full-time');
  const [jobRole, setJobRole] = useState('');
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [showResumeModal, setShowResumeModal] = useState(false);

  // Audio Config
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  // Interview Flow State
  const [conversationPhase, setConversationPhase] = useState<'intro' | 'experience' | 'skills' | 'coding'>('intro');
  const [conversationHistory, setConversationHistory] = useState<Array<{role: 'user' | 'ai', content: string}>>([]);
  const [codingChallenge, setCodingChallenge] = useState<string>('');
  const [hasShownFeedback, setHasShownFeedback] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync with Global State (for feedback from editor)
  useEffect(() => {
    const handleStateChange = () => {
      const state = getInterviewState();
      if (state?.phase === 'feedback' && state?.codingFeedback && !hasShownFeedback) {
        setHasShownFeedback(true);
        // Move to interviewing state to show the feedback
        setInterviewState('interviewing');
        playTTS(state.codingFeedback);
        
        // Add to history
        setConversationHistory(prev => [...prev, { role: 'ai', content: state.codingFeedback }]);
        
        // Optionally clear the feedback flag so we don't repeat
        updateInterviewState({ phase: 'completed' });
      }
    };

    window.addEventListener('interviewStateChange', handleStateChange);
    // Also check on mount/refocus
    handleStateChange();

    return () => window.removeEventListener('interviewStateChange', handleStateChange);
  }, [hasShownFeedback]);

  // File Upload State
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumePreviewRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!resumePreviewRef.current) return;
    const { left, top, width, height } = resumePreviewRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    resumePreviewRef.current.style.setProperty('--mouse-x', `${x}%`);
    resumePreviewRef.current.style.setProperty('--mouse-y', `${y}%`);
  };

  // Initialize Audio Context
  const initAudio = useCallback(() => {
    if (!audioContext) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const anal = ctx.createAnalyser();
      anal.fftSize = 512;
      anal.smoothingTimeConstant = 0.5; // Smoother visualisation
      setAudioContext(ctx);
      setAnalyser(anal);
      return { ctx, anal };
    }
    return { ctx: audioContext, anal: analyser };
  }, [audioContext, analyser]);

  const playTTS = async (text: string) => {
    try {
      setIsAiSpeaking(true);
      const { ctx, anal } = initAudio();
      if (ctx?.state === 'suspended') await ctx.resume();

      // Preprocess text for natural TTS reading
      const cleanText = preprocessTextForTTS(text);
      console.log(`[TTS] Original: "${text.slice(0, 50)}..."`);
      console.log(`[TTS] Cleaned: "${cleanText.slice(0, 50)}..."`);

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText }),
      });

      console.log(`[TTS] Request sent for: "${text.slice(0, 30)}..."`);

      if (!response.ok) {
        console.warn(`[TTS] Server error ${response.status}. Fallback to browser synthesis.`);
        // Graceful fallback for local/dev environments when server TTS is unavailable.
        const utterance = new SpeechSynthesisUtterance(cleanText);
        const speechPromise = new Promise<void>((resolve) => {
          utterance.onend = () => {
            setIsAiSpeaking(false);
            resolve();
          };
          utterance.onerror = () => {
            setIsAiSpeaking(false);
            resolve();
          };
        });
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
        await speechPromise;
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = url;
        audioRef.current.load();
        
        // Wait for audio to be ready
        await new Promise<void>((resolve) => {
            audioRef.current!.oncanplaythrough = () => resolve();
        });

        // Connect to analyser if not already connected
        try {
            const source = ctx!.createMediaElementSource(audioRef.current!);
            source.connect(anal!);
            anal!.connect(ctx!.destination);
        } catch (e) {
            // Source likely already connected, ignore
        }

        // Wait for audio to actually finish playing (not just start)
        await new Promise<void>((resolve) => {
            const onEnded = () => {
                audioRef.current?.removeEventListener('ended', onEnded);
                setIsAiSpeaking(false);
                resolve();
            };
            audioRef.current!.addEventListener('ended', onEnded);
            audioRef.current!.play().catch(() => {
                audioRef.current?.removeEventListener('ended', onEnded);
                setIsAiSpeaking(false);
                resolve();
            });
        });
      }
    } catch (error) {
      console.error("TTS Error:", error);
      setIsAiSpeaking(false);
    }
  };

  const handleSpeakerClick = () => {
    initAudio();
    playTTS("Hi. I am your AI Interviewer. Please upload your resume to begin.");
  };

  // Keep handleResponseRef always pointing to the latest handleUserResponseDone
  useEffect(() => {
    handleResponseRef.current = handleUserResponseDone;
  });

  // Speech recognition: auto-listen and detect when user stops speaking
  useEffect(() => {
    if (interviewState !== 'listening') {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (maxListenTimerRef.current) {
        clearTimeout(maxListenTimerRef.current);
        maxListenTimerRef.current = null;
      }
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
      
      // Log for debugging
      if (finalTranscript.trim()) {
        console.log('[Speech Recognition] Final so far:', finalTranscript.trim());
      }
      if (interimTranscript.trim()) {
        console.log('[Speech Recognition] Interim:', interimTranscript.trim());
      }

      // Reset silence timer on new speech - 2 second silence = AI's turn to speak
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        const combined = (finalTranscript + ' ' + interimTranscript).trim();
        if (combined) {
          console.log('[Speech Recognition] Final transcript:', combined);
          finish(combined);
        }
      }, 2000);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        // Mic permission denied — can't proceed with speech, fallback
        finish('I could not answer verbally.');
      }
    };

    recognition.onend = () => {
      if (stopped) return;
      // If there's a transcript accumulated, finish
      if (finalTranscript.trim()) {
        finish(finalTranscript.trim());
        return;
      }
      // Otherwise restart if still listening
      if (recognitionRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognition.start();
    recognitionRef.current = recognition;

    // Fallback: max 45 seconds of listening, then auto-proceed
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
  }, [interviewState]);

  // File Handlers
  const isValidFile = (f: File) => {
    const types = ["application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    return types.includes(f.type) && f.size <= 10 * 1024 * 1024;
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && isValidFile(dropped)) {
        setFile(dropped);
        setResumeUrl(URL.createObjectURL(dropped));
        
        // Parse Resume Immediately for Preview
        const reader = new FileReader();
        reader.onload = async () => {
            if (typeof reader.result === 'string') {
                const base64File = reader.result.split(',')[1];
                try {
                     const parseRes = await fetch('/api/parse-resume', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fileData: base64File, fileName: dropped.name })
                    });
                    const { text: parsedResumeText } = await parseRes.json();
                    setResumeText(parsedResumeText);
                } catch (error) {
                    console.error("Parse error", error);
                }
            }
        };
        reader.readAsDataURL(dropped);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && isValidFile(selected)) {
        setFile(selected);
        setResumeUrl(URL.createObjectURL(selected));
        
        // Parse Resume Immediately for Preview
        const reader = new FileReader();
        reader.onload = async () => {
             if (typeof reader.result === 'string') {
                const base64File = reader.result.split(',')[1];
                try {
                     const parseRes = await fetch('/api/parse-resume', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fileData: base64File, fileName: selected.name })
                    });
                    const { text: parsedResumeText } = await parseRes.json();
                    setResumeText(parsedResumeText);
                } catch (error) {
                    console.error("Parse error", error);
                }
            }
        };
        reader.readAsDataURL(selected);
    }
  };

  const startInterview = async () => {
      if (!file) return;
      initAudio();

      setInterviewState('analyzing');
      setConversationPhase('intro');
      setConversationHistory([]);
      
      try {
            // Wait for resume parsing
            let currentResumeText = resumeText;
            if (!currentResumeText) {
                const reader = new FileReader();
                const base64Promise = new Promise<string>((resolve) => {
                    reader.onload = () => resolve((reader.result as string).split(',')[1]);
                    reader.readAsDataURL(file);
                });
                const base64File = await base64Promise;

                const parseRes = await fetch('/api/parse-resume', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileData: base64File, fileName: file.name })
                });
                const { text } = await parseRes.json();
                currentResumeText = text;
                setResumeText(text);
            }

            // Save interview state
            updateInterviewState({
                isActive: true,
                phase: 'oral',
                resumeText: currentResumeText,
                difficulty,
                jobType,
                jobRole,
                conversationHistory: []
            });

            // Start with greeting
            const greeting = `Hi! I'm your AI interviewer. Tell me a bit about yourself and your background in ${jobRole || 'technology'}.`;
            
            setInterviewState('interviewing');
            await playTTS(greeting);
            
            const initialHistory = [{ role: 'ai' as const, content: greeting }];
            setConversationHistory(initialHistory);
            
            setInterviewState('listening');

      } catch (error) {
          console.error("Interview Sequence Error:", error);
          setInterviewState('idle');
          alert("Failed to start interview. Please try again.");
      }
  };

  const handleUserResponseDone = async (transcript: string) => {
        setInterviewState('analyzing');
        
        try {
            // Add user response to conversation history
            const updatedHistory = [...conversationHistory, { role: 'user' as const, content: transcript }];
            setConversationHistory(updatedHistory);
            console.log(`[Interview] User (Phase: ${conversationPhase}):`, transcript);

            let nextPhase = conversationPhase;
            let aiResponse = '';
            let shouldMoveToCoding = false;

            // 1. INTRO PHASE: "Tell me about yourself"
            if (conversationPhase === 'intro') {
                const systemPrompt = `You are a friendly technical interviewer. The candidate just introduced themselves. 
Now ask about their project experience in exactly 1-2 sentences. Example: "That's nice! Have you done any projects with ${jobRole || 'web development'}?"`;

                const messages = [
                    { role: 'user', content: `Candidate said: "${transcript}"\n\nRespond naturally and ask about their projects.` },
                    { role: 'system', content: systemPrompt }
                ];

                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messages })
                });

                const { message } = await res.json();
                aiResponse = message;
                nextPhase = 'experience';
            }

            // 2. EXPERIENCE PHASE: Ask about projects
            else if (conversationPhase === 'experience') {
                const systemPrompt = `You are a technical interviewer. The candidate answered about their projects. 
Ask specifically what technologies/concepts they know about in their area of interest. Keep it to 1-2 sentences.
Example: "Okay, what sort of things do you know about front-end development? What frameworks or concepts?"`;

                const messages = [
                    { role: 'user', content: `Candidate about projects: "${transcript}"\n\nAsk about their technical knowledge.` },
                    { role: 'system', content: systemPrompt }
                ];

                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messages })
                });

                const { message } = await res.json();
                aiResponse = message;
                nextPhase = 'skills';
            }

            // 3. SKILLS PHASE: Ask about knowledge
            else if (conversationPhase === 'skills') {
                const systemPrompt = `You are a technical interviewer. The candidate described their knowledge. 
Now transition them to the coding challenge. Say something like:
"Okay, great! Now let's move to a coding challenge. You need to find a target value in a rotated sorted array. How would you approach this?"
Keep it natural and encouraging. Maximum 2 sentences.`;

                const messages = [
                    { role: 'user', content: `Candidate about skills: "${transcript}"\n\nTransition to coding challenge.` },
                    { role: 'system', content: systemPrompt }
                ];

                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messages })
                });

                const { message } = await res.json();
                aiResponse = message;
                nextPhase = 'coding';
                shouldMoveToCoding = true;

            // Set the coding challenge
            const codingProblem = {
                title: "Binary Search in a Rotated Sorted Array",
                difficulty: difficulty,
                description: "Given an integer array `nums` that is initially sorted in ascending order but has been rotated an unknown number of times, find whether a target value exists in the array. If it does, return its index; otherwise, return `-1`.\n\nThe array may contain duplicates, but you may assume there are no more than one occurrence of the target value.",
                samples: [
                    {
                        input: "nums = [4,5,6,7,0,1,2], target = 0",
                        output: "4",
                        explanation: "The array [4,5,6,7,0,1,2] is a rotated version of [0,1,2,4,5,6,7]. The target 0 is at index 4."
                    }
                ],
                constraints: [
                    "0 <= nums.length <= 5000",
                    "-10^4 <= nums[i], target <= 10^4",
                    "The target appears at most once."
                ],
                hints: [
                    "Think about how binary search works on a sorted array.",
                    "Even if rotated, at least one half of the array must be sorted."
                ]
            };

            const codingProblemStr = JSON.stringify(codingProblem);
            setCodingChallenge(codingProblemStr);
            localStorage.setItem('interview_problem', codingProblemStr);
            updateInterviewState({
                phase: 'coding',
                codingQuestion: codingProblemStr,
                conversationHistory: updatedHistory
            });
            }

            // Update conversation phase
            setConversationPhase(nextPhase);

            // Play AI response
            setInterviewState('interviewing');
            await playTTS(aiResponse);
            
            // Add AI response to history
            const finalHistory = [...updatedHistory, { role: 'ai' as const, content: aiResponse }];
            setConversationHistory(finalHistory);

            if (shouldMoveToCoding) {
                // Open editor in new tab with proper error handling
                try {
                    const editorWindow = window.open('/editor', '_blank');
                    if (!editorWindow) {
                        console.error('Editor window blocked by browser popup blocker');
                        alert('Please enable popups for this site to open the editor');
                    } else {
                        console.log('✅ Editor opened in new tab');
                    }
                } catch (e) {
                    console.error('Error opening editor:', e);
                    alert('Failed to open editor. Please try again.');
                }
                setInterviewState('listening');
            } else {
                setInterviewState('listening');
            }
            
        } catch (error) {
            console.error("Interview Sequence Error:", error);
            setInterviewState('idle'); 
            alert("An error occurred. Please try again.");
        }
  };

  return (
    <div className="flex min-h-screen bg-[#030303] text-white overflow-hidden font-sans selection:bg-cyan-500/30 justify-center items-center relative">
        
      {/* Hidden Audio Element */}
      <audio ref={audioRef} className="hidden" />

      {/* Resume Modal */}
      <AnimatePresence>
        {showResumeModal && resumeUrl && (
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                onClick={() => setShowResumeModal(false)}
            >
                <div className="bg-[#1a1a1a] w-full h-full max-w-6xl max-h-[90vh] rounded-2xl overflow-hidden relative border border-white/10 flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center p-4 border-b border-white/10 bg-[#141414]">
                        <h3 className="text-lg font-semibold text-white">Resume Preview</h3>
                        <button onClick={() => setShowResumeModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <X size={20} className="text-zinc-400" />
                        </button>
                    </div>
                    <div className="flex-1 w-full bg-white">
                        <iframe src={resumeUrl} className="w-full h-full" title="Resume Preview" />
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-900/10 blur-[120px]" />
      </div>

      {/* ─── Dashboard State ─── */}
      <AnimatePresence>
        {interviewState === 'idle' && (
            <motion.div 
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)", transition: { duration: 0.5 } }}
                className="w-full h-screen z-20 flex flex-col overflow-y-auto"
            >
                <div className="w-full max-w-7xl mx-auto p-6 md:p-12 flex flex-col min-h-full">
                    {/* Header */}
                    <header className="mb-10 text-center space-y-3">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-2">
                        Fill up detials for better Interview
                    </h1>
                    <p className="text-zinc-400 text-lg">
                        Master your next technical interview with AI-powered simulations.
                    </p>
                </header>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 w-full max-w-6xl mx-auto pb-32">
                    
                    {/* Upload Resume Card (Left, Large) */}
                    <div className="md:col-span-7 space-y-6 flex flex-col h-full">
                        <div className="iv-card-shade border border-white/10 rounded-3xl p-8 flex-1 flex flex-col relative overflow-hidden">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="iv-traffic-lights mb-0">
                                        <div className="iv-traffic-dot red" />
                                        <div className="iv-traffic-dot yellow" />
                                        <div className="iv-traffic-dot green" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-white">Upload Resume</h3>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-blue-900/20 flex items-center justify-center text-blue-500">
                                   {/* Icon Removed */}
                                </div>
                            </div>
                            
                            <div 
                                className={cn(
                                    "flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all duration-300 cursor-pointer min-h-[150px]",
                                    dragOver 
                                        ? "border-blue-500 bg-blue-500/5" 
                                        : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50"
                                )}
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleFileDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className={cn(
                                    "w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4 transition-transform duration-300",
                                    dragOver && "scale-110 border border-blue-500/50"
                                )}>
                                    <Upload size={28} className={cn("transition-colors", dragOver ? "text-blue-400" : "text-zinc-400")} />
                                </div>
                                <h3 className="text-lg font-medium text-zinc-300 mb-1">
                                    {dragOver ? "Drop it here!" : "Drag & drop your CV"}
                                </h3>
                                <p className="text-sm text-zinc-500">PDF or DOCX (Max 10MB)</p>
                                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileSelect} />
                            </div>
                        </div>

                         {/* Difficulty Level (In Column 1 Row 2) */}
                        <div className="iv-card-shade border border-white/10 rounded-3xl p-8 shrink-0 relative overflow-hidden">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="iv-traffic-lights mb-0">
                                    <div className="iv-traffic-dot red" />
                                    <div className="iv-traffic-dot yellow" />
                                    <div className="iv-traffic-dot green" />
                                </div>
                                <h3 className="font-semibold text-white">Difficulty Level</h3>
                            </div>
                            
                            <div className="flex gap-3">
                                {(['Easy', 'Medium', 'Hard'] as const).map((level) => (
                                    <button
                                        key={level}
                                        onClick={() => setDifficulty(level)}
                                        className={cn(
                                            "flex-1 py-4 rounded-xl border transition-all duration-300 font-medium iv-difficulty-btn",
                                            difficulty === level 
                                                ? (
                                                    level === 'Easy' ? "bg-green-900/40 border-green-500 text-green-400" :
                                                    level === 'Medium' ? "bg-yellow-900/40 border-yellow-500 text-yellow-400" :
                                                    "bg-red-900/40 border-red-500 text-red-400"
                                                )
                                                : "bg-zinc-900/30 border-zinc-800 text-zinc-500 hover:bg-zinc-900 hover:border-zinc-700"
                                        )}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-zinc-500 mt-4">
                                Adjust the AI's strictness and complexity of questions.
                            </p>
                        </div>
                    </div>

                   {/* Right Column Stack */}
                   <div className="md:col-span-5 space-y-6 flex flex-col h-full">
                        
                        {/* Resume Preview Card */}
                        <div className="iv-card-shade border border-white/10 rounded-3xl p-6 flex-[0.7] flex flex-col items-center text-center relative overflow-hidden min-h-[220px] group">
                             
                             <div className="flex items-center gap-2 mb-3 relative z-10 w-full justify-center text-zinc-500">
                                {/* Icon Removed */}
                                <h3 className="text-sm font-semibold uppercase tracking-widest">Resume Analysis</h3>
                             </div>

                             {file ? (
                                 resumeText ? (
                                    <div 
                                        ref={resumePreviewRef}
                                        onMouseMove={handleMouseMove}
                                        className="w-full flex-1 relative bg-zinc-900/50 rounded-xl border border-white/5 overflow-hidden group-hover:border-blue-500/30 transition-colors flex flex-col iv-resume-magnifier"
                                    >
                                        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent text-left relative z-10 iv-resume-content">
                                            <p className="text-[10px] text-zinc-400 whitespace-pre-wrap font-mono leading-relaxed transition-transform duration-300 origin-top-left group-hover:text-zinc-300">
                                                {resumeText}
                                            </p>
                                        </div>
                                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-0" />
                                    </div>
                                 ) : (
                                    <div className="flex-1 flex items-center justify-center">
                                         <div className="animate-pulse text-zinc-500 text-sm">Parsing content...</div>
                                    </div>
                                 )
                             ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 opacity-50">
                                    <p className="text-sm">Upload to analyze</p>
                                </div>
                             )}
                        </div>

                        {/* Job Preferences Card */}
                         <div className="iv-card-shade border border-white/10 rounded-3xl p-8 shrink-0 relative overflow-hidden">
                             <div className="flex items-center gap-3 mb-6">
                                <div className="iv-traffic-lights mb-0">
                                    <div className="iv-traffic-dot red" />
                                    <div className="iv-traffic-dot yellow" />
                                    <div className="iv-traffic-dot green" />
                                </div>
                                <h3 className="font-semibold text-white">Job Preferences</h3>
                             </div>

                             <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2 block">Job Type</label>
                                    <div className="flex gap-4 p-2">
                                        {(['Full-time', 'Internship'] as const).map((type) => (
                                            <label 
                                                key={type}
                                                className="flex items-center gap-2 cursor-pointer group"
                                            >
                                                <div 
                                                    onClick={() => setJobType(type)}
                                                    className={cn(
                                                        "w-5 h-5 rounded border flex items-center justify-center transition-all",
                                                        jobType === type 
                                                            ? "bg-blue-600 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                                                            : "border-zinc-700 bg-zinc-900 group-hover:border-zinc-500"
                                                    )}
                                                >
                                                    {jobType === type && <Check size={14} className="text-white" />}
                                                </div>
                                                <span className={cn(
                                                    "text-sm transition-colors",
                                                    jobType === type ? "text-white font-medium" : "text-zinc-500 group-hover:text-zinc-300"
                                                )}>
                                                    {type}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2 block">Desired Job Role</label>
                                    <input 
                                        type="text" 
                                        value={jobRole}
                                        onChange={(e) => setJobRole(e.target.value)}
                                        placeholder="e.g. Senior Frontend Developer"
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-600"
                                    />
                                </div>
                             </div>
                         </div>

                          {/* Random Fact / Pro Tip (Moved Below Job Prefs) */}
                         <div className="bg-blue-900/10 border border-blue-500/20 rounded-2xl p-6 flex items-start gap-4 shrink-0">
                             <div className="p-2 bg-blue-500/20 rounded-full text-blue-400 shrink-0">
                                <Info size={20} />
                             </div>
                             <div>
                                <h4 className="text-white font-semibold mb-1">Did you know?</h4>
                                <p className="text-sm text-blue-200/70 italic">
                                    {"The first computer bug was an actual moth found in the Mark II computer in 1947."}
                                </p>
                             </div>
                        </div>
                   </div>

                </div>
                </div>

                {/* Footer Action */}
                <div className="fixed bottom-8 left-0 right-0 flex justify-center z-50 pointer-events-none">
                    <div className="pointer-events-auto">
                        <Button
                            disabled={!file}

                            onClick={startInterview}
                            size="lg"
                            className={cn(
                                "px-12 py-8 text-lg font-bold rounded-full transition-all duration-300 shadow-2xl",
                                file 
                                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/30 hover:scale-105" 
                                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                            )}
                        >
                            START INTERVIEW <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Left Panel: AI Orb (Visible ONLY during active interview phases) ─── */}
      <AnimatePresence>
        { (interviewState !== 'idle' && interviewState !== 'uploading') && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                layout
                className="w-full h-screen bg-black/95 backdrop-blur-xl border-none fixed inset-0 z-40 flex flex-col justify-center items-center"
            >
                <div className="relative w-full h-full flex justify-center items-center">
                    <div className="aspect-square relative flex justify-center items-center max-h-[80vh] w-auto">
                        <VoicePoweredOrb
                            enableVoiceControl={interviewState === 'listening'}
                            externalAnalyser={analyser}
                            isSpeaking={isAiSpeaking}
                            className="w-full h-full"
                            maxHoverIntensity={1.5}
                        />
                    </div>
                </div>
                
                {/* Controls Overlay */}
                <div className="absolute bottom-12 z-30 flex gap-6 items-center flex-col">
                    {/* Listening State - no button, auto-detects when user stops speaking */}
                    {interviewState === 'listening' && (
                        <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <p className="text-zinc-400 text-sm tracking-widest uppercase">Listening... speak your answer</p>
                            <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-green-400 text-xs tracking-wide">Recording</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Status indicator */}
                <div className="absolute top-12 left-1/2 transform -translate-x-1/2 flex items-center gap-3 bg-black/40 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10 shadow-2xl z-30 transition-all duration-500 scale-110">
                    <div className={cn("w-2 h-2 rounded-full shadow-[0_0_10px_currentColor]", 
                        isAiSpeaking ? "bg-cyan-400 text-cyan-400 animate-pulse" : 
                        interviewState === 'listening' ? "bg-green-500 text-green-500 animate-pulse" :
                        "bg-zinc-600 text-zinc-600"
                    )} />
                    <span className={cn("text-xs font-bold tracking-widest uppercase",
                        isAiSpeaking ? "text-cyan-400" : 
                        interviewState === 'listening' ? "text-green-500" :
                        "text-zinc-500"
                    )}>
                    {isAiSpeaking ? "AI Interviewer Speaking" : 
                        interviewState === 'listening' ? "Listening" :
                        interviewState === 'analyzing' ? "Analyzing..." :
                        "Standby"}
                    </span>
                </div>
            </motion.div>
         )}
      </AnimatePresence>

    </div>
  );
}
