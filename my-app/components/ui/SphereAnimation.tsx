import React, { useRef, useEffect } from 'react';

interface SphereAnimationProps {
  isSpeaking: boolean;
}

export const SphereAnimation: React.FC<SphereAnimationProps> = ({ isSpeaking }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    // Configuration
    const particleCount = 600;
    const baseRadius = 120; // Base size of the sphere
    const turnSpeed = 0.002;
    
    // Particles
    const particles: { x: number; y: number; z: number; size: number; color: string }[] = [];

    // Initialize particles on a sphere
    for (let i = 0; i < particleCount; i++) {
        // Uniform distribution on sphere
        const costheta = 1 - 2 * Math.random();
        const sintheta = Math.sqrt(1 - costheta * costheta);
        const phi = 2 * Math.PI * Math.random();
        
        const x = baseRadius * sintheta * Math.cos(phi);
        const y = baseRadius * sintheta * Math.sin(phi);
        const z = baseRadius * costheta;

        particles.push({ x, y, z, size: 1.5, color: '#8888ff' }); // Blueish purple
    }

    const render = () => {
      time += 0.05;
      
      // Dynamic vibration/expansion based on isSpeaking
      // If speaking, add a high frequency noise to the radius or position
      const vibration = isSpeaking ? (Math.sin(time * 10) * 5 + Math.random() * 3) : 0;
      const currentRadius = baseRadius + vibration;

      // Clear canvas
      ctx.fillStyle = '#000000'; // Black background
      ctx.fillRect(0, 0, canvas.width, canvas.height); // Ensure full clear

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Sort particles by Z for depth sorting (painters algorithm)
      // We need to rotate them first to know their true Z
      
      // Rotation angles
      const angleX = time * turnSpeed;
      const angleY = time * turnSpeed * 0.5;

      const sinX = Math.sin(angleX);
      const cosX = Math.cos(angleX);
      const sinY = Math.sin(angleY);
      const cosY = Math.cos(angleY);

      // Transform and Draw
      const projectedParticles = particles.map(p => {
        // Apply vibration to the base position vector before rotation
        // Normalize p (which is on sphere surface) and scale by currentRadius
        // Start with original sphere coords (we stored them in p.x, p.y, p.z)
        // But to avoid drift, we treat p.x,p.y,p.z as the unit vector direction * baseRadius.
        // Actually, we initialized them with baseRadius. Let's re-normalize to apply vibration.
        
        const len = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
        const nx = p.x / len;
        const ny = p.y / len;
        const nz = p.z / len;

        const effectiveR = currentRadius; // Apply global vibration
        // Or apply per-particle noise for "fuzzy" look if speaking
        const fuzzy = isSpeaking ? (Math.random() - 0.5) * 5 : 0;
        
        let x = nx * (effectiveR + fuzzy);
        let y = ny * (effectiveR + fuzzy);
        let z = nz * (effectiveR + fuzzy);

        // Rotation Y
        let x1 = x * cosY - z * sinY;
        let z1 = z * cosY + x * sinY;
        
        // Rotation X
        let y2 = y * cosX - z1 * sinX;
        let z2 = z1 * cosX + y * sinX; // New Z
        
        return { x: x1, y: y2, z: z2, size: p.size, color: p.color };
      });

      // Sort by Z (furthest first)
      projectedParticles.sort((a, b) => a.z - b.z);

      projectedParticles.forEach(p => {
        // Perspective projection
        const fov = 300;
        const scale = fov / (fov + p.z + 200); // 200 is camera distance offset

        const x2d = p.x * scale + cx;
        const y2d = p.y * scale + cy;

        // Fade out back particles
        const alpha = Math.max(0, Math.min(1, (scale - 0.5) * 2));
        
        if (scale > 0) {
            ctx.beginPath();
            ctx.arc(x2d, y2d, p.size * scale, 0, Math.PI * 2);
            
            // Generate glowing color
            // Blue/Purple gradient
            // If speaking, maybe brighter?
            const intensity = isSpeaking ? 150 : 100;
            const r = 100;
            const g = isSpeaking ? 50 : 50; 
            const b = 255;
            
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isSpeaking]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-black overflow-hidden relative">
        {/* Glow effect behind */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-900/20 blur-[100px] rounded-full pointer-events-none" />
        <canvas 
            ref={canvasRef} 
            width={600} 
            height={600} 
            className="z-10 w-full h-full object-contain"
        />
    </div>
  );
};
