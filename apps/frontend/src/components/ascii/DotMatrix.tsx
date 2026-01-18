'use client';

import { useEffect, useRef, useState } from 'react';

interface DotMatrixProps {
  className?: string;
}

export function DotMatrix({ className }: DotMatrixProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Dot configuration
    const dotSize = 2;
    const gap = 12;
    const rows = Math.ceil(canvas.height / gap);
    const cols = Math.ceil(canvas.width / gap);

    // Create dot grid with varying opacities
    const dots: { x: number; y: number; opacity: number; targetOpacity: number }[] = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Create wave pattern from center
        const centerX = cols / 2;
        const centerY = rows / 2;
        const distFromCenter = Math.sqrt(
          Math.pow(col - centerX, 2) + Math.pow(row - centerY, 2)
        );
        const maxDist = Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerY, 2));
        const normalizedDist = distFromCenter / maxDist;

        // More dots visible at top, fading toward center
        const baseOpacity = row < rows * 0.6
          ? Math.max(0.1, 0.5 - normalizedDist * 0.4)
          : Math.max(0, 0.3 - normalizedDist * 0.5);

        // Add some randomness
        const randomFactor = Math.random() * 0.3;
        const opacity = Math.max(0, Math.min(1, baseOpacity + randomFactor - 0.15));

        dots.push({
          x: col * gap + gap / 2,
          y: row * gap + gap / 2,
          opacity,
          targetOpacity: opacity,
        });
      }
    }

    // Animation
    let animationId: number;
    let time = 0;

    const animate = () => {
      time += 0.005;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      dots.forEach((dot, i) => {
        // Subtle wave animation
        const waveOffset = Math.sin(time + dot.x * 0.01 + dot.y * 0.01) * 0.15;
        const currentOpacity = Math.max(0, Math.min(1, dot.opacity + waveOffset));

        if (currentOpacity > 0.02) {
          ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`;
          ctx.fillRect(dot.x - dotSize / 2, dot.y - dotSize / 2, dotSize, dotSize);
        }
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className || ''}`}
    />
  );
}
