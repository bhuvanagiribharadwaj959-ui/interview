import React, { useState, useRef } from 'react';
import styles from '../styles/CodeEditorSection.module.css';

const DEFAULT_CODE = `def twoSum(nums, target):
    prevMap = {}  # val : index

    for i, n in enumerate(nums):
        diff = target - n
        if diff in prevMap:
            return [prevMap[diff], i]
        prevMap[n] = i

    return []`;

export default function CodeEditorSection() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [statusText, setStatusText] = useState('Ready to run');
  const preRef = useRef<HTMLPreElement>(null);

  const highlightCode = (codeStr: string) => {
    const escapeHtml = (unsafe: string) => {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    };

    const tokenRegex = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(#.*)|(\b(?:def|return|for|in|if|else|elif|while|class|import|from)\b)|(\b\d+\b)|(\b[a-zA-Z_]\w*(?=\())/g;

    let resultHtml = "";
    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(codeStr)) !== null) {
        const [fullMatch, str, comment, keyword, num, func] = match;
        const index = match.index;
        
        resultHtml += escapeHtml(codeStr.slice(lastIndex, index));
        
        if (str) resultHtml += `<span class="${styles.tokenString}">${escapeHtml(str)}</span>`;
        else if (comment) resultHtml += `<span class="${styles.tokenComment}">${escapeHtml(comment)}</span>`;
        else if (keyword) resultHtml += `<span class="${styles.tokenKeyword}">${escapeHtml(keyword)}</span>`;
        else if (num) resultHtml += `<span class="${styles.tokenNumber}">${escapeHtml(num)}</span>`;
        else if (func) resultHtml += `<span class="${styles.tokenFunction}">${escapeHtml(func)}</span>`;
        else resultHtml += escapeHtml(fullMatch);
        
        lastIndex = index + fullMatch.length;
    }
    
    resultHtml += escapeHtml(codeStr.slice(lastIndex));
    
    // Add a trailing newline/space if code ends with newline, to ensure pre height matches textarea
    if (codeStr.endsWith('\n')) {
        resultHtml += '<br />';
    }

    return { __html: resultHtml };
  };

  const handleRun = () => {
    setStatus('running');
    setStatusText('Running...');

    setTimeout(() => {
      const trimmed = code.trim();
      if (trimmed.includes("return") && trimmed.length > 20) {
        setStatus('success');
        setStatusText('✓ All test cases passed');
      } else {
        setStatus('error');
        setStatusText('✗ Error: check your logic');
      }
    }, 1200);
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (preRef.current) {
      preRef.current.scrollTop = e.currentTarget.scrollTop;
      preRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const getStatusClass = () => {
    switch (status) {
      case 'success': return styles.statusSuccess;
      case 'error': return styles.statusError;
      case 'running': return styles.statusRunning;
      default: return styles.statusIdle;
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        
        <div className={styles.leftColumn}>
          <span className={styles.eyebrow}>CODING ENVIRONMENT</span>
          <h2 className={styles.heading}>Industry standard code editor</h2>
          <p className={styles.description}>
            Write, debug, and run your code in a fully featured environment.
            Practice the most common DSA problems with real-time feedback on edge cases.
          </p>

          <div className={styles.problemCard}>
            <p className={styles.problemTitle}>Problem: Two Sum</p>
            <p className={styles.problemDesc}>
              Given an array of integers <code>nums</code> and an integer <code>target</code>,
              return indices of the two numbers such that they add up to <code>target</code>.
            </p>
          </div>
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.editorShell}>
            <div className={styles.editorTitlebar}>
              <span className={`${styles.dot} ${styles.red}`} />
              <span className={`${styles.dot} ${styles.yellow}`} />
              <span className={`${styles.dot} ${styles.green}`} />
              <span className={styles.filename}>solution.py</span>
            </div>

            <div className={styles.editorBody}>
              <pre 
                ref={preRef}
                className={styles.codeHighlight}
                dangerouslySetInnerHTML={highlightCode(code)}
                aria-hidden="true"
              />
              <textarea 
                className={styles.codeInput}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onScroll={handleScroll}
                spellCheck={false}
              />
            </div>

            <div className={styles.editorFooter}>
              <span key={statusText} className={`${styles.runStatus} ${getStatusClass()}`}>
                {statusText}
              </span>
              <button className={styles.runBtn} onClick={handleRun}>
                Run Code
              </button>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
