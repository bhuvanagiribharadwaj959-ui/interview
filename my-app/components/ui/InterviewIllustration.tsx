import React from 'react';

interface InterviewIllustrationProps {
  variant?: 'signup' | 'login';
}

const InterviewIllustration = ({ variant = 'signup' }: InterviewIllustrationProps) => {
  const isLogin = variant === 'login';
  
  // Login: Warm/Orange-ish tint or just darker? Let's go with a complementary deep blue/purple for login to match "Welcome Back" night vibes? 
  // Or just a slight variation of the teal. 
  // Let's try mirroring the scene and slightly shifting the hue.
  
  const bgGradient = isLogin 
    ? 'linear-gradient(135deg, #6b8cce 0%, #4a6fa5 100%)' // Blue-ish for login
    : 'linear-gradient(135deg, #7da0a0 0%, #688a8a 100%)'; // Teal for signup

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: bgGradient,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.1); opacity: 0.25; }
        }
        .animate-pulse-slow { animation: pulse 6s ease-in-out infinite; }
        .character-left { animation: float 5s ease-in-out infinite; }
        .character-right { animation: float 6s ease-in-out infinite; animation-delay: 1s; }
      `}</style>
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 500 400" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        preserveAspectRatio="xMidYMid meet"
        style={{ transform: isLogin ? 'scaleX(-1)' : 'none' }}
      >
        <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                <feOffset dx="0" dy="2" result="offsetblur"/>
                <feComponentTransfer>
                    <feFuncA type="linear" slope="0.3"/>
                </feComponentTransfer>
                <feMerge> 
                    <feMergeNode/>
                    <feMergeNode in="SourceGraphic"/> 
                </feMerge>
            </filter>
        </defs>

        {/* Background Decorative Circle */}
        <circle cx="250" cy="200" r="130" fill="white" className="animate-pulse-slow" />
        
        {/* Floor Base */}
        <ellipse cx="250" cy="340" rx="200" ry="20" fill="#334155" opacity="0.2" />


        {/* --- LEFT CHARACTER GROUP (Interviewer) --- */}
        <g transform="translate(140, 160)">
          <g className="character-left">
            {/* Chair Legs */}
            <rect x="0" y="110" width="4" height="40" fill="#475569" />
            <rect x="-10" y="150" width="24" height="4" rx="2" fill="#334155" /> 

            {/* Body (Simple torso) */}
            <path d="M-10 60 Q-10 40 10 40 L30 40 Q50 40 50 60 L50 110 L-10 110 Z" fill="#1e293b" />
            
            {/* Head */}
            <circle cx="20" cy="25" r="18" fill="#ffdbac" />
            
            {/* Hair (Short) */}
            <path d="M2 20 Q2 5 20 5 Q38 5 38 20" stroke="#0f172a" strokeWidth="6" strokeLinecap="round" fill="none" />

            {/* Laptop held */}
            <rect x="25" y="70" width="35" height="25" rx="2" fill="#cbd5e1" transform="rotate(-10)" />
            
            {/* Arm */}
            <path d="M30 60 Q20 80 50 80" stroke="#ffdbac" strokeWidth="8" strokeLinecap="round" fill="none"/>
          </g>
        </g>


        {/* --- DESK (Center) --- */}
        <rect x="220" y="240" width="60" height="70" rx="2" fill="#f1f5f9" opacity="0.8" />
        <rect x="220" y="240" width="60" height="5" fill="#e2e8f0" />


        {/* --- RIGHT CHARACTER GROUP (Candidate) --- */}
        <g transform="translate(320, 160)">
          <g className="character-right">
             {/* Chair Legs */}
            <rect x="16" y="110" width="4" height="40" fill="#475569" />
            <rect x="6" y="150" width="24" height="4" rx="2" fill="#334155" />

            {/* Body */}
            <path d="M-10 60 Q-10 40 10 40 L30 40 Q50 40 50 60 L50 110 L-10 110 Z" fill="#ffffff" />
            
            {/* Head */}
            <circle cx="20" cy="25" r="18" fill="#e0ac69" />
            
            {/* Hair (Long) */}
            <path d="M20 5 Q40 5 40 30 L40 60" stroke="#4a3b2a" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M0 30 Q0 5 20 5" stroke="#4a3b2a" strokeWidth="6" strokeLinecap="round" fill="none" />

            {/* Arm holding paper */}
            <path d="M10 60 Q0 80 -20 70" stroke="#e0ac69" strokeWidth="8" strokeLinecap="round" fill="none"/>
            <rect x="-35" y="60" width="20" height="26" fill="white" stroke="#cbd5e1" transform="rotate(-10)" />
          </g>
        </g>


        {/* Connectivity Lines */}
        <path d="M180 140 Q250 120 320 140" stroke="white" strokeWidth="2" strokeDasharray="5,5" opacity="0.5" fill="none" />

        {/* Chat Bubble */}
        <g transform="translate(250, 110)">
            <rect x="-20" y="-15" width="40" height="30" rx="10" fill="white" filter="url(#shadow)" />
            <circle cx="-8" cy="0" r="3" fill="#e05a1a" />
            <circle cx="0" cy="0" r="3" fill="#e05a1a" />
            <circle cx="8" cy="0" r="3" fill="#e05a1a" />
        </g>

      </svg>
    </div>
  );
};

export default InterviewIllustration;
