import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  GraduationCap, 
  Upload, 
  FileCheck2, 
  ArrowRight, 
  ArrowLeft, 
  Mic, 
  MicOff, 
  PhoneOff,
  Sparkles,
  Code
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Head from 'next/head';
import { useRouter } from 'next/router';

const STEPS = {
  TYPE: 0,
  RESUME: 1,
  DESCRIPTION: 2,
  INTERVIEW: 3
};

export default function Interview() {
  const createMessage = (role: 'user' | 'assistant', content: string, meta: Record<string, any> = {}) => ({
    role,
    content,
    createdAt: new Date().toISOString(),
    ...meta
  });

  const router = useRouter();
  const [step, setStep] = useState(STEPS.TYPE);
  const [direction, setDirection] = useState(1);
  const [interviewType, setInterviewType] = useState<string | null>(null);
  const [resumeLoaded, setResumeLoaded] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isCodeEditorActive, setIsCodeEditorActive] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState("Initializing AI Interviewer...");
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [codingEvents, setCodingEvents] = useState<any[]>([]);
  const [historicalSolvedTitles, setHistoricalSolvedTitles] = useState<string[]>([]);
  const [sessionSolvedTitles, setSessionSolvedTitles] = useState<string[]>([]);
  const [sessionAskedTitles, setSessionAskedTitles] = useState<string[]>([]);
  const [interviewState, setInterviewState] = useState<'idle' | 'listening' | 'analyzing' | 'speaking'>('idle');
  const recognitionRef = React.useRef<any>(null);
  const silenceTimerRef = React.useRef<any>(null);
  const currentAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const ttsAbortControllerRef = React.useRef<AbortController | null>(null);
  const ttsRequestIdRef = React.useRef(0);
  const ttsWatchdogRef = React.useRef<any>(null);
  const manualRecognitionStopRef = React.useRef(false);
  
  // New States for Timer & Code Editor
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [showCodeEditorButton, setShowCodeEditorButton] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === STEPS.INTERVIEW && timerActive) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timerActive]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const stopActiveTts = () => {
    if (ttsAbortControllerRef.current) {
      ttsAbortControllerRef.current.abort();
      ttsAbortControllerRef.current = null;
    }
    if (ttsWatchdogRef.current) {
      clearTimeout(ttsWatchdogRef.current);
      ttsWatchdogRef.current = null;
    }
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current.src = '';
      } catch {}
      currentAudioRef.current = null;
    }
  };

  const handleOpenCodeEditor = () => {
    setIsCodeEditorActive(true);
    setInterviewState('idle');
    stopActiveTts();
    window.open('/editor', '_blank');
  };

  const speakText = async (text: string) => {
    ttsRequestIdRef.current += 1;
    const requestId = ttsRequestIdRef.current;
    setInterviewState('speaking');

    if (ttsAbortControllerRef.current) {
      ttsAbortControllerRef.current.abort();
      ttsAbortControllerRef.current = null;
    }

    if (ttsWatchdogRef.current) clearTimeout(ttsWatchdogRef.current);
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current.src = '';
      } catch {}
      currentAudioRef.current = null;
    }

    const safelyReturnToListening = () => {
      if (requestId !== ttsRequestIdRef.current) return;
      if (ttsWatchdogRef.current) clearTimeout(ttsWatchdogRef.current);
      ttsWatchdogRef.current = null;
      setInterviewState('listening');
    };

    const controller = new AbortController();
    ttsAbortControllerRef.current = controller;

    // Keep spoken payload bounded to avoid backend TTS timeouts on very long replies.
    const ttsText = text.length > 1200 ? `${text.slice(0, 1200).trim()}...` : text;

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: ttsText, voice: 'en-US-JennyNeural' }),
        signal: controller.signal
      });

      if (requestId !== ttsRequestIdRef.current) return;

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;

        audio.onplay = () => {
          if (requestId !== ttsRequestIdRef.current) return;
          setCurrentQuestion(text); // Sync text with audio playback
        };
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          safelyReturnToListening();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          safelyReturnToListening();
        };
        audio.onabort = () => {
          URL.revokeObjectURL(audioUrl);
          safelyReturnToListening();
        };
        audio.onstalled = safelyReturnToListening;

        // Safety net: ensure mic recovers even if browser audio events fail.
        ttsWatchdogRef.current = setTimeout(() => {
          safelyReturnToListening();
        }, 20000);

        try {
          await audio.play();
        } catch (playError) {
          console.warn('Audio autoplay blocked or failed:', playError);
          safelyReturnToListening();
        }
      } else {
        setCurrentQuestion(text);
        safelyReturnToListening();
      }
    } catch (error) {
      if ((error as any)?.name === 'AbortError') {
        return;
      }
      console.error("TTS playback error", error);
      setCurrentQuestion(text);
      safelyReturnToListening();
    } finally {
      if (ttsAbortControllerRef.current === controller) {
        ttsAbortControllerRef.current = null;
      }
    }
  };

  const handleAiInteraction = async (transcript: string = "", options: { forceSpeak?: boolean } = {}) => {
    let updatedHistory = transcript
      ? [...conversationHistory, createMessage('user', transcript)]
      : conversationHistory;
      
    // If it's the very first interaction and no transcript, inject a secret start prompt
    if (!transcript && updatedHistory.length === 0) {
      updatedHistory = [createMessage('user', "Hi! I am ready to start the interview. Let's begin.", { eventType: 'session_start' })];
    }

    try {
      setInterviewState('analyzing');
      setConversationHistory(updatedHistory);

      let systemPrompt = `Role: You are a Senior Technical Interviewer at a Tier-1 Tech Company. Your goal is to conduct a high-pressure, realistic technical interview.

Interview Protocol (Strictly follow this order):
Phase 1: The Hook. Ask the candidate what their strongest technical stack or domain is (e.g., Python, ML, Backend). *If the candidate explicitly states they are good at DSA or want a DSA question, skip immediately to Phase 5*.
Phase 2: Deep Dive. Based on their answer, ask 2-3 "under the hood" questions. If they say "Python," ask about Global Interpreter Lock or Memory Management.
Phase 3: The Build. Ask the candidate to explain a complex project they have built.
Phase 4: The Stress Test. Based on that project, identify a potential bottleneck (e.g., "How would this scale to 1 million users?") and ask them to solve it.
Phase 5: The DSA Challenge. Provide a coding problem (LeetCode Medium/Hard style) related to their stack. 
When providing the DSA question, format it EXACTLY like this:
Title: [Problem Name]
Difficulty: [Medium/Hard]
Description: [Clear problem description]
Constraints: [List of constraints]
Sample Input: [Input]
Sample Output: [Output]

Rules of Conduct:
- ONE question at a time. NEVER ask two questions in one message.
- Be cold but professional. Do not say "Great job!" or "That's correct." Simply move to the next level of depth or provide a subtle hint if they are stuck.
- No code solutions. If the candidate asks for the answer, give a conceptual hint only.
- Response Format: Start every response with [PHASE X/5] so the candidate knows where they stand.
- Briefly judge/score the user's previous response internally before asking the next question, but focus the outward message on the next question or brief critique.
- During Phase 5, tell the user: "Please click the 'Open Code Editor' button to write your solution."
- Submission policy:
  - If user message includes ATTEMPT_VERDICT: not_sure, first say: "Looks like you are not sure about this one. Let's move to the next question." Then ask a new DSA question.
  - If user message includes ATTEMPT_VERDICT: near_answer, ask 1-2 focused follow-up questions about approach and edge cases before moving on.
  - If user message includes ATTEMPT_VERDICT: solved, ask one short complexity/tradeoff follow-up and then ask a new DSA question.
  - Never repeat any question title listed in Solved Questions History.
  - Never repeat any question title listed in Already Asked This Session.`;

      const solvedTitles = [...historicalSolvedTitles, ...sessionSolvedTitles];
      if (solvedTitles.length > 0) {
        systemPrompt += `\nSolved Questions History (do not repeat): ${solvedTitles.join(', ')}`;
      }

      if (sessionAskedTitles.length > 0) {
        systemPrompt += `\nAlready Asked This Session (avoid repeating): ${sessionAskedTitles.join(', ')}`;
      }

      if (jobDescription) {
        systemPrompt += `\nThe candidate is applying for a role with these requirements: ${jobDescription}.`;
      }
      
      if (resumeText) {
        systemPrompt += `\nHere is the extracted text from the candidate's resume: "${resumeText.substring(0, 1500)}...". Incorporate this into Phase 3 and Phase 4.`;
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'system', content: systemPrompt }, ...updatedHistory]
        })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch reply from AI');
      }

      // Hide the [PHASE X/5] from being spoken or shown on screen by stripping it out
      let reply = (data.reply || data.message || "Error generating response.")
        .replace(/[\*\`]/g, '')
        .replace(/\[PHASE \d\/\d\]:?\s*/ig, '')
        .trim();

      const askedTitleMatch = reply.match(/Title:\s*(.+)/i);
      if (askedTitleMatch) {
        const title = askedTitleMatch[1].trim();
        if (title) {
          setSessionAskedTitles((prev) => prev.includes(title) ? prev : [...prev, title]);
        }
      }

      setConversationHistory([...updatedHistory, createMessage('assistant', reply)]);
      
      const replyLower = reply.toLowerCase();
      
      let spokenReply = reply;
      let displayReply = reply;

      if (replyLower.includes('code') || replyLower.includes('logic') || replyLower.includes('title:') || replyLower.includes('description:')) {
        setShowCodeEditorButton(true);

        const titleMatch = reply.match(/Title:\s*(.+)/i);
        const diffMatch = reply.match(/Difficulty:\s*(.+)/i);
        const descMatch = reply.match(/Description:\s*([\s\S]+?)(?=Constraints:|Sample Input:|$)/i);
        const consMatch = reply.match(/Constraints:\s*([\s\S]+?)(?=Sample Input:|$)/i);

        if (titleMatch && descMatch) {
            const parsedTitle = titleMatch[1].trim();
            const parsedDesc = descMatch[1].trim();
            const parsedDiff = diffMatch ? diffMatch[1].trim() : 'Medium';
            const parsedCons = consMatch ? consMatch[1].trim().split('\n').map(s=>s.replace(/^- /, '').trim()).filter(Boolean) : [];
            
            const examples = [];
            const inputRegex = /Sample Input:\s*([\s\S]+?)(?=Sample Output:)/ig;
            const outputRegex = /Sample Output:\s*([\s\S]+?)(?=Sample Input:|Title:|\[PHASE|$)/ig;
            
            let inputExec, outputExec;
            while ((inputExec = inputRegex.exec(reply)) && (outputExec = outputRegex.exec(reply))) {
                examples.push({
                   input: inputExec[1].trim(),
                   output: outputExec[1].trim(),
                   explanation: ""
                });
            }

            const problemData = {
               question: parsedTitle,
               difficulty: parsedDiff,
               description: parsedDesc,
               constraints: parsedCons,
               examples: examples.length > 0 ? examples : [{input: "See description", output: "See description", explanation: ""}],
               category: "DSA"
            };

            localStorage.setItem('interview_dsa_question', JSON.stringify(problemData));
            
            // Scrub the actual question details from the TTS/UI text
            const replacementText = "I have assigned a coding challenge. Please open the code editor using the button below and solve the question.";
            
            // Regex to remove everything from 'Title:' to the end (or up to a certain point)
            spokenReply = reply.replace(/Title:\s*[\s\S]+?/i, replacementText);
            // Since Title is usually at the start of the block, we can just replace everything from "Title:" onwards.
            // If the AI put pleasantries before "Title:", they will be preserved!
            let replaceRegex = /Title:[\s\S]+/i;
            spokenReply = reply.replace(replaceRegex, replacementText);
            displayReply = spokenReply;
        }
      } else {
        setShowCodeEditorButton(false);
      }

      const shouldSpeak = !isMuted && (options.forceSpeak || !isCodeEditorActive);
      if (shouldSpeak) {
        setCurrentQuestion("..."); // Indicate preparing audio
        speakText(spokenReply);
      } else {
        setCurrentQuestion(displayReply);
        setInterviewState(isCodeEditorActive ? 'idle' : 'listening');
      }

    } catch (err: any) {
      console.error("Chat API error:", err);
      const errorMsg = err.message || "I'm having trouble connecting to my brain. Please check the model server.";
      setConversationHistory([...updatedHistory, createMessage('assistant', errorMsg, { eventType: 'error' })]);
      setCurrentQuestion(errorMsg);
      if (!isMuted && (options.forceSpeak || !isCodeEditorActive)) speakText(errorMsg);
      else setInterviewState(isCodeEditorActive ? 'idle' : 'listening');
    }
  };

  useEffect(() => {
    if (step === STEPS.INTERVIEW && conversationHistory.length === 0 && interviewState === 'idle') {
      setTimerActive(true);
      handleAiInteraction("");
    } else if (step !== STEPS.INTERVIEW) {
      setTimerActive(false);
    }
  }, [step]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'interview_dsa_submission' && e.newValue) {
        const submission = JSON.parse(e.newValue);
        localStorage.removeItem('interview_dsa_submission'); // Clean up
        setIsCodeEditorActive(false);
        
        setShowCodeEditorButton(false);

        const submittedCode = (submission.code || '').trim();
        const outputLines = Array.isArray(submission.output) ? submission.output : [];
        const runStatus = submission?.assessment?.status || 'not-run';
        const questionTitle = submission?.questionTitle || 'Unknown Problem';

        const emptyOrVeryShort = !submittedCode || submittedCode.length < 20;

        let verdict: 'not_sure' | 'near_answer' | 'solved' = 'not_sure';
        if (emptyOrVeryShort) {
          verdict = 'not_sure';
        } else if (runStatus === 'accepted') {
          verdict = 'solved';
        } else if (runStatus === 'wrong-answer') {
          verdict = 'near_answer';
        } else {
          verdict = 'not_sure';
        }

        if (verdict === 'solved') {
          setSessionSolvedTitles((prev) => prev.includes(questionTitle) ? prev : [...prev, questionTitle]);
        }

        setCodingEvents((prev) => [
          ...prev,
          {
            type: 'coding_submission',
            questionTitle,
            verdict,
            runStatus,
            language: submission.language,
            codeLength: submittedCode.length,
            output: outputLines,
            createdAt: new Date().toISOString()
          }
        ]);

        const codeMessage = `I have submitted my solution to the coding problem.\nATTEMPT_VERDICT: ${verdict}\nQUESTION_TITLE: ${questionTitle}\nRUN_STATUS: ${runStatus}\n\nMy Code:\n\`\`\`${submission.language}\n${submission.code}\n\`\`\`\n\nTerminal Output:\n${outputLines.join('\n')}\n\nPlease review my code, evaluate my logic, and continue the interview flow.`;

        handleAiInteraction(codeMessage, { forceSpeak: true });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [conversationHistory, interviewState]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const loadSolvedHistory = async () => {
      try {
        const res = await fetch('/api/interviews/history', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!res.ok) return;

        const interviews = await res.json();
        const solvedTitles = new Set<string>();

        for (const interview of interviews || []) {
          const events = Array.isArray(interview?.codingEvents) ? interview.codingEvents : [];
          for (const event of events) {
            if (event?.verdict === 'solved' && event?.questionTitle) {
              solvedTitles.add(event.questionTitle);
            }
          }
        }

        setHistoricalSolvedTitles(Array.from(solvedTitles));
      } catch (error) {
        console.error('Failed to load solved history:', error);
      }
    };

    loadSolvedHistory();
  }, []);
  
  useEffect(() => {
    if (interviewState !== 'listening' || isMuted) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    let recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    let finalTranscript = '';
    
    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + ' ';
        else interimTranscript += event.results[i][0].transcript;
      }

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        const combined = (finalTranscript + ' ' + interimTranscript).trim();
        if (combined) {
          manualRecognitionStopRef.current = true;
          try { recognition.stop(); } catch {}
          recognitionRef.current = null;
          handleAiInteraction(combined);
        }
      }, 3000); // 3 seconds silence
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
      if (event.error === 'not-allowed') {
        // Handling mic blocking
        setInterviewState('idle');
      }
    };

    // Auto-restart recognition if it unexpectedly ends while we're still 'listening'
    recognition.onend = () => {
      if (manualRecognitionStopRef.current) {
        manualRecognitionStopRef.current = false;
        return;
      }

      if (interviewState === 'listening' && !isMuted && recognitionRef.current === recognition) {
        try {
          recognition.start();
        } catch (e) {}
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.error("Could not start recognition:", e);
    }

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      manualRecognitionStopRef.current = true;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
    };
  }, [interviewState, isMuted]);

  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (ttsWatchdogRef.current) clearTimeout(ttsWatchdogRef.current);
      if (ttsAbortControllerRef.current) {
        ttsAbortControllerRef.current.abort();
        ttsAbortControllerRef.current = null;
      }
      if (currentAudioRef.current) {
        try {
          currentAudioRef.current.pause();
          currentAudioRef.current.currentTime = 0;
          currentAudioRef.current.src = '';
        } catch {}
        currentAudioRef.current = null;
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
    };
  }, []);

  const handleNext = () => {
    if (step < STEPS.INTERVIEW) {
      setDirection(1);
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > STEPS.TYPE) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    if (step < STEPS.INTERVIEW) {
      setDirection(1);
      setStep(step + 1);
    }
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 40 : -40,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -40 : 40,
      opacity: 0,
    })
  };

  const renderInterviewType = () => (
    <div className="flex flex-col h-full py-4 sm:py-6">
      <div className="mb-8 sm:mb-10 text-center sm:text-left">
        <h2 className="text-2xl sm:text-3xl font-medium text-[#202124] mb-3 tracking-tight">What's your goal today?</h2>
        <p className="text-[#5f6368] text-base sm:text-lg">Choose the type of interview you want to simulate.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 mt-2 sm:mt-4">
        <button
          onClick={() => setInterviewType('internship')}
          className={`google-option-card rounded-2xl p-6 sm:p-8 flex flex-col items-start text-left gap-4 sm:gap-5 cursor-pointer
            ${interviewType === 'internship' ? 'selected' : ''}`}
        >
          <div className={`p-2.5 rounded-full ${interviewType === 'internship' ? 'bg-[#1a73e8] text-white' : 'bg-[#f1f3f4] text-[#5f6368]'}`}>
            <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2} />
          </div>
          <div>
            <h3 className={`text-lg sm:text-xl font-medium mb-1 ${interviewType === 'internship' ? 'text-[#1a73e8]' : 'text-[#202124]'}`}>
              Internship Role
            </h3>
            <p className="text-[#5f6368] text-sm leading-relaxed">
              Focuses on foundational skills, academic projects, and behavioral questions suited for students.
            </p>
          </div>
        </button>

        <button
          onClick={() => setInterviewType('job')}
          className={`google-option-card rounded-2xl p-6 sm:p-8 flex flex-col items-start text-left gap-4 sm:gap-5 cursor-pointer
            ${interviewType === 'job' ? 'selected' : ''}`}
        >
          <div className={`p-2.5 rounded-full ${interviewType === 'job' ? 'bg-[#1a73e8] text-white' : 'bg-[#f1f3f4] text-[#5f6368]'}`}>
            <Building2 className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2} />
          </div>
          <div>
            <h3 className={`text-lg sm:text-xl font-medium mb-1 ${interviewType === 'job' ? 'text-[#1a73e8]' : 'text-[#202124]'}`}>
              Professional Job
            </h3>
            <p className="text-[#5f6368] text-sm leading-relaxed">
              In-depth domain knowledge, past experience, and complex scenario-based questions.
            </p>
          </div>
        </button>
      </div>
    </div>
  );

  const renderResumeUpload = () => (
    <div className="flex flex-col h-full py-4 sm:py-6">
      <div className="mb-6 sm:mb-8 text-center sm:text-left shrink-0">
        <h2 className="text-2xl sm:text-3xl font-medium text-[#202124] mb-3 tracking-tight">Upload your resume</h2>
        <p className="text-[#5f6368] text-base sm:text-lg">Help the AI tailor the questions to your specific experience.</p>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".pdf,.docx,.txt"
        onChange={async (e) => {
          if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setIsParsingResume(true);
            
            try {
              const reader = new FileReader();
              reader.onload = async (event) => {
                const base64Data = (event.target?.result as string).split(',')[1];
                const res = await fetch('/api/parse-resume', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ fileData: base64Data, fileName: file.name })
                });
                
                const data = await res.json();
                if (res.ok && data.text) {
                  setResumeText(data.text);
                  setResumeLoaded(true);
                } else {
                  console.error("Failed to parse resume", data);
                  setResumeLoaded(true); // Fallback to loaded state anyway
                }
                setIsParsingResume(false);
              };
              reader.readAsDataURL(file);
            } catch (err) {
              console.error("File read error:", err);
              setIsParsingResume(false);
            }
          }
        }}
      />

      <div 
        className={`google-file-drop rounded-2xl p-8 sm:p-14 flex flex-col items-center justify-center cursor-pointer min-h-[320px] mb-4 sm:mb-6
          ${resumeLoaded || isParsingResume ? 'active' : ''}`}
        onClick={() => !resumeLoaded && !isParsingResume && fileInputRef.current?.click()}
      >
        <div className="mb-4 sm:mb-6">
          {isParsingResume ? (
             <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-50 rounded-full flex items-center justify-center text-[#1a73e8] animate-spin">
               <Upload size={36} />
             </div>
          ) : resumeLoaded ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600"
            >
              <FileCheck2 size={36} />
            </motion.div>
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-50 rounded-full flex items-center justify-center text-[#1a73e8]">
              <Upload size={36} />
            </div>
          )}
        </div>
        
        <h3 className="text-lg sm:text-xl font-medium text-[#202124] mb-2 text-center">
          {isParsingResume ? 'Parsing resume...' : resumeLoaded ? 'Resume attached successfully' : 'Select a file to upload'}
        </h3>
        <p className="text-[#5f6368] text-center max-w-sm text-sm sm:text-base">
          {isParsingResume 
            ? 'Extracting details to personalize your interview.'
            : resumeLoaded 
            ? 'We extracted your experience, skills, and education.' 
            : 'Drag and drop your PDF or DOCX file here, or click to browse.'}
        </p>
        
        {!resumeLoaded && !isParsingResume && (
          <div className="mt-6 sm:mt-8 px-5 py-2 sm:px-6 sm:py-2.5 border border-[#dadce0] text-[#1a73e8] rounded-full font-medium hover:bg-[#f8f9fa] transition-colors text-sm sm:text-base">
            Browse files
          </div>
        )}
      </div>
    </div>
  );

  const renderJobDescription = () => (
    <div className="flex flex-col h-full py-6">
      <div className="mb-10 text-center sm:text-left">
        <h2 className="text-3xl font-medium text-[#202124] mb-3 tracking-tight">Job Description</h2>
        <p className="text-[#5f6368] text-lg">What specific role are you interviewing for?</p>
      </div>

      <div className="w-full flex-1 flex flex-col">
        <div className="relative flex-1">
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description or required skills here..."
            className="google-textarea w-full h-full min-h-[240px] p-6 rounded-2xl resize-none text-lg"
          />
        </div>
        <div className="mt-4 flex justify-between items-center text-sm text-[#5f6368]">
          <span className="flex items-center gap-1">
            <Sparkles size={16} className="text-[#1a73e8]"/> 
            Improves AI relevance
          </span>
          <span>{jobDescription.length} chars</span>
        </div>
      </div>
    </div>
  );

  const handleEndCall = async () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    
    // Stop timers & logic
    setInterviewState('idle');
    setTimerActive(false);

    try {
      // Step 1: Request Evaluation
      const evalRes = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: conversationHistory,
          type: interviewType,
          difficulty: 'Medium'
        })
      });
      const evalData = await evalRes.json();

      // Step 2: Save to Database
      const token = localStorage.getItem('authToken');
      const payload = {
        type: interviewType,
        difficulty: 'Medium',
        duration: `${Math.floor(timer / 60)} min`,
        readinessScore: evalData.readinessScore || 70,
        vocabularyScore: evalData.vocabularyScore || 7,
        communicationScore: evalData.communicationScore || 75,
        technicalScore: evalData.technicalScore || 65,
        confidenceScore: evalData.confidenceScore || 70,
        logicScore: evalData.logicScore || 68,
        rating: evalData.rating || 'Good',
        feedback: evalData.feedback || 'Good effort, but try to be more specific.',
        transcript: conversationHistory,
        codingEvents,
        startedAt: conversationHistory[0]?.createdAt || null,
        endedAt: new Date().toISOString()
      };

      if (token) {
        await fetch('/api/interview/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }
      
      router.push('/dashboard');
    } catch (err) {
      console.error("Error saving interview:", err);
      router.push('/dashboard'); // fallback to dashboard if save fails
    }
  };

  const renderAiOrb = () => (
    <div className="flex flex-col items-center h-full min-h-[560px] py-8 sm:py-10">
      
      {/* Session Timer & Indicator */}
      <div className="mb-5 sm:mb-6 flex flex-col items-center gap-3">
        <div className="google-equalizer">
          <div className="eq-dot"></div>
          <div className="eq-dot"></div>
          <div className="eq-dot"></div>
          <div className="eq-dot"></div>
        </div>
        <div className="flex items-center gap-2 bg-[#f1f3f4] text-[#5f6368] px-3 py-1.5 rounded-full text-xs font-medium tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
          {formatTime(timer)}
        </div>
      </div>

      {/* Fluid AI Orb */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="ai-orb-wrapper my-4 sm:my-8"
      >
        <div className="orb-layer"></div>
        <div className="orb-layer"></div>
        <div className="orb-layer"></div>
        <div className="orb-core-glow"></div>
      </motion.div>

      {/* Elegant Subtitles */}
      <div className="min-h-[96px] flex flex-col items-center justify-center px-4 sm:px-6 text-center w-full max-w-2xl mt-2 gap-4">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentQuestion}
            initial={{ opacity: 0, filter: "blur(10px)", y: 10 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            exit={{ opacity: 0, filter: "blur(10px)", y: -10 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            className="ai-subtitle text-2xl sm:text-3xl"
          >
            {currentQuestion}
          </motion.p>
        </AnimatePresence>

        {showCodeEditorButton && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleOpenCodeEditor}
            className="mt-4 flex items-center gap-2 px-6 py-3 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full font-medium shadow-md transition-all"
          >
            <Code size={18} />
            Open Code Editor
          </motion.button>
        )}
      </div>

      {/* Floating Call Controls */}
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-auto pt-6 sm:pt-8 flex items-center gap-4 bg-white/80 backdrop-blur-xl border border-white/40 p-3 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
      >
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className={`p-4 rounded-full transition-all duration-300 ${isMuted ? 'bg-[#f1f3f4] text-[#5f6368]' : 'bg-white text-[#202124] hover:bg-[#f8f9fa] shadow-sm'}`}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
        <button 
          onClick={handleEndCall}
          className="p-4 bg-[#ea4335] hover:bg-[#d93025] text-white rounded-full shadow-md transition-colors"
          title="End Call"
        >
          <PhoneOff size={24} />
        </button>
      </motion.div>
    </div>
  );

  return (
    <div className="h-screen w-full relative overflow-y-auto overflow-x-hidden">
      <Head>
        <title>Mock Interview - udyogaprep</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      {/* Premium Ambient Background */}
      <div className="ambient-bg-premium fixed inset-0 z-0 pointer-events-none"></div>

      {/* Main Container */}
      <div className="glass-card-premium w-full max-w-[840px] rounded-[32px] flex flex-col relative z-10 p-6 sm:p-14 mx-auto my-6 sm:my-10 shadow-2xl">
        
        {/* Progress Stepper (Google style) */}
        {step !== STEPS.INTERVIEW && (
          <div className="flex items-center justify-between mb-8 px-2">
            {[STEPS.TYPE, STEPS.RESUME, STEPS.DESCRIPTION].map((s) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-500 ${step >= s ? 'bg-[#1a73e8]' : 'bg-[#dadce0]'}`} />
                {s !== STEPS.DESCRIPTION && (
                  <div className={`h-[2px] flex-1 mx-2 transition-colors duration-500 ${step > s ? 'bg-[#1a73e8]' : 'bg-[#dadce0]'}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Content Area with Slide Animation */}
        <div className="w-full flex flex-col justify-center min-h-[400px]">
          <AnimatePresence custom={direction} mode="wait" initial={false}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="w-full flex flex-col"
            >
              {step === STEPS.TYPE && renderInterviewType()}
              {step === STEPS.RESUME && renderResumeUpload()}
              {step === STEPS.DESCRIPTION && renderJobDescription()}
              {step === STEPS.INTERVIEW && renderAiOrb()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Google-style Navigation Footer */}
        {step !== STEPS.INTERVIEW && (
          <div className="mt-8 pt-6 border-t border-[#f1f3f4] flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 z-20 shrink-0">
            <button
              onClick={handleBack}
              disabled={step === STEPS.TYPE}
              className="btn-secondary flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm sm:text-base order-2 sm:order-1 flex-1 sm:flex-initial"
            >
              <ArrowLeft size={18} />
              Back
            </button>

            <div className="flex items-center gap-2 sm:gap-4 order-1 sm:order-2 w-full sm:w-auto">
              <button
                onClick={handleSkip}
                className="btn-secondary flex-1 sm:flex-initial px-6 py-3 rounded-full font-medium text-sm sm:text-base border border-[#dadce0] hover:bg-[#f8f9fa]"
              >
                Skip
              </button>

              <button
                onClick={handleNext}
                disabled={step === STEPS.TYPE && !interviewType}
                className="btn-primary flex-1 sm:flex-initial flex items-center justify-center gap-2 px-10 py-3.5 rounded-full font-medium text-sm sm:text-base bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-lg transition-all"
              >
                {step === STEPS.DESCRIPTION ? 'Start session' : 'Continue'}
                {step !== STEPS.DESCRIPTION && <ArrowRight size={18} />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
