'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface MatrixRainProps {
  className?: string;
  opacity?: number;
  speed?: number;
  density?: number;
  color?: 'yellow' | 'green' | 'white';
}

const CHARS = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン░▒▓';

interface Drop {
  x: number;
  y: number;
  speed: number;
  chars: string[];
  length: number;
}

export function MatrixRain({
  className,
  opacity = 0.04,
  speed = 1,
  density = 0.03,
  color = 'yellow',
}: MatrixRainProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drops, setDrops] = useState<Drop[]>([]);
  const animationRef = useRef<number>(0);

  const colorMap = {
    yellow: 'rgba(255, 214, 51,',
    green: 'rgba(34, 197, 94,',
    white: 'rgba(255, 255, 255,',
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const columnWidth = 14; // Approximate character width
    const columns = Math.floor(width / columnWidth);

    // Initialize drops
    const initialDrops: Drop[] = [];
    for (let i = 0; i < columns; i++) {
      if (Math.random() < density) {
        initialDrops.push(createDrop(i * columnWidth, height));
      }
    }
    setDrops(initialDrops);

    function createDrop(x: number, maxY: number): Drop {
      const length = Math.floor(Math.random() * 15) + 5;
      return {
        x,
        y: -length * 16,
        speed: (Math.random() * 2 + 1) * speed,
        chars: Array.from({ length }, () => CHARS[Math.floor(Math.random() * CHARS.length)]),
        length,
      };
    }

    let lastTime = 0;
    const animate = (time: number) => {
      const delta = time - lastTime;
      if (delta < 33) {
        // Cap at ~30fps for performance
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      lastTime = time;

      setDrops(prevDrops => {
        const newDrops = prevDrops.map(drop => {
          const newY = drop.y + drop.speed * (delta / 16);

          // Reset if off screen
          if (newY > height + drop.length * 16) {
            // Randomly respawn or remove
            if (Math.random() < 0.7) {
              return createDrop(drop.x, height);
            }
            return null;
          }

          // Randomly change some characters
          const newChars = drop.chars.map(char =>
            Math.random() < 0.02 ? CHARS[Math.floor(Math.random() * CHARS.length)] : char
          );

          return { ...drop, y: newY, chars: newChars };
        }).filter((d): d is Drop => d !== null);

        // Occasionally add new drops
        if (Math.random() < density * 0.1) {
          const x = Math.floor(Math.random() * columns) * columnWidth;
          newDrops.push(createDrop(x, height));
        }

        return newDrops;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [density, speed, color]);

  return (
    <div
      ref={containerRef}
      className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}
      style={{ opacity }}
    >
      {drops.map((drop, i) => (
        <div
          key={i}
          className="absolute font-mono text-xs leading-none"
          style={{
            left: drop.x,
            top: drop.y,
            transform: 'translateZ(0)',
            willChange: 'top',
          }}
        >
          {drop.chars.map((char, j) => {
            const charOpacity = 1 - (j / drop.length) * 0.8;
            const isHead = j === 0;
            return (
              <div
                key={j}
                style={{
                  color: `${colorMap[color]}${isHead ? 1 : charOpacity})`,
                  textShadow: isHead ? `0 0 8px ${colorMap[color]}0.8)` : undefined,
                }}
              >
                {char}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
