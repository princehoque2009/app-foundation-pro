import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onComplete, 500);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!show) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-accent"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.5, delay: 2 }}
    >
      <motion.div
        className="text-center relative"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Decorative circles */}
        <motion.div
          className="absolute -top-20 -left-20 w-40 h-40 bg-white/10 rounded-full blur-2xl"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-2xl"
          animate={{ scale: [1.2, 1, 1.2], rotate: [360, 180, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        
        <motion.h1
          className="text-7xl font-bold text-white mb-4 relative z-10"
          style={{ 
            fontFamily: "'Segoe Script', 'Brush Script MT', cursive",
            textShadow: '0 4px 20px rgba(0,0,0,0.3)',
            letterSpacing: '0.05em'
          }}
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Prangon
        </motion.h1>
        <motion.p
          className="text-white/90 text-sm tracking-widest uppercase relative z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          Connect • Share • Engage
        </motion.p>
        <motion.div
          className="w-24 h-1 bg-white/80 mx-auto rounded-full mt-6 relative z-10"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.8, duration: 0.8 }}
        />
      </motion.div>
    </motion.div>
  );
};
