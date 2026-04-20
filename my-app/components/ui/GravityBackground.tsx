"use client";

import React, { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  color: string;
  size: number;
  vx: number;
  vy: number;
  ease: number; // For smooth return
}

const GravityBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Particle[] = [];
    let animationFrameId: number;
    let mouseX = -1000;
    let mouseY = -1000;

    // Configuration
    const particleSpacing = 25;
    const mouseRadius = 150;
    const returnSpeed = 0.08; // Lower is smoother return
    const maxDisplacement = 80;

    const baseColor = "rgba(100, 100, 100, 0.3)";
    const colors = ["#4285F4", "#EA4335", "#FBBC05", "#34A853"]; // Google colors

    const resizeOps = () => {
      if (!containerRef.current || !canvas) return;
      
      const { width, height } = containerRef.current.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;

      initParticles(width, height);
    };

    // Use ResizeObserver for robust sizing
    const resizeObserver = new ResizeObserver(() => {
        resizeOps();
    });

    if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
    }

    const initParticles = (width: number, height: number) => {
      particles = [];
      for (let x = 0; x < width; x += particleSpacing) {
        for (let y = 0; y < height; y += particleSpacing) {
          particles.push({
            x,
            y,
            originX: x,
            originY: y,
            color: baseColor,
            size: 2,
            vx: 0,
            vy: 0,
            ease: returnSpeed
          });
        }
      }
    };

    const draw = () => {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        // Calculate distance from mouse
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        let targetX = p.originX;
        let targetY = p.originY;
        let color = baseColor;
        let scale = 1;

        // Interaction
        if (dist < mouseRadius) {
          const angle = Math.atan2(dy, dx);
          const force = (mouseRadius - dist) / mouseRadius;
          const displacement = force * maxDisplacement;
          
          // Anti-gravity: Push away
          targetX -= Math.cos(angle) * displacement;
          targetY -= Math.sin(angle) * displacement;

          // Color Effect based on Angle/Position (Google Colors)
          const colorIndex = Math.floor(((angle + Math.PI) / (2 * Math.PI)) * colors.length) % colors.length;
          color = colors[colorIndex];
          scale = 1 + force; // Grow slightly when pushed
        }

        // Physics: Move towards target
        p.x += (targetX - p.x) * p.ease;
        p.y += (targetY - p.y) * p.ease;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * scale, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
        mouseX = -1000;
        mouseY = -1000;
    };

    // Initialize
    resizeOps();
    window.addEventListener("mousemove", handleMouseMove); 

    draw();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div 
        ref={containerRef} 
        style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            zIndex: -1, 
            overflow: 'hidden',
            pointerEvents: 'none',
            backgroundColor: '#f8fafc'
        }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
};

export default GravityBackground;
