import React, { useState, useEffect, useRef } from 'react';
import { Play, Terminal as TerminalIcon, ChevronDown, CloudUpload, Check, Moon, Sun } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";

const FALLBACK_PROBLEM = {
  question: 'Valid Parentheses',
  difficulty: 'Easy',
  category: 'DSA',
  description:
    'Given a string s containing just the characters (), {}, and [], determine if the input string is valid. An input string is valid if open brackets are closed by the same type of brackets and in the correct order.',
  constraints: [
    '1 <= s.length <= 10^4',
    's consists of parentheses only: (), {}, and []'
  ],
  examples: [
    {
      input: 's = "()[]{}"',
      output: 'true',
      explanation: 'Every opening bracket has a matching closing bracket in the correct order.'
    },
    {
      input: 's = "(]"',
      output: 'false',
      explanation: 'The closing bracket does not match the most recent opening bracket.'
    }
  ]
};

const LANGUAGE_OPTIONS = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'rust', label: 'Rust' },
  { value: 'swift', label: 'Swift' }
];

const LANGUAGE_TEMPLATES: Record<string, { label: string; prism: string; code: string; previewCommand: string; previewOutput: string[] }> = {
  javascript: {
    label: 'JavaScript',
    prism: 'javascript',
    code: `console.log("ALL the best");
`,
    previewCommand: 'console.log("ALL the best");',
    previewOutput: ['ALL the best', 'Execution completed successfully.']
  },
  python: {
    label: 'Python',
    prism: 'python',
    code: `print("ALL the best")
`,
    previewCommand: 'print("ALL the best")',
    previewOutput: ['ALL the best', 'Execution completed successfully.']
  },
  java: {
    label: 'Java',
    prism: 'java',
    code: `public class Main {
    public static void main(String[] args) {
        System.out.println("ALL the best");
    }
}
`,
  previewCommand: 'javac Main.java && java Main',
    previewOutput: ['ALL the best', 'Execution completed successfully.']
  },
  cpp: {
    label: 'C++',
    prism: 'cpp',
    code: `#include <iostream>
using namespace std;

int main() {
    cout << "ALL the best" << endl;
    return 0;
}
`,
    previewCommand: 'g++ main.cpp && ./a.out',
    previewOutput: ['ALL the best', 'Execution completed successfully.']
  },
  csharp: {
    label: 'C#',
    prism: 'csharp',
    code: `using System;

public class Program {
    public static void Main() {
        Console.WriteLine("ALL the best");
    }
}
`,
    previewCommand: 'dotnet run',
    previewOutput: ['ALL the best', 'Execution completed successfully.']
  },
  go: {
    label: 'Go',
    prism: 'go',
    code: `package main

import "fmt"

func main() {
    fmt.Println("ALL the best")
}
`,
    previewCommand: 'go run main.go',
    previewOutput: ['ALL the best', 'Execution completed successfully.']
  },
  php: {
    label: 'PHP',
    prism: 'php',
    code: `<?php
echo "ALL the best";
?>
`,
    previewCommand: 'php main.php',
    previewOutput: ['ALL the best', 'Execution completed successfully.']
  },
  ruby: {
    label: 'Ruby',
    prism: 'ruby',
    code: `puts "ALL the best"
`,
    previewCommand: 'ruby main.rb',
    previewOutput: ['ALL the best', 'Execution completed successfully.']
  },
  rust: {
    label: 'Rust',
    prism: 'rust',
    code: `fn main() {
    println!("ALL the best");
}
`,
    previewCommand: 'rustc main.rs && ./main',
    previewOutput: ['ALL the best', 'Execution completed successfully.']
  },
  swift: {
    label: 'Swift',
    prism: 'swift',
    code: `print("ALL the best")
`,
    previewCommand: 'swift main.swift',
    previewOutput: ['ALL the best', 'Execution completed successfully.']
  }
};

function normalizeOutput(value = '') {
  return value.replace(/\r\n/g, '\n').trim();
}

function outputsMatch(actualOutput = '', expectedOutput = '') {
  const actual = normalizeOutput(actualOutput);
  const expected = normalizeOutput(expectedOutput);

  if (actual === expected) {
    return true;
  }

  const actualNumbers = actual.match(/-?\d+(?:\.\d+)?/g) || [];
  const expectedNumbers = expected.match(/-?\d+(?:\.\d+)?/g) || [];

  return actualNumbers.length > 0 &&
    actualNumbers.length === expectedNumbers.length &&
    actualNumbers.every((value, index) => value === expectedNumbers[index]);
}

export default function UdyogaprepEditor() {
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [code, setCode] = useState(LANGUAGE_TEMPLATES.javascript.code);
  const [terminalInput, setTerminalInput] = useState('');
  const [problem, setProblem] = useState(FALLBACK_PROBLEM);
  const [isProblemLoading, setIsProblemLoading] = useState(true);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunAssessment, setLastRunAssessment] = useState<{ status: string; detail: string } | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  
  // Console resize state
  const [consoleHeight, setConsoleHeight] = useState(300);
  const [isDraggingHeight, setIsDraggingHeight] = useState(false);
  useEffect(() => {
    document.body.classList.add('editor-page');

    return () => {
      document.body.classList.remove('editor-page');
    };
  }, []);

  useEffect(() => {
    const loadQuestion = async () => {
      try {
        const storedQuestion = localStorage.getItem('interview_dsa_question');
        if (storedQuestion) {
          const parsed = JSON.parse(storedQuestion);
          setProblem({
            ...FALLBACK_PROBLEM,
            ...parsed
          });
          localStorage.removeItem('interview_dsa_question');
          setIsProblemLoading(false);
          return;
        }

        const res = await fetch('/api/coding-question');
        if (!res.ok) throw new Error('Failed to fetch DSA question');
        const data = await res.json();
        setProblem({
          question: data.question || FALLBACK_PROBLEM.question,
          difficulty: data.difficulty || FALLBACK_PROBLEM.difficulty,
          category: data.category || FALLBACK_PROBLEM.category,
          description: data.description || FALLBACK_PROBLEM.description,
          constraints: Array.isArray(data.constraints) ? data.constraints : FALLBACK_PROBLEM.constraints,
          examples: Array.isArray(data.examples) && data.examples.length > 0 ? data.examples : FALLBACK_PROBLEM.examples
        });
      } catch (error) {
        console.error('Error loading DSA question:', error);
      } finally {
        setIsProblemLoading(false);
      }
    };

    loadQuestion();
  }, []);

  useEffect(() => {
    setCode(LANGUAGE_TEMPLATES[selectedLanguage].code);
    setTerminalOutput('');
    setLastRunAssessment(null);
  }, [selectedLanguage]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${window.location.host}/api/execute`);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'output' || message.type === 'stderr') {
          const text = String(message.data || '');
          if (text) {
            setTerminalOutput((prev) => prev + text);
          }
          return;
        }

        if (message.type === 'error') {
          const errorLine = message.data || message.message || 'Execution error';
          setTerminalOutput((prev) => prev + errorLine + '\n');
          return;
        }

        if (message.type === 'status') {
          const statusLine = message.message || '';
          if (statusLine && !statusLine.includes('Code execution started')) {
            setTerminalOutput((prev) => prev + statusLine + '\n');
          }

          if (statusLine.includes('Process exited')) {
            setIsRunning(false);
            setLastRunAssessment({ status: 'accepted', detail: statusLine });
          }
        }
      } catch {
        setTerminalOutput((prev) => prev + String(event.data || '') + '\n');
      }
    };

    ws.onerror = () => {
      setTerminalOutput((prev) => prev + 'Error: Terminal connection failed.\n');
      setIsRunning(false);
    };

    ws.onclose = () => {
      setIsRunning(false);
    };

    return () => {
      ws.close();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isDraggingHeight) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate how far the mouse is from the bottom of the screen
      const newHeight = window.innerHeight - e.clientY;
      // Clamp the height between 100px and 80% of window height
      if (newHeight >= 100 && newHeight <= window.innerHeight * 0.8) {
        setConsoleHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingHeight(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingHeight]);

  const handleRunCode = async () => {
    setIsTerminalOpen(true);
    setIsRunning(true);
    setLastRunAssessment(null);
    const template = LANGUAGE_TEMPLATES[selectedLanguage];
    setTerminalOutput('');

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setTerminalOutput((prev) => prev + 'Error: Terminal is not connected. Refresh and try again.\n');
      setLastRunAssessment({ status: 'runtime-error', detail: 'Terminal not connected' });
      setIsRunning(false);
      return;
    }

    socket.send(JSON.stringify({
      type: 'execute',
      language: selectedLanguage,
      code,
    }));
  };

  const handleTerminalInputSubmit = () => {
    const value = terminalInput;
    if (!value || !isRunning) return;

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setTerminalOutput((prev) => prev + 'Error: Terminal is not connected.\n');
      return;
    }

    socket.send(JSON.stringify({ type: 'input', data: value }));
    setTerminalOutput((prev) => prev + value + '\n');
    setTerminalInput('');
  };

  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
        setIsLanguageMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTerminal = () => {
    setIsTerminalOpen(!isTerminalOpen);
  };

  const handleSubmitCode = () => {
    const submissionData = {
      code: code,
      language: selectedLanguage,
      output: terminalOutput,
      questionTitle: problem.question,
      assessment: lastRunAssessment || { status: 'not-run', detail: 'Code submitted without running tests' },
      submittedAt: new Date().toISOString()
    };
    localStorage.setItem('interview_dsa_submission', JSON.stringify(submissionData));
    
    // Close the current tab
    window.close();
    
    // Fallback if window.close is blocked by browser rules
    setTerminalOutput('Submission recorded! You can close this tab and return to the interview.\n');
  };

  return (
    <div className="editor-layout">
      {/* Navbar */}
      <nav className="editor-navbar glass-panel">
        <div className="brand-title">Udyogaprep</div>
        <div className="nav-actions">
          <div className="relative min-w-[200px]" ref={languageMenuRef}>
            <button
              onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
              className="lang-trigger-btn flex items-center justify-between w-full rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm outline-none transition-all"
            >
              <span>{LANGUAGE_OPTIONS.find(opt => opt.value === selectedLanguage)?.label}</span>
              <ChevronDown size={14} className={`text-slate-500 transition-transform ${isLanguageMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isLanguageMenuOpen && (
              <div className="lang-menu absolute top-[calc(100%+8px)] left-[-150px] right-0 z-[100] min-w-[350px] rounded-xl shadow-2xl overflow-hidden fade-in">
                <div className="p-3 border-b border-sky-100/80">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Select Language</span>
                </div>
                <div className="grid grid-cols-2 p-2 gap-1.5">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <button
                      key={lang.value}
                      onClick={() => {
                        setSelectedLanguage(lang.value);
                        setIsLanguageMenuOpen(false);
                      }}
                      className={`lang-option-btn flex items-center justify-between px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                        selectedLanguage === lang.value 
                        ? 'lang-option-active' 
                        : 'lang-option-idle'
                      }`}
                    >
                      <span className="truncate">{lang.label}</span>
                      {selectedLanguage === lang.value && <Check size={14} className="shrink-0 ml-2" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="editor-main">
        <PanelGroup id="main-group-2" autoSave="editor-layout-save" orientation="horizontal" className="w-full h-full">
          
          {/* Left Pane: Problem Description */}
          <Panel id="problem-panel" defaultSize={45} minSize={25} className="flex flex-col">
            <section className="problem-pane glass-panel h-full flex flex-col">
              <header className="pane-header shrink-0">
                <span className="pane-title text-slate-500">Problem Description</span>
              </header>
              <div className="problem-content text-slate-700">
                <h1 className="text-slate-900">{problem.question}</h1>
                <div className="flex gap-2 mb-6">
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 border border-blue-200">{problem.difficulty}</span>
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">{problem.category}</span>
                </div>
                
                <p className="mb-4">
                  {isProblemLoading ? 'Generating a DSA question...' : problem.description}
                </p>

                <h3 className="text-base font-bold mb-2 text-slate-900 mt-8">Examples:</h3>
                <div className="space-y-4 mb-8">
                  {problem.examples.map((example, index) => (
                    <div key={index} className="p-5 rounded-xl bg-slate-50/80 text-[15px] text-slate-700 font-sans leading-relaxed tracking-wide">
                      <div className="mb-1"><span className="text-slate-800 font-bold">Input:</span> {example.input}</div>
                      <div className="mb-1"><span className="text-slate-800 font-bold">Output:</span> {example.output}</div>
                      {example.explanation && (
                        <div><span className="text-slate-800 font-bold">Explanation:</span> {example.explanation}</div>
                      )}
                    </div>
                  ))}
                </div>

                <h3 className="text-base font-bold mb-2 text-slate-900 text-slate-800">Constraints:</h3>
                <ul className="list-disc pl-6 mb-6 space-y-2">
                  {problem.constraints.map((constraint, index) => (
                    <li key={index}><code>{constraint}</code></li>
                  ))}
                </ul>
              </div>
            </section>
          </Panel>

          <PanelResizeHandle id="main-resize-handle" className="resize-handle-vertical group" />

          {/* Right Pane: Workspace */}
          <Panel id="editor-panel" defaultSize={55} minSize={30} className="flex flex-col relative overflow-hidden">
            <div 
              className={`code-editor-section glass-panel h-full flex flex-col relative z-0 overflow-hidden ${isDraggingHeight ? '' : 'transition-all duration-300 ease-in-out'}`}
              style={{ paddingBottom: isTerminalOpen ? `${consoleHeight}px` : '48px' }}
            >
              <header className="editor-actions shrink-0">
                <div className="flex gap-2">
                  <button 
                    className="btn btn-ghost"
                    onClick={handleRunCode}
                    disabled={isRunning}
                  >
                    <Play size={16} className={isRunning ? "animate-pulse text-blue-500" : "text-slate-500"} />
                    Run Code
                  </button>
                  <button className="btn btn-primary" onClick={handleSubmitCode}>
                    <CloudUpload size={16} />
                    Submit Solution
                  </button>
                </div>
              </header>
              
              <div className="editor-scroll-area flex-1 relative bg-white/50 h-full w-full">
                <Editor
                  height="100%"
                  language={selectedLanguage === 'c++' ? 'cpp' : selectedLanguage === 'c#' ? 'csharp' : selectedLanguage}
                  value={code}
                  onChange={(value) => setCode(value || '')}
                  theme={isDarkMode ? "vs-dark" : "light"}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    padding: { top: 24, bottom: 24 },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    automaticLayout: true,
                    formatOnPaste: true,
                  }}
                  className="custom-editor w-full h-full"
                />
              </div>
            </div>

            {/* Overlaid Slide-Up Console */}
            <div 
              className={`absolute bottom-0 left-0 right-0 glass-panel shadow-[0_-8px_30px_rgba(0,0,0,0.12)] z-10 flex flex-col overflow-hidden ${isDraggingHeight ? '' : 'transition-all duration-300 ease-in-out'}`}
              style={{
                height: isTerminalOpen ? `${consoleHeight}px` : '48px',
                marginBottom: '0px'
              }}
            >
              {/* Custom Resize Handle */}
              <div 
                className={`group absolute -top-[4px] left-0 w-full h-[8px] z-20 ${isTerminalOpen ? 'cursor-ns-resize' : 'cursor-default pointer-events-none'}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (isTerminalOpen) setIsDraggingHeight(true);
                }}
              >
                {/* Thin line matching descriptions hover */}
                <div className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] transition-colors duration-200 ${isDraggingHeight ? 'bg-[rgba(59,130,246,0.7)]' : 'bg-transparent group-hover:bg-[rgba(59,130,246,0.7)]'}`} />
              </div>

              <header className="terminal-header shrink-0 cursor-pointer bg-[#f8f9fa] border-t border-slate-200" onClick={toggleTerminal}>
                <div className="terminal-title-wrapper">
                  <TerminalIcon size={16} className="text-slate-500" />
                  <span className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">Console</span>
                </div>
                <div className="text-slate-500 hover:text-slate-800 transition-transform duration-300" style={{ transform: isTerminalOpen ? 'rotate(0deg)' : 'rotate(180deg)' }}>
                  <ChevronDown size={18} />
                </div>
              </header>
              
              <div 
                className={`terminal-content bg-white ${isTerminalOpen ? 'overflow-y-auto' : 'overflow-hidden'}`}
                style={{ 
                  padding: isTerminalOpen ? '16px 20px' : '0 20px',
                  display: isTerminalOpen ? 'block' : 'none'
                }}
              >
                {terminalOutput.length === 0 ? (
                  <div className="terminal-line text-slate-400 italic">No output yet. Click 'Run Code' to execute.</div>
                ) : (
                  <div className="terminal-line font-mono text-[13px] text-slate-700 whitespace-pre-wrap">
                    {terminalOutput}
                    {isRunning && (
                      <input
                        autoFocus
                        value={terminalInput}
                        onChange={(e) => setTerminalInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleTerminalInputSubmit();
                          }
                        }}
                        className="bg-transparent text-[#1f2937] border-none outline-none shadow-none focus:ring-0 focus:outline-none p-0 m-0 inline"
                        style={{ boxShadow: 'none', fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit', minWidth: '200px' }}
                        spellCheck={false}
                      />
                    )}
                  </div>
                )}
                {isRunning && terminalOutput.length === 0 && (
                  <div className="terminal-line inline mb-1 bg-transparent">
                    <input
                      autoFocus
                      value={terminalInput}
                      onChange={(e) => setTerminalInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleTerminalInputSubmit();
                        }
                      }}
                      className="bg-transparent text-[#1f2937] border-none outline-none shadow-none focus:ring-0 focus:outline-none p-0 m-0"
                      style={{ boxShadow: 'none', fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit' }}
                      spellCheck={false}
                    />
                  </div>
                )}
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </main>
    </div>
  );
}
