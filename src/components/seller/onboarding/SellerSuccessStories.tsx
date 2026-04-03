import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Quote } from 'lucide-react';

const stories = [
  {
    name: 'BLOXPRESTIGE',
    quote: 'Eclipse made it incredibly easy to start selling my Roblox UI packs. Within a week I had my first 10 sales.',
    metric: '£120+ earned in first month',
  },
  {
    name: 'CreatorStudio',
    quote: 'The seller tools are way better than other platforms. The store builder lets me showcase my work exactly how I want.',
    metric: '50+ products listed',
  },
  {
    name: 'RBXAssets',
    quote: 'Setting up payouts was super simple. I connected PayPal and started receiving payments the same day.',
    metric: 'Same-day payouts',
  },
];

export function SellerSuccessStories() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % stories.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const story = stories[index];

  return (
    <div className="rounded-xl border border-border bg-card/50 p-5 space-y-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Quote className="h-3.5 w-3.5" />
        Seller stories
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-2"
        >
          <p className="text-sm italic text-foreground/80 leading-relaxed">
            "{story.quote}"
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">{story.name}</span>
            <span className="text-xs text-emerald-500 font-medium">{story.metric}</span>
          </div>
        </motion.div>
      </AnimatePresence>
      {/* Dots */}
      <div className="flex justify-center gap-1.5 pt-1">
        {stories.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              i === index ? 'bg-primary' : 'bg-muted-foreground/20'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
