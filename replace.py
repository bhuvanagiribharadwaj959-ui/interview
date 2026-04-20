import re

with open('my-app/components/ActiveInterview.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_pattern = r'if \(callEnded\) \{[\s\S]*?Call Ended<\/h2>[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?\);[\s\S]*?\}'

new_code = '''    if (callEnded) {
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
    }'''

new_content = re.sub(import_pattern, new_code, content)

with open('my-app/components/ActiveInterview.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Python replace done")
