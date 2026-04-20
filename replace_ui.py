import re

with open('pages/editor.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_sig = "  return (\n    <div ref={containerRef} className=\"flex h-screen bg-white"

start_idx = content.find(start_sig)
if start_idx == -1:
    print("Could not find start of return statement")
    exit(1)

new_return = """  return (
    <div className="flex h-screen bg-[#FDFDFD] text-gray-900 font-sans overflow-hidden">
      {/* Left Panel: Problem Statement */}
      <div 
        className="flex flex-col border-r border-gray-200 bg-white relative" 
        style={{ width: `${leftPanelWidth}px`, minWidth: '320px' }}
      >
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
          <div className="p-8 pb-32">
            <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.01em] mb-4 text-[#111827]">
              {problemDescription.title === "Coding Challenge" ? "" : problemDescription.title.replace(/\*\*/g, '')}
            </h1>
            
            <div className="flex flex-wrap gap-2 mb-8">
              <span className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                problemDescription.difficulty?.toLowerCase() === 'easy' ? 'bg-[#ECFDF5] text-[#059669]' :
                problemDescription.difficulty?.toLowerCase() === 'medium' ? 'bg-[#FFFBEB] text-[#D97706]' :
                'bg-[#FEF2F2] text-[#DC2626]'
              }`}>
                {problemDescription.difficulty || 'Easy'}
              </span>
              {(problemDescription.tags || []).map((tag, i) => (
                <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md">
                  {tag}
                </span>
              ))}
            </div>

            <div className="prose prose-sm prose-gray max-w-none 
              prose-headings:font-medium prose-headings:text-gray-900
              prose-p:text-gray-600 prose-p:leading-relaxed
              prose-a:text-blue-600
              prose-code:text-sm prose-code:font-mono prose-code:text-[#09090b] prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
              prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200 prose-pre:text-gray-800"
            >
              <MarkdownRenderer content={problemDescription.body || "Loading problem..."} />
            </div>
          </div>
        </div>

        {/* Resizer handle */}
        <div
          className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-blue-500/20 active:bg-blue-500/40 transition-colors z-10"
          onMouseDown={startResizing}
        />
      </div>

      {/* Right Panel: Code Editor */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
        {/* Editor Toolbar */}
        <div className="h-[52px] border-b border-gray-200 bg-white flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="h-8 pl-3 pr-8 bg-gray-50 border border-gray-200 rounded-md text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundPosition: `right 8px center`,
                backgroundRepeat: `no-repeat`,
                backgroundSize: `16px`
              }}
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              title="Settings"
            >
              <Settings size={16} />
            </button>
            <div className="w-px h-5 bg-gray-200 mx-1"></div>
            <button
              onClick={handleRun}
              disabled={isRunning}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2
                ${isRunning 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:text-gray-900 shadow-sm'}`}
            >
              {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              Run Code
            </button>
            <button
              onClick={handleSubmitCode}
              disabled={isSubmitting}
              className={`px-4 py-1.5 rounded-md text-sm font-medium text-white transition-all shadow-sm flex items-center gap-2
                ${isSubmitting 
                  ? 'bg-emerald-400 cursor-not-allowed' 
                  : 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700'}`}
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Submit 
            </button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 relative pt-2">
          <Editor
            height="100%"
            language={language}
            value={code}
            onChange={(val) => setCode(val || "")}
            theme={theme}
            options={{
              minimap: { enabled: false },
              fontSize: editorFontSize,
              lineNumbers: "on",
              roundedSelection: false,
              scrollBeyondLastLine: false,
              padScrollbar: true,
              fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
              renderLineHighlight: "all",
              smoothScrolling: true,
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
              formatOnPaste: true,
              bracketPairColorization: { enabled: true },
            }}
            loading={
              <div className="flex items-center justify-center h-full text-gray-400">
                <Loader2 size={24} className="animate-spin" />
              </div>
            }
          />
        </div>

        {/* Output Panel - Collapsible */}
        <div className={`border-t border-gray-200 bg-white transition-all duration-300 ease-in-out flex flex-col ${
          showOutput ? 'h-[250px]' : 'h-[40px]'
        }`}>
          {/* Header */}
          <div 
            className="flex items-center justify-between px-4 h-[40px] shrink-0 cursor-pointer hover:bg-gray-50 border-b border-transparent"
            onClick={() => setShowOutput(!showOutput)}
          >
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Test Results</span>
              {testResults && testResults.length > 0 && (
                <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  testResults.every(r => r.passed) 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {testResults.filter(r => r.passed).length}/{testResults.length}
                </span>
              )}
            </div>
            {showOutput ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronUp size={16} className="text-gray-400" />}
          </div>

          {/* Body */}
          <div className={`flex-1 overflow-auto bg-[#F8FAFC] ${!showOutput && 'hidden'}`}>
            <div className="p-4 font-mono text-sm">
              {isRunning || isSubmitting ? (
                <div className="flex items-center gap-3 text-gray-500">
                  <Loader2 size={16} className="animate-spin text-blue-500" />
                  <span>{isRunning ? 'Executing your code...' : 'Running extensive test suite...'}</span>
                </div>
              ) : testResults && testResults.length > 0 ? (
                <div className="space-y-4">
                  {testResults.map((result, idx) => (
                    <div key={idx} className={`p-4 rounded-lg border ${
                      result.passed 
                        ? 'bg-emerald-50/50 border-emerald-100 text-emerald-900' 
                        : 'bg-red-50/50 border-red-100 text-red-900'
                    }`}>
                      <div className="flex items-center gap-2 font-semibold mb-2">
                        {result.passed ? <CheckCircle2 size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-red-500" />}
                        Test Case {idx + 1}
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex">
                          <span className="w-20 opacity-70">Input:</span>
                          <span className="bg-white/50 px-2 py-0.5 rounded flex-1">{result.input}</span>
                        </div>
                        <div className="flex">
                          <span className="w-20 opacity-70">Expected:</span>
                          <span className="bg-white/50 px-2 py-0.5 rounded flex-1">{result.expectedOutput}</span>
                        </div>
                        <div className="flex">
                          <span className="w-20 opacity-70">Actual:</span>
                          <span className="bg-white/50 px-2 py-0.5 rounded flex-1">{result.actualOutput}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : output ? (
                <pre className="text-gray-700 whitespace-pre-wrap">{output}</pre>
              ) : (
                <div className="text-gray-400 text-center mt-8">Run your code to see results here</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};"""

end_sig = "};\n\nexport default CodeEditor;"
end_idx = content.rfind("  );\n};")
if end_idx == -1: end_idx = content.rfind("};\n\nexport default CodeEditor;")

if end_idx != -1:
    new_content = content[:start_idx] + new_return + content[end_idx + 8:]
    with open('pages/editor.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Replaced UI successfully.")
else:
    print("Could not find end of return statement.")

