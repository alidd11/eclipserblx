import { AnimatePresence, motion } from 'framer-motion';

interface MotionWordRotatorProps {
  words: string[];
  index: number;
}

export default function MotionWordRotator({ words, index }: MotionWordRotatorProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={index}
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '-100%', opacity: 0 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        className="absolute left-0"
      >
        {words[index]}
      </motion.span>
    </AnimatePresence>
  );
}
