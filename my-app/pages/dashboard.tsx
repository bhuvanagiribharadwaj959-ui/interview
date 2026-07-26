import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  BarChart, Bar, Cell
} from 'recharts';

import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebaseClient';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const rawDate = payload[0]?.payload?.date;
    const formattedDate = rawDate ? new Date(rawDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
    return (
      <div className="bg-slate-900/90 backdrop-blur-md text-white p-3.5 rounded-xl shadow-xl border border-slate-700/60 text-xs min-w-[160px] z-50">
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5 mb-2">
          <span className="font-bold text-slate-200">{label}</span>
          {formattedDate && <span className="text-[10px] text-slate-400 font-medium">{formattedDate}</span>}
        </div>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color || entry.fill }}></span>
                <span className="capitalize">{entry.name || entry.dataKey}:</span>
              </span>
              <span className="font-bold text-white">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState({
    userName: 'Student',
    readinessScore: 0,
    vocabularyScore: 0,
    totalInterviews: 0,
    currentStreak: 0,
    bestStreak: 0,
    avgDsaSolveTime: 0,
    dsaOutcomes: { accepted: 0, wrong_answer: 0, gave_up: 0 },
    skillBreakdown: {
      communication: 0,
      technical: 0,
      confidence: 0,
      logic: 0
    },
    readinessHistory: [],
    recentActivity: [],
    latestGoodTerms: [],
    latestMissedTerms: []
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
    const fetchStats = async (token: string) => {
      try {
        const res = await fetch('/api/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.status === 401) {
          throw new Error('401 Unauthorized: Your token is invalid or expired. Please clear your cache and log in again.');
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

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login?redirect=/dashboard');
        return;
      }

      // Check email verification status
      if (!user.emailVerified) {
        router.push('/verify-email');
        return;
      }

      let token = localStorage.getItem('authToken');
      if (!token || token === 'undefined' || token === 'null') {
        try {
          const res = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              displayName: user.displayName,
              uid: user.uid
            })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.token) {
              localStorage.setItem('authToken', data.token);
              token = data.token;
            }
          }
        } catch (err) {
          console.error("Failed to fetch session token:", err);
        }
      }

      if (token) {
        fetchStats(token);
      } else {
        setError("Failed to authenticate session. Please try logging in again.");
        setLoading(false);
      }
    });

    return () => unsubscribe();
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
        <aside className={`bg-white border-r border-outline-variant/30 flex flex-col fixed h-full z-50 transition-all duration-300 ${
          isSidebarCollapsed ? 'w-16 md:w-20' : 'w-16 md:w-64'
        }`}>
          <div className={`p-4 md:p-6 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-center md:justify-start gap-3'}`}>
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-black text-lg shadow-md shrink-0">
              U
            </div>
            {!isSidebarCollapsed && (
              <span className="text-xl font-extrabold text-primary font-headline tracking-tight hidden md:inline">
                udyogaprep
              </span>
            )}
          </div>
          <nav className="flex-1 px-2 md:px-3 space-y-1.5 mt-2">
            {!isSidebarCollapsed && (
              <p className="px-3 text-[10px] uppercase tracking-[0.15em] font-bold text-secondary mb-2 hidden md:block">
                Menu
              </p>
            )}

            <button 
              onClick={() => setActiveView('dashboard')} 
              title="Dashboard"
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group ${
                isSidebarCollapsed ? 'justify-center' : 'justify-center md:justify-start'
              } ${activeView === 'dashboard' ? 'sidebar-active' : 'bg-transparent text-on-surface-variant hover:bg-[#d8e2ff] hover:text-[#0058be]'}`}
            >
              <span className="material-symbols-outlined text-xl">grid_view</span>
              {!isSidebarCollapsed && <span className="font-headline text-sm hidden md:inline">Dashboard</span>}
            </button>

            <a 
              href="/interview" 
              title="Mock Interviews"
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-on-surface-variant hover:bg-[#d8e2ff] hover:text-[#0058be] transition-all group ${
                isSidebarCollapsed ? 'justify-center' : 'justify-center md:justify-start'
              }`}
            >
              <span className="material-symbols-outlined text-xl">mic</span>
              {!isSidebarCollapsed && <span className="font-headline text-sm hidden md:inline">Mock Interviews</span>}
            </a>

            <button 
              onClick={() => setActiveView('history')} 
              title="History"
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group ${
                isSidebarCollapsed ? 'justify-center' : 'justify-center md:justify-start'
              } ${activeView === 'history' ? 'sidebar-active' : 'bg-transparent text-on-surface-variant hover:bg-[#d8e2ff] hover:text-[#0058be]'}`}
            >
              <span className="material-symbols-outlined text-xl">history</span>
              {!isSidebarCollapsed && <span className="font-headline text-sm hidden md:inline">History</span>}
            </button>

            <a 
              href="/editor" 
              title="Editor"
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-on-surface-variant hover:bg-[#d8e2ff] hover:text-[#0058be] transition-all group ${
                isSidebarCollapsed ? 'justify-center' : 'justify-center md:justify-start'
              }`}
            >
              <span className="material-symbols-outlined text-xl">leaderboard</span>
              {!isSidebarCollapsed && <span className="font-headline text-sm hidden md:inline">Editor</span>}
            </a>
          </nav>

          {!isSidebarCollapsed && (
            <div className="p-4 m-3 bg-surface-container rounded-2xl hidden md:block">
              <p className="text-[10px] font-bold text-secondary mb-1 uppercase tracking-widest">Pro Plan</p>
              <p className="text-xs font-medium text-on-surface-variant mb-3">Unlock unlimited AI expert sessions.</p>
              <button className="w-full py-2 bg-on-surface text-white text-xs font-bold rounded-xl hover:bg-[#0a66c2] transition-all">Upgrade Now</button>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <main className={`flex-1 min-w-0 transition-all duration-300 min-h-screen ${
          isSidebarCollapsed ? 'ml-16 md:ml-20' : 'ml-16 md:ml-64'
        }`}>
          {/* Header */}
          <header className="h-16 bg-background/80 backdrop-blur-md border-b border-outline-variant/20 px-4 md:px-8 flex items-center justify-between sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-2 rounded-xl text-on-surface-variant hover:bg-[#d8e2ff] hover:text-[#0058be] transition-all flex items-center justify-center border border-outline-variant/20"
                title={isSidebarCollapsed ? "Expand Sidebar" : "Minimize Sidebar"}
              >
                <span className="material-symbols-outlined">{isSidebarCollapsed ? 'menu' : 'menu_open'}</span>
              </button>
              <h2 className="text-base md:text-xl font-extrabold text-on-surface font-headline tracking-tight truncate">Welcome back, {stats.userName}!</h2>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1">
                <button className="p-2 text-on-surface-variant hover:text-[#0058be] transition-all rounded-full hover:bg-[#d8e2ff] bg-transparent">
                  <span className="material-symbols-outlined">search</span>
                </button>
                <button className="p-2 text-on-surface-variant hover:text-[#0058be] relative transition-all rounded-full hover:bg-[#d8e2ff] bg-transparent">
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
                  <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-1 rounded-full uppercase tracking-wider">Wait for more data</span>
                </div>
                <div>
                  <p className="text-secondary text-xs font-bold uppercase tracking-widest mb-1">Readiness score</p>
                  <h3 className="text-3xl font-extrabold text-on-surface font-headline mb-1">{stats.readinessScore}%</h3>
                  <p className="text-secondary text-xs font-medium">Needs {Math.max(0, 5 - stats.totalInterviews)} more interviews</p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl card-shadow border border-outline-variant/10 group relative">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-secondary-container text-on-secondary-container rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">translate</span>
                  </div>
                  <span className="text-[10px] font-bold text-blue-900 bg-blue-100 px-2 py-1 rounded-full uppercase tracking-wider">Average</span>
                </div>
                <div>
                  <p className="text-secondary text-xs font-bold uppercase tracking-widest mb-1">Vocabulary</p>
                  <h3 className="text-3xl font-extrabold text-on-surface font-headline mb-1">{stats.vocabularyScore}/10</h3>
                  <p className="text-secondary text-xs font-medium">↑ +1 from last session</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl card-shadow border border-outline-variant/10">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-orange-50 text-tertiary rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">local_fire_department</span>
                  </div>
                  <span className="text-[10px] font-bold text-green-900 bg-green-100 px-2 py-1 rounded-full uppercase tracking-wider">Active</span>
                </div>
                <div>
                  <p className="text-secondary text-xs font-bold uppercase tracking-widest mb-1">Current streak</p>
                  <h3 className="text-3xl font-extrabold text-on-surface font-headline mb-1">{stats.currentStreak} days</h3>
                  <p className="text-secondary text-xs font-medium">Best: {stats.bestStreak || stats.currentStreak} days</p>
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
                  <h3 className="text-3xl font-extrabold text-on-surface font-headline mb-1">{stats.totalInterviews}</h3>
                  <p className="text-secondary text-xs font-medium">Last: {stats.recentActivity[0]?.date ? new Date(stats.recentActivity[0].date).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* SVG Gradients for Recharts */}
            <svg style={{ height: 0, width: 0, position: 'absolute' }}>
              <defs>
                <linearGradient id="techGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="dsaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d97706" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="psGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="vocabCorrect" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="vocabIncorrect" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#e11d48" stopOpacity={0.8} />
                </linearGradient>
              </defs>
            </svg>

            {/* Graphs Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Readiness over time */}
              <div className="bg-white p-6 md:p-8 rounded-2xl card-shadow border border-slate-200/80 transition-all hover:shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h4 className="text-lg font-extrabold text-slate-900 font-headline tracking-tight">Readiness over time</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Score breakdown per interview session</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-blue-600 rounded-sm"></span> Technical</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span> Comm</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-amber-500 rounded-sm"></span> DSA</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-purple-500 rounded-sm"></span> Problem Solving</span>
                  </div>
                </div>

                <div className="h-60 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.readinessHistory.filter(d => d.hasData)} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} dy={10} />
                      <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Bar dataKey="technical" name="Technical" fill="url(#techGrad)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="communication" name="Communication" fill="url(#commGrad)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="dsa" name="DSA" fill="url(#dsaGrad)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="problem_solving" name="Problem Solving" fill="url(#psGrad)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Skill Radar */}
              <div className="bg-white p-6 md:p-8 rounded-2xl card-shadow border border-slate-200/80 transition-all hover:shadow-md">
                <div className="mb-4">
                  <h4 className="text-lg font-extrabold text-slate-900 font-headline tracking-tight">Skill radar</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Latest interview performance profile</p>
                </div>
                <div className="h-64 w-full flex items-center justify-center">
                  {(() => {
                    const latest = stats.readinessHistory.filter(d => d.hasData).slice(-1)[0];
                    if (!latest) return <div className="text-slate-400 text-xs text-center italic">No interview data available yet</div>;
                    const radarData = [
                      { subject: 'Technical', score: latest.technical, fullMark: 10 },
                      { subject: 'Communication', score: latest.communication, fullMark: 10 },
                      { subject: 'DSA', score: latest.dsa, fullMark: 10 },
                      { subject: 'Confidence', score: latest.confidence, fullMark: 10 },
                      { subject: 'Problem Solving', score: latest.problem_solving, fullMark: 10 }
                    ];
                    return (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="68%" data={radarData}>
                          <PolarGrid stroke="#e2e8f0" gridType="polygon" />
                          <PolarAngleAxis dataKey="subject" tick={{fontSize: 11, fontWeight: 700, fill: '#334155'}} />
                          <Radar name="Score" dataKey="score" stroke="#6366f1" strokeWidth={2} fill="#818cf8" fillOpacity={0.35} />
                          <RechartsTooltip content={<CustomTooltip />} />
                        </RadarChart>
                      </ResponsiveContainer>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Graphs Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* DSA Performance */}
              <div className="bg-white p-6 md:p-8 rounded-2xl card-shadow border border-slate-200/80 flex flex-col justify-between transition-all hover:shadow-md">
                <div>
                  <div className="mb-4">
                    <h4 className="text-lg font-extrabold text-slate-900 font-headline tracking-tight">DSA performance</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Coding challenge outcomes</p>
                  </div>
                  
                  <div className="h-48 w-full mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Accepted', value: stats.dsaOutcomes?.accepted || 0, fill: '#10b981' },
                        { name: 'Wrong Answer', value: stats.dsaOutcomes?.wrong_answer || 0, fill: '#f59e0b' },
                        { name: 'Gave Up', value: stats.dsaOutcomes?.gave_up || 0, fill: '#f43f5e' }
                      ]} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} dy={10} />
                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} />
                        <RechartsTooltip cursor={{fill: '#f8fafc'}} content={<CustomTooltip />} />
                        <Bar dataKey="value" name="Submissions" radius={[6, 6, 0, 0]} maxBarSize={64}>
                          {[
                            { fill: '#10b981' },
                            { fill: '#f59e0b' },
                            { fill: '#f43f5e' }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">Avg Solve Time</p>
                    <h3 className="text-2xl font-extrabold text-slate-900 font-headline">{stats.avgDsaSolveTime || 0} min</h3>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                    Target: under 10 min
                  </span>
                </div>
              </div>

              {/* Vocabulary Stacked Bar */}
              <div className="bg-white p-6 md:p-8 rounded-2xl card-shadow border border-slate-200/80 flex flex-col justify-between transition-all hover:shadow-md">
                <div>
                  <div className="mb-4">
                    <h4 className="text-lg font-extrabold text-slate-900 font-headline tracking-tight">Vocabulary terms used</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Correct vs incorrect per session</p>
                  </div>
                  
                  <div className="h-48 w-full mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.readinessHistory.filter(d => d.hasData)} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Bar dataKey="vocabulary_correct" name="Correct Terms" stackId="a" fill="url(#vocabCorrect)" />
                        <Bar dataKey="vocabulary_incorrect" name="Incorrect Terms" stackId="a" fill="url(#vocabIncorrect)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                {(() => {
                  const skills = [
                    { name: 'Technical Depth', score: stats.skillBreakdown.technical },
                    { name: 'Communication', score: stats.skillBreakdown.communication },
                    { name: 'Confidence', score: stats.skillBreakdown.confidence },
                    { name: 'DSA', score: stats.skillBreakdown.logic }
                  ];
                  const weakest = skills.sort((a, b) => a.score - b.score)[0];
                  if (!weakest) return null;
                  return (
                    <div className="bg-amber-50 border border-amber-200/70 p-3.5 rounded-xl flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-amber-600">trending_down</span>
                        <div>
                          <h5 className="font-bold text-amber-950 text-xs">Focus Area: {weakest.name}</h5>
                          <p className="text-[11px] text-amber-800 mt-0.5">Your {weakest.name} score needs improvement. Focus on this area in your next session to raise overall readiness.</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Readiness Score Breakdown */}
            <div className="bg-white p-6 md:p-8 rounded-2xl card-shadow border border-slate-200/80 transition-all hover:shadow-md">
              <div className="mb-6">
                <h4 className="text-lg font-extrabold text-slate-900 font-headline tracking-tight">Readiness score breakdown</h4>
                <p className="text-xs text-slate-500 mt-0.5">How your {stats.readinessScore}% overall readiness is calculated</p>
              </div>
              
              {(() => {
                 const latest = stats.readinessHistory.filter(d => d.hasData).slice(-1)[0] || { technical: 0, communication: 0, dsa: 0, problem_solving: 0 };
                 const bars = [
                   { name: 'Technical depth', weight: '30%', score: latest.technical, color: 'bg-gradient-to-r from-blue-600 to-blue-500' },
                   { name: 'Communication', weight: '20%', score: latest.communication, color: 'bg-gradient-to-r from-emerald-600 to-emerald-500' },
                   { name: 'DSA performance', weight: '30%', score: latest.dsa, color: 'bg-gradient-to-r from-amber-500 to-amber-400' },
                   { name: 'Problem solving', weight: '20%', score: latest.problem_solving, color: 'bg-gradient-to-r from-purple-600 to-purple-500' },
                 ];
                 return (
                   <div className="space-y-5 mt-2">
                     {bars.map((bar, i) => (
                       <div key={i} className="flex flex-col gap-1.5">
                         <div className="flex justify-between items-center text-xs font-semibold">
                           <span className="text-slate-800">{bar.name} <span className="text-slate-400 text-[11px] font-normal ml-1">({bar.weight} weight)</span></span>
                           <span className="text-blue-600 font-bold">{bar.score}/10</span>
                         </div>
                         <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                           <div className={`${bar.color} h-full rounded-full transition-all duration-500`} style={{width: `${(bar.score / 10) * 100}%`}}></div>
                         </div>
                       </div>
                     ))}
                   </div>
                 );
              })()}
            </div>
          </div>
) : null}

          {activeView === 'history' ? (
            <div className="p-4 sm:p-6 md:p-8 w-full max-w-5xl mx-auto min-w-0">
              {expandedInterviewId ? (
                 <div className="flex flex-col gap-6">
                    <button 
                      onClick={() => setExpandedInterviewId(null)}
                      className="flex items-center gap-2 text-primary font-bold hover:bg-[#d8e2ff] hover:text-[#0058be] px-3 py-1 rounded-lg transition-all mb-4 w-fit"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                        Back to History
                    </button>
                    {(() => {
                        const interview = interviewHistory.find(i => i._id === expandedInterviewId);
                        if (!interview) return <div className="text-center p-8">Interview not found.</div>;
                        return (
                            <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/20 overflow-hidden flex flex-col h-[calc(100vh-200px)]">
                                <div className="p-4 sm:p-6 border-b border-outline-variant/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-surface-container-lowest">
                                    <div>
                                        <h3 className="text-lg sm:text-xl font-bold text-on-surface font-headline">{interview.type || 'Mock Interview'}</h3>
                                        <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
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
                                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-surface-container-low space-y-6">
                                    {interview.transcript && interview.transcript.length > 0 ? (
                                        interview.transcript.map((msg: any, idx: number) => (
                                            <div key={idx} className={`flex gap-3 sm:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-primary text-on-primary' : 'bg-tertiary-container text-on-tertiary-container'}`}>
                                                    <span className="material-symbols-outlined text-xs sm:text-sm">
                                                        {msg.role === 'user' ? 'person' : 'smart_toy'}
                                                    </span>
                                                </div>
                                                <div className={`p-3.5 sm:p-4 rounded-2xl max-w-[85%] sm:max-w-[80%] shadow-sm ${
                                                    msg.role === 'user' 
                                                    ? 'bg-primary text-on-primary rounded-tr-none' 
                                                    : 'bg-white text-on-surface rounded-tl-none border border-outline-variant/10'
                                                }`}>
                                                    <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-on-surface-variant opacity-60">
                                            <span className="material-symbols-outlined text-4xl mb-2">chat_bubble_outline</span>
                                            <p>No transcript available for this session.</p>
                                        </div>
                                    )}
                                    {interview.expected_answer && (
                                        <div className="mt-8 bg-green-50 border border-green-200 p-4 sm:p-5 rounded-2xl">
                                            <div className="flex items-center gap-2 text-green-800 font-bold mb-2 text-xs sm:text-sm">
                                                <span className="material-symbols-outlined text-green-600">lightbulb</span>
                                                Ideal Answer (from AI Evaluator)
                                            </div>
                                            <p className="text-xs sm:text-sm text-green-900 leading-relaxed whitespace-pre-wrap">{interview.expected_answer}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                 </div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <h2 className="text-xl sm:text-2xl font-extrabold text-on-surface font-headline truncate">Interview History</h2>
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
                      className="px-3.5 py-2 rounded-lg bg-red-50 text-red-600 font-bold text-xs sm:text-sm hover:bg-red-100 transition-all flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto shrink-0"
                    >
                      <span className="material-symbols-outlined text-base sm:text-lg">delete</span>
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
                          <div key={i} className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 sm:p-6 bg-white rounded-xl shadow-sm border border-outline-variant/10 hover:shadow-md transition-all group min-w-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-primary text-xl">forum</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 gap-2">
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-base sm:text-lg text-on-surface font-headline group-hover:text-primary transition-colors truncate">{interview.type || 'Mock Interview'}</h4>
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-on-surface-variant mt-1">
                                            <span className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-xs">calendar_today</span>
                                                {new Date(interview.startTime || interview.date).toLocaleDateString()}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-outline-variant hidden sm:inline-block"></span>
                                            <span className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-xs">schedule</span>
                                                {interview.duration || '0m'}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-outline-variant hidden sm:inline-block"></span>
                                            <span className="capitalize">{interview.difficulty || 'Medium'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
                                        <div className="text-left sm:text-right">
                                            <p className="text-[10px] sm:text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-0.5">Score</p>
                                            <div className="flex items-end justify-start sm:justify-end gap-1">
                                                <span className="text-xl sm:text-2xl font-black text-primary font-headline leading-none">{interview.readinessScore || interview.score || 0}</span>
                                                <span className="text-xs text-on-surface-variant font-bold mb-0.5">/100</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-outline-variant/10 pt-4">
                                     <div className="flex flex-wrap gap-3 sm:gap-4 text-xs">
                                         {interview.technicalScore !== undefined && (
                                            <div className="flex items-center gap-1">
                                                <span className="font-bold text-on-surface-variant">Tech:</span>
                                                <span className="font-bold text-on-surface">{interview.technicalScore}%</span>
                                            </div>
                                         )}
                                         {interview.communicationScore !== undefined && (
                                            <div className="flex items-center gap-1">
                                                <span className="font-bold text-on-surface-variant">Comm:</span>
                                                <span className="font-bold text-on-surface">{interview.communicationScore}%</span>
                                            </div>
                                         )}
                                         {interview.logicScore !== undefined && (
                                            <div className="flex items-center gap-1">
                                                <span className="font-bold text-on-surface-variant">DSA:</span>
                                                <span className="font-bold text-on-surface">{interview.logicScore}%</span>
                                            </div>
                                         )}
                                         {interview.confidenceScore !== undefined && (
                                            <div className="flex items-center gap-1">
                                                <span className="font-bold text-on-surface-variant">Conf:</span>
                                                <span className="font-bold text-on-surface">{interview.confidenceScore}%</span>
                                            </div>
                                         )}
                                     </div>
                                     <button 
                                         onClick={() => setExpandedInterviewId(interview._id)}
                                         className="px-4 py-2 rounded-lg bg-primary text-white font-bold text-xs sm:text-sm hover:bg-[#0a66c2] transition-all flex items-center justify-center gap-2 sm:ml-auto shadow-sm w-full sm:w-auto shrink-0"
                                     >
                                         <span className="material-symbols-outlined text-base">visibility</span>
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
