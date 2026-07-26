import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: {
      angle: number;
      radius: number;
      speed: number;
      length: number;
      color: string;
      offsetX: number;
      offsetY: number;
      vx: number;
      vy: number;
    }[] = [];
    
    let mouse = { x: -1000, y: -1000 };
    
    // Faint blue/purple dashes with low opacity
    const colors = [
      'rgba(37, 99, 235, 0.4)', // Blue
      'rgba(124, 58, 237, 0.4)', // Purple
      'rgba(59, 130, 246, 0.4)', // Lighter Blue
      'rgba(139, 92, 246, 0.4)'  // Lighter Purple
    ];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const numParticles = 400;
      const maxRadius = Math.max(canvas.width, canvas.height) / 1.2;
      
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          angle: Math.random() * Math.PI * 2,
          radius: Math.random() * maxRadius,
          speed: 0.0005 + Math.random() * 0.0015,
          length: 5 + Math.random() * 10,
          color: colors[Math.floor(Math.random() * colors.length)],
          offsetX: 0,
          offsetY: 0,
          vx: 0,
          vy: 0
        });
      }
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });
    window.addEventListener('mouseout', () => {
      mouse.x = -1000;
      mouse.y = -1000;
    });

    resize();

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      particles.forEach(p => {
        // Idle motion: slowly rotate
        p.angle += p.speed;
        
        // Base position
        const baseX = centerX + Math.cos(p.angle) * p.radius;
        const baseY = centerY + Math.sin(p.angle) * p.radius;

        // Current actual position
        const currentX = baseX + p.offsetX;
        const currentY = baseY + p.offsetY;

        // Mouse hover interaction
        const dx = mouse.x - currentX;
        const dy = mouse.y - currentY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Subtle repelling physics effect
        if (dist < 180) {
          const force = (180 - dist) / 180;
          p.vx -= (dx / dist) * force * 0.8;
          p.vy -= (dy / dist) * force * 0.8;
        }

        // Apply velocity to offset
        p.offsetX += p.vx;
        p.offsetY += p.vy;

        // Friction
        p.vx *= 0.9;
        p.vy *= 0.9;
        
        // Smoothly return to original flow (spring back to 0 offset)
        p.offsetX += (0 - p.offsetX) * 0.05;
        p.offsetY += (0 - p.offsetY) * 0.05;

        // Calculate tangent angle for the stroke direction
        // The stroke points along the circle's circumference
        const tangentAngle = p.angle + Math.PI / 2;
        
        ctx.beginPath();
        ctx.moveTo(currentX, currentY);
        ctx.lineTo(
          currentX + Math.cos(tangentAngle) * p.length, 
          currentY + Math.sin(tangentAngle) * p.length
        );
        
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      requestAnimationFrame(animate);
    };
    animate();

    return () => window.removeEventListener('resize', resize);
  }, []);

  return <canvas ref={canvasRef} className="particle-canvas" />;
};

const RANDOM_CODE = {
  javascript: `function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    let mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}`,
  python: `def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        if target - num in seen:
            return [seen[target - num], i]
        seen[num] = i
    return []`,
  cpp: `#include <vector>
#include <unordered_map>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> seen;
    for (int i = 0; i < nums.size(); i++) {
        if (seen.count(target - nums[i]))
            return {seen[target - nums[i]], i};
        seen[nums[i]] = i;
    }
    return {};
}`
};

const Hero: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<'javascript' | 'python' | 'cpp'>('javascript');
  const [code, setCode] = React.useState(RANDOM_CODE.javascript);
  const [question, setQuestion] = React.useState("Can you explain the time and space complexity of your solution? Also, how would you handle an empty array input?");
  const [loadingQuestion, setLoadingQuestion] = React.useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');

            // Stagger children if they have data-delay
            const children = entry.target.querySelectorAll('[data-delay]');
            children.forEach((child) => {
              const delay = child.getAttribute('data-delay');
              if (delay) {
                (child as HTMLElement).style.transitionDelay = `${delay}ms`;
              }
            });
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    );

    const elements = containerRef.current?.querySelectorAll('.reveal');
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const handleGenerateQuestion = async (currentCode: string, lang: string) => {
    setLoadingQuestion(true);
    try {
      const res = await fetch('/api/generate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: currentCode, language: lang })
      });
      const data = await res.json();
      if (data.question) {
        setQuestion(data.question);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingQuestion(false);
  };

  const handleTabClick = (lang: 'javascript' | 'python' | 'cpp') => {
    setActiveTab(lang);
    const newCode = RANDOM_CODE[lang];
    setCode(newCode);
    handleGenerateQuestion(newCode, lang);
  };

  const handleStartFreeTrial = () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  };

  const handleSignup = () => {
    router.push('/signup');
  };

  return (
    <div className="landing-container" ref={containerRef}>
      
      {/* Navigation */}
      <nav className="navbar reveal">
        <div className="nav-logo">
          <div className="logo-icon"></div>
          <span>Udyoga<span className="logo-accent">PRP</span></span>
        </div>
        <div className="nav-cta">
          <button className="btn-secondary" onClick={handleSignup}>Sign Up</button>
          <button className="btn-primary" onClick={handleStartFreeTrial}>Start Free Trial</button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero-section">
        <div className="hero-content">
          <div className="hero-text reveal">
            <div className="badge">
              <span className="badge-dot"></span>
              AI-Powered Interview Engineering
            </div>
            <h1 data-delay="100">
              Master Technical Interviews with <span className="text-gradient">Real-Time AI</span>
            </h1>
            <p data-delay="200">
              Elevate your career trajectory with our enterprise-grade interview simulator.
              Practice with an AI engineering manager, refine your code, and land your dream role.
            </p>
            <div className="hero-actions" data-delay="300">
              <button className="btn-primary btn-large" onClick={handleStartFreeTrial}>Schedule a Mock Interview</button>
              <button className="btn-ghost btn-large">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                Watch Demo
              </button>
            </div>
            <div className="trust-indicators" data-delay="400">
              <div className="avatars">
                <div className="avatar a1"></div>
                <div className="avatar a2"></div>
                <div className="avatar a3"></div>
                <div className="avatar a4"></div>
              </div>
              <p>Trusted by engineers at <strong>Google</strong>, <strong>Stripe</strong>, and <strong>Amazon</strong></p>
            </div>
          </div>

          {/* UI Mockups */}
          <div className="hero-visuals">
            {/* Background Professional Image */}
            <div className="mockup-image reveal" data-delay="100">
              <img src="https://lectera.com/info/storage/img/20220816/4e30305d1be37f7f6ec3_808xFull.jpg" alt="Professional Interview Environment" />
            </div>


          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="features-section split-section">
        <div className="split-left reveal">
            {/* Code Editor Mockup */}
            <div className="mockup-editor reveal" data-delay="100">
              <div className="window-header">
                <div className="window-dots">
                  <span className="dot red"></span>
                  <span className="dot yellow"></span>
                  <span className="dot green"></span>
                </div>
                <div className="window-tabs" style={{ cursor: 'pointer' }}>
                  <span className={`tab ${activeTab === 'javascript' ? 'active' : ''}`} onClick={() => handleTabClick('javascript')}>solution.js</span>
                  <span className={`tab ${activeTab === 'python' ? 'active' : ''}`} onClick={() => handleTabClick('python')}>solution.py</span>
                  <span className={`tab ${activeTab === 'cpp' ? 'active' : ''}`} onClick={() => handleTabClick('cpp')}>solution.cpp</span>
                </div>
                <button 
                  className="btn-primary btn-submit-code" 
                  onClick={() => handleGenerateQuestion(code, activeTab)}
                  disabled={loadingQuestion}
                >
                  {loadingQuestion ? 'Analyzing...' : 'Submit'}
                </button>
              </div>
              <div className="window-body" style={{ position: 'relative' }}>
                <textarea 
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="code-editor-textarea"
                  spellCheck={false}
                />
                <div className="line-numbers">
                  {code.split('\n').map((_, i) => <span key={i}>{i + 1}</span>)}
                </div>
              </div>
            </div>

            {/* Chat Interface Mockup */}
            <div className="mockup-chat reveal" data-delay="300">
              <div className="chat-header">
                <div className="chat-avatar"></div>
                <div className="chat-status">
                  <strong>AI Engineering Manager</strong>
                  <span><span className="status-dot"></span> Active</span>
                </div>
              </div>
              <div className="chat-body" style={{ overflowY: 'auto' }}>
                <div className="chat-msg ai-msg">
                  <div className="msg-avatar">AI</div>
                  <div className="msg-bubble">
                    {loadingQuestion ? 'Thinking...' : question}
                  </div>
                </div>
                {loadingQuestion && (
                  <div className="chat-msg ai-msg">
                    <div className="msg-avatar">AI</div>
                    <div className="msg-bubble typing">
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                    </div>
                  </div>
                )}
              </div>
            </div>
        </div>

        <div className="split-right reveal">
          <div className="section-header split-header">
            <h2>Enterprise Tools for Career Advancement</h2>
            <p>Everything you need to go from application to offer letter.</p>
          </div>
          <div className="feature-list">
            <div className="feature-list-item reveal" data-delay="100">
              <div className="feature-icon icon-blue">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 18l6-6-6-6" /><path d="M8 6l-6 6 6 6" /></svg>
              </div>
              <div>
                <h3>Compiler with 10+ Languages</h3>
                <p>Practice DSA rounds in your preferred language. Our real-time compiler natively supports Python, JS, C++, and more directly in your browser.</p>
              </div>
            </div>
            <div className="feature-list-item reveal" data-delay="200">
              <div className="feature-icon icon-green">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              </div>
              <div>
                <h3>Behavioral & System Design</h3>
                <p>Go beyond algorithms. Practice system design and behavioral rounds with context-aware AI interviewers.</p>
              </div>
            </div>
            <div className="feature-list-item reveal" data-delay="300">
              <div className="feature-icon icon-purple">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" /></svg>
              </div>
              <div>
                <h3>Performance Analytics</h3>
                <p>Receive detailed feedback on code efficiency, communication skills, and problem-solving speed.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="how-it-works-section">
        <div className="section-header reveal">
          <h2>How UdyogaPRP Works</h2>
          <p>A seamless process to upgrade your interviewing skills.</p>
        </div>
        <div className="steps-container">
          <div className="step-card reveal" data-delay="100">
            <div className="step-number">01</div>
            <h3>Select Your Role</h3>
            <p>Choose from Frontend, Backend, Fullstack, or Data Engineering tracks tailored to top tech companies.</p>
          </div>
          <div className="step-card reveal" data-delay="200">
            <div className="step-number">02</div>
            <h3>Live Mock Interview</h3>
            <p>Jump into a realistic voice and code-editor session. The AI adapts its questions based on your live code.</p>
          </div>
          <div className="step-card reveal" data-delay="300">
            <div className="step-number">03</div>
            <h3>Get Actionable Feedback</h3>
            <p>Receive a comprehensive report detailing your strengths and areas to improve before your real interview.</p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <div className="section-header reveal">
          <h2>Success Stories</h2>
          <p>Join thousands of engineers who landed their dream jobs.</p>
        </div>
        <div className="testimonials-grid">
          <div className="testimonial-card reveal" data-delay="100">
            <div className="testimonial-content">
              "UdyogaPRP completely changed my prep strategy. The AI caught edge cases I constantly missed, and the system design feedback was spot on. I just signed an offer at Meta."
            </div>
            <div className="testimonial-author">
              <div className="avatar a1"></div>
              <div>
                <h4>Sarah Jenkins</h4>
                <span>Software Engineer at Meta</span>
              </div>
            </div>
          </div>
          <div className="testimonial-card reveal" data-delay="200">
            <div className="testimonial-content">
              "The voice interactions mimic real interviews so well. It helped cure my interview anxiety because I got used to explaining my thought process out loud."
            </div>
            <div className="testimonial-author">
              <div className="avatar a3"></div>
              <div>
                <h4>David Chen</h4>
                <span>Backend Developer</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-section reveal">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="nav-logo">
              <div className="logo-icon"></div>
              <span>Udyoga<span className="logo-accent">PRP</span></span>
            </div>
            <p>Empowering the next generation of software engineers to ace their interviews.</p>
          </div>
          <div className="footer-links">
            <div className="link-group">
              <h4>Product</h4>
              <a href="#">Features</a>
              <a href="#">Pricing</a>
              <a href="#">Enterprise</a>
            </div>
            <div className="link-group">
              <h4>Resources</h4>
              <a href="#">Blog</a>
              <a href="#">Interview Guides</a>
              <a href="#">DSA Roadmap</a>
            </div>
            <div className="link-group">
              <h4>Company</h4>
              <a href="#">About Us</a>
              <a href="#">Careers</a>
              <a href="#">Contact</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} UdyogaPRP. All rights reserved.</p>
          <div className="legal-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Hero;