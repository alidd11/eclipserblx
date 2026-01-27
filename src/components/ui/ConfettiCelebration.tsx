import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
  scale: number;
}

interface ConfettiCelebrationProps {
  isActive: boolean;
  onComplete?: () => void;
}

const COLORS = [
  '#FFD700', // Gold
  '#FFA500', // Orange
  '#8B5CF6', // Purple
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F43F5E', // Rose
  '#FBBF24', // Amber
  '#EC4899', // Pink
];

export function ConfettiCelebration({ isActive, onComplete }: ConfettiCelebrationProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (isActive) {
      const newPieces: ConfettiPiece[] = [];
      for (let i = 0; i < 100; i++) {
        newPieces.push({
          id: i,
          x: Math.random() * 100,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          delay: Math.random() * 0.5,
          rotation: Math.random() * 360,
          scale: 0.5 + Math.random() * 0.5,
        });
      }
      setPieces(newPieces);

      const timer = setTimeout(() => {
        setPieces([]);
        onComplete?.();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [isActive, onComplete]);

  return (
    <AnimatePresence>
      {pieces.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
          {pieces.map((piece) => (
            <motion.div
              key={piece.id}
              initial={{
                x: `${piece.x}vw`,
                y: -20,
                rotate: 0,
                scale: piece.scale,
              }}
              animate={{
                y: '110vh',
                rotate: piece.rotation + 720,
                x: `${piece.x + (Math.random() - 0.5) * 20}vw`,
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                delay: piece.delay,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="absolute w-3 h-3"
              style={{
                backgroundColor: piece.color,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                boxShadow: `0 0 6px ${piece.color}`,
              }}
            />
          ))}
          
          {/* Center burst effect */}
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,215,0,0.8) 0%, rgba(255,165,0,0.4) 50%, transparent 70%)',
            }}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
