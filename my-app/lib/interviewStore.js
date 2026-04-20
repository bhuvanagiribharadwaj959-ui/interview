// ══════════════════════════════════════════════════════════════
//  Interview State Store — localStorage + cross-tab sync
// ══════════════════════════════════════════════════════════════

const STORE_KEY = 'interview_state';

/**
 * State shape:
 * {
 *   isActive: boolean,
 *   phase: 'oral' | 'coding',
 *   resumeText: string,
 *   resumeAnalysis: { skills, domains, languages, level, highlights },
 *   messages: [{ role, content }],
 *   questions: [{ question, answer, type, startTime, endTime, wordCount }],
 *   currentQuestionIndex: number,
 *   totalOralQuestions: number,
 *   totalCodingQuestions: number,
 *   codingLanguage: string,
 *   codingQuestion: string,       // current coding question for editor
 *   codingCode: string,           // current code in editor
 *   scores: { vocabulary, coding, logic },
 *   startTime: number,
 *   endTime: number,
 * }
 */

export function getInterviewState() {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(STORE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function setInterviewState(state) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent('interviewStateChange', { detail: state }));
}

export function updateInterviewState(updates) {
  const current = getInterviewState() || {};
  const newState = { ...current, ...updates };
  setInterviewState(newState);
  return newState;
}

export function clearInterviewState() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORE_KEY);
  window.dispatchEvent(new CustomEvent('interviewStateChange', { detail: null }));
}

export function onInterviewStateChange(callback) {
  if (typeof window === 'undefined') return () => {};

  const customHandler = (e) => callback(e.detail);
  window.addEventListener('interviewStateChange', customHandler);

  // Cross-tab sync via storage events
  const storageHandler = (e) => {
    if (e.key === STORE_KEY) {
      try {
        callback(e.newValue ? JSON.parse(e.newValue) : null);
      } catch { /* ignore */ }
    }
  };
  window.addEventListener('storage', storageHandler);

  return () => {
    window.removeEventListener('interviewStateChange', customHandler);
    window.removeEventListener('storage', storageHandler);
  };
}

// ── TTS helper — uses app TTS API, falls back to browser ──
export async function speakWithTtsEngine(text, onEnd) {
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) throw new Error(`TTS ${res.status}`);

    const blob = await res.blob();
    if (blob.size === 0) throw new Error('Empty audio');

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    audio.onended = () => { URL.revokeObjectURL(url); onEnd?.(); };
    audio.onerror = () => { URL.revokeObjectURL(url); onEnd?.(); };

    await audio.play();
    return audio;
  } catch (err) {
    console.warn('Server TTS failed, using browser fallback:', err.message);
    // Fallback to browser speechSynthesis
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.95;
      utter.pitch = 1;
      utter.onend = () => onEnd?.();
      utter.onerror = () => onEnd?.();
      window.speechSynthesis.speak(utter);
    } else {
      onEnd?.();
    }
    return null;
  }
}

// Backward-compatible alias for older imports.
export const speakWithElevenLabs = speakWithTtsEngine;
