import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState('dashboard');
  const [stats, setStats] = useState({
    userName: 'Student',
    readinessScore: 0,
    vocabularyScore: 0,
    totalInterviews: 0,
    currentStreak: 0,
    skillBreakdown: {
      communication: 0,
      technical: 0,
      confidence: 0,
      logic: 0
    },
    readinessHistory: [],
    recentActivity: []
  });

  const [interviewHistory, setInterviewHistory] = useState<any[]>([]);
  const [expandedInterviewId, setExpandedInterviewId] = useState<string | null>(null);

  useEffect(() => {
    if (activeView === 'history') {
      const fetchHistory = async () => {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        try {
          const res = await fetch('/api/interviews/history', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setInterviewHistory(data);
          }
        } catch (error) {
          console.error('Error fetching history:', error);
        }
      };
      
      fetchHistory();
    }
  }, [activeView]);

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        router.push('/login?redirect=/dashboard');
        return;
      }

      try {
        const res = await fetch('/api/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.status === 401) {
          localStorage.removeItem('authToken');
          router.push('/login?redirect=/dashboard');
          return;
        }

        if (!res.ok) throw new Error('Failed to fetch stats');

        const data = await res.json();
        setStats(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [router]);

  if (loading) {
     return (
       <div className="flex items-center justify-center min-h-screen bg-background">
         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
       </div>
    );
  }

  return (
    <>
      <Head>
        <title>udyogaprep - Student Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>{`
            body { overflow: auto !important; }
            .sidebar-active {
                background-color: #d8e2ff;
                color: #0058be;
                font-weight: 700;
            }
            .material-symbols-outlined {
                font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
            }
            .card-shadow {
                box-shadow: 0 4px 20px -2px rgba(17, 28, 45, 0.04);
            }
        `}</style>
      </Head>

      <div className="bg-background text-on-surface antialiased font-body flex min-h-screen">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-white border-r border-outline-variant/30 flex flex-col fixed h-full z-50">
          <div className="p-8 flex items-center gap-2">
            <span className="text-2xl font-extrabold text-primary font-headline tracking-tight">udyogaprep</span>
          </div>
          <nav className="flex-1 px-4 space-y-1">
            <p className="px-4 text-[10px] uppercase tracking-[0.15em] font-bold text-secondary mb-2">Menu</p>
            <button onClick={() => setActiveView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${activeView === 'dashboard' ? 'sidebar-active' : 'bg-transparent text-on-surface-variant hover:bg-surface-container'}`}>
              <span className="material-symbols-outlined">grid_view</span>
              <span className="font-headline text-sm">Dashboard</span>
            </button>
            <a className="flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface-variant hover:bg-surface-container transition-all group" href="/interview">
              <span className="material-symbols-outlined">mic</span>
              <span className="font-headline text-sm">Mock Interviews</span>
            </a>
            <button onClick={() => setActiveView('history')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${activeView === 'history' ? 'sidebar-active' : 'bg-transparent text-on-surface-variant hover:bg-surface-container'}`}>
                <span className="material-symbols-outlined">history</span>
                <span className="font-headline text-sm">History</span>
              </button>
            <a className="flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface-variant hover:bg-surface-container transition-all group" href="/editor">
              <span className="material-symbols-outlined">leaderboard</span>
              <span className="font-headline text-sm">Editor</span>
            </a>
           
          </nav>
          <div className="p-4 m-4 bg-surface-container rounded-2xl">
            <p className="text-[10px] font-bold text-secondary mb-1 uppercase tracking-widest">Pro Plan</p>
            <p className="text-xs font-medium text-on-surface-variant mb-4">Unlock unlimited AI expert sessions.</p>
            <button className="w-full py-2.5 bg-on-surface text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all">Upgrade Now</button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 ml-64 min-h-screen">
          {/* Header */}
          <header className="h-16 bg-background/80 backdrop-blur-md border-b border-outline-variant/20 px-8 flex items-center justify-between sticky top-0 z-40">
            <div>
              <h2 className="text-xl font-extrabold text-on-surface font-headline tracking-tight">Welcome back, {stats.userName}!</h2>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1">
                <button className="p-2 text-on-surface-variant hover:text-primary transition-all rounded-full hover:bg-surface-container bg-transparent">
                  <span className="material-symbols-outlined">search</span>
                </button>
                <button className="p-2 text-on-surface-variant hover:text-primary relative transition-all rounded-full hover:bg-surface-container bg-transparent">
                  <span className="material-symbols-outlined">notifications</span>
                  <span className="absolute top-2 right-2 size-2 bg-tertiary rounded-full border-2 border-background"></span>
                </button>
              </div>
              <div className="h-8 w-px bg-outline-variant/30"></div>
              <div className="flex items-center gap-3 cursor-pointer group">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-on-surface font-headline group-hover:text-primary transition-colors">{stats.userName}</p>
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-tight">Student</p>
                </div>
                <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border-2 border-surface-container-high">
                  {stats.userName.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </header>

          {activeView === "dashboard" ? (
          <div className="p-8 space-y-8 max-w-7xl mx-auto">
            {/* Top Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl card-shadow border border-outline-variant/10">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-primary-fixed text-primary rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">verified_user</span>
                  </div>
                  {/* Dynamic Trend Indicator */}
                  {stats.readinessHistory.length > 2 && (
                      <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full uppercase tracking-wider">Wait for more data</span>
                  )}
                </div>
                <div>
                  <p className="text-secondary text-xs font-bold uppercase tracking-widest mb-1">Readiness Score</p>
                  <h3 className="text-3xl font-extrabold text-on-surface font-headline">{stats.readinessScore}%</h3>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl card-shadow border border-outline-variant/10">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-secondary-container text-on-secondary-container rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">translate</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${stats.vocabularyScore >= 8 ? 'text-primary bg-primary-fixed' : 'text-secondary bg-gray-100'}`}>
                    {stats.vocabularyScore >= 8 ? 'Strong' : stats.vocabularyScore >= 5 ? 'Average' : 'Needs Work'}
                  </span>
                </div>
                <div>
                  <p className="text-secondary text-xs font-bold uppercase tracking-widest mb-1">Vocabulary</p>
                  <h3 className="text-3xl font-extrabold text-on-surface font-headline">
                    {stats.vocabularyScore}/10
                  </h3>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl card-shadow border border-outline-variant/10">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-orange-50 text-tertiary rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">local_fire_department</span>
                  </div>
                </div>
                <div>
                  <p className="text-secondary text-xs font-bold uppercase tracking-widest mb-1">Current Streak</p>
                  <h3 className="text-3xl font-extrabold text-on-surface font-headline">{stats.currentStreak} Days</h3>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl card-shadow border border-outline-variant/10">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">forum</span>
                  </div>
                </div>
                <div>
                  <p className="text-secondary text-xs font-bold uppercase tracking-widest mb-1">Interviews</p>
                  <h3 className="text-3xl font-extrabold text-on-surface font-headline">{stats.totalInterviews}</h3>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Readiness Over Time */}
              <div className="lg:col-span-2 bg-white p-8 rounded-2xl card-shadow border border-outline-variant/10">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h4 className="text-lg font-extrabold text-on-surface font-headline tracking-tight">Readiness Over Time</h4>
                    <p className="text-sm text-on-surface-variant">Your progress history</p>
                  </div>
                </div>
                {/* Simplified Visual Chart */}
                <div className="h-72 w-full mt-4">
                  {stats.readinessHistory.filter(d => d.hasData).length === 0 ? (
                      <div className="h-full flex items-center justify-center text-on-surface-variant text-sm italic">
                          No data yet. Start an interview to see your progress!
                      </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.readinessHistory.filter(d => d.hasData).reverse()}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                          axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}}
                          dy={10}
                        />
                        <YAxis domain={[0, 100]} hide={false} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} dx={-10} />
                        <RechartsTooltip 
                          labelFormatter={(label) => new Date(label).toLocaleDateString()}
                          formatter={(value) => [`${value}%`, 'Score']}
                          contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                        />
                        <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={3} dot={{r: 4, fill: '#2563eb'}} activeDot={{r: 6, fill: '#1d4ed8'}} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Skill Breakdown Summary */}
              <div className="bg-white p-8 rounded-2xl card-shadow border border-outline-variant/10 flex flex-col justify-center">
                <h4 className="text-lg font-extrabold text-on-surface font-headline tracking-tight mb-8">Current Skills</h4>
                <div className="flex-1 flex flex-col items-center justify-center pt-6">
                  {stats.totalInterviews === 0 ? (
                      <div className="text-center text-xs text-on-surface-variant mt-4 italic">
                          Skills will appear after your first interview.
                      </div>
                  ) : (
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart outerRadius="70%" data={[
                            { subject: 'Communication', A: stats.skillBreakdown.communication, fullMark: 100 },
                            { subject: 'Technical', A: stats.skillBreakdown.technical, fullMark: 100 },
                            { subject: 'Confidence', A: stats.skillBreakdown.confidence, fullMark: 100 },
                            { subject: 'Logic', A: stats.skillBreakdown.logic, fullMark: 100 }
                          ]}>
                            <PolarGrid gridType="polygon" />
                            <PolarAngleAxis dataKey="subject" tick={{fontSize: 11, fontWeight: 'bold', fill: '#475569'}} />
                            <Radar name="Student" dataKey="A" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.5} />
                            <RechartsTooltip formatter={(value) => [`${value}%`, 'Score']} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Metric Graphs */}
            {stats.readinessHistory.filter(d => d.hasData).length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { title: 'Communication', key: 'communication', color: '#3b82f6' },
                    { title: 'Technical', key: 'technical', color: '#22c55e' },
                    { title: 'Confidence', key: 'confidence', color: '#a855f7' },
                    { title: 'Logic', key: 'logic', color: '#f97316' }
                ].map((metric) => (
                    <div key={metric.key} className="bg-white p-6 rounded-xl card-shadow border border-outline-variant/10">
                        <h5 className="text-sm font-bold text-on-surface font-headline mb-4">{metric.title} Trend</h5>
                        <div className="h-32">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.readinessHistory.filter(d => d.hasData).reverse()}>
                              <Line type="monotone" dataKey={metric.key} stroke={metric.color} strokeWidth={3} dot={{r: 3, fill: metric.color}} activeDot={{r: 5}} />
                              <RechartsTooltip 
                                labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                formatter={(value) => [`${value}%`, metric.title]}
                                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '12px'}}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                    </div>
                ))}
            </div>
            )}
          </div>
          ) : null}

          {activeView === 'history' ? (
            <div className="p-8 max-w-5xl mx-auto">
              {expandedInterviewId ? (
                 <div className="flex flex-col gap-6">
                    <button 
                      onClick={() => setExpandedInterviewId(null)}
                      className="flex items-center gap-2 text-primary font-bold hover:underline mb-4 w-fit"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                        Back to History
                    </button>
                    {(() => {
                        const interview = interviewHistory.find(i => i._id === expandedInterviewId);
                        if (!interview) return <div className="text-center p-8">Interview not found.</div>;
                        return (
                            <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/20 overflow-hidden flex flex-col h-[calc(100vh-200px)]">
                                <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-lowest">
                                    <div>
                                        <h3 className="text-xl font-bold text-on-surface font-headline">{interview.type || 'Mock Interview'}</h3>
                                        <p className="text-sm text-on-surface-variant">
                                            {new Date(interview.startTime || interview.date).toLocaleDateString()} • {interview.duration || '0m'} • Score: <span className="text-primary font-bold">{interview.readinessScore || interview.score || 0}</span>
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                         <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                            (interview.readinessScore || interview.score) >= 80 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {(interview.readinessScore || interview.score) >= 80 ? 'Excellent' : 'Good'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 bg-surface-container-low space-y-6">
                                    {interview.transcript && interview.transcript.length > 0 ? (
                                        interview.transcript.map((msg: any, idx: number) => (
                                            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-primary text-on-primary' : 'bg-tertiary-container text-on-tertiary-container'}`}>
                                                    <span className="material-symbols-outlined text-sm">
                                                        {msg.role === 'user' ? 'person' : 'smart_toy'}
                                                    </span>
                                                </div>
                                                <div className={`p-4 rounded-2xl max-w-[80%] shadow-sm ${
                                                    msg.role === 'user' 
                                                    ? 'bg-primary text-on-primary rounded-tr-none' 
                                                    : 'bg-white text-on-surface rounded-tl-none border border-outline-variant/10'
                                                }`}>
                                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-on-surface-variant opacity-60">
                                            <span className="material-symbols-outlined text-4xl mb-2">chat_bubble_outline</span>
                                            <p>No transcript available for this session.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                 </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-extrabold text-on-surface font-headline">Interview History</h2>
                    <button 
                      onClick={async () => {
                        if (confirm('Are you sure you want to erase all your past interview data?')) {
                          const token = localStorage.getItem('authToken');
                          if (token) {
                            await fetch('/api/interviews/clear', {
                              method: 'DELETE',
                              headers: { 'Authorization': `Bearer ${token}` }
                            });
                            window.location.reload();
                          }
                        }
                      }}
                      className="px-4 py-2 rounded-lg bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 transition-all flex items-center gap-2 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                      <span>Erase All Data</span>
                    </button>
                  </div>
                  <div className="flex flex-col gap-4">
                    {interviewHistory.length === 0 ? (
                        <div className="text-center py-12 bg-surface-container/30 rounded-2xl border border-dashed border-outline-variant/30">
                            <span className="material-symbols-outlined text-4xl text-on-surface-variant/50 mb-3">history_edu</span>
                            <p className="text-on-surface-variant">No interview history yet. Start a new session!</p>
                        </div>
                    ) : (
                        interviewHistory.map((interview, i) => (
                          <div key={i} className="flex flex-col md:flex-row gap-6 p-6 bg-white rounded-xl shadow-sm border border-outline-variant/10 hover:shadow-md transition-all group">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-primary">forum</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-2 gap-2">
                                    <div>
                                        <h4 className="font-bold text-lg text-on-surface font-headline group-hover:text-primary transition-colors">{interview.type || 'Mock Interview'}</h4>
                                        <div className="flex items-center gap-3 text-sm text-on-surface-variant mt-1">
                                            <span className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-xs">calendar_today</span>
                                                {new Date(interview.startTime || interview.date).toLocaleDateString()}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                                            <span className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-xs">schedule</span>
                                                {interview.duration || '0m'}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                                            <span className="capitalize">{interview.difficulty || 'Medium'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="text-right">
                                            <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-1">Score</p>
                                            <div className="flex items-end justify-end gap-1">
                                                <span className="text-2xl font-black text-primary font-headline leading-none">{interview.readinessScore || interview.score || 0}</span>
                                                <span className="text-xs text-on-surface-variant font-bold mb-1">/100</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="mt-4 flex justify-between items-end border-t border-outline-variant/10 pt-4">
                                     <div className="hidden md:flex gap-4">
                                         {/* Minimal stats if available */}
                                         {interview.logicScore && (
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="font-bold text-on-surface-variant">Logic:</span>
                                                <span className="font-bold text-on-surface">{interview.logicScore}%</span>
                                            </div>
                                         )}
                                         {interview.communicationScore && (
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="font-bold text-on-surface-variant">Comm:</span>
                                                <span className="font-bold text-on-surface">{interview.communicationScore}%</span>
                                            </div>
                                         )}
                                     </div>
                                     <button 
                                         onClick={() => setExpandedInterviewId(interview._id)}
                                         className="px-4 py-2 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all flex items-center gap-2 ml-auto shadow-sm"
                                     >
                                         <span className="material-symbols-outlined text-lg">visibility</span>
                                         <span>View Chat</span>
                                     </button>
                                </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </>
              )}
            </div>
          ) : null}


            {/* Footer */}
          <footer className="p-8 mt-12 border-t border-outline-variant/20">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-xs font-medium text-secondary">© 2023 udyogaprep. Professional AI Interview Intelligence.</p>
              <div className="flex gap-8">
                <a className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors" href="#">Help Center</a>
                <a className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors" href="#">Privacy Policy</a>
                <a className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors" href="#">Support</a>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </>
  );
}
