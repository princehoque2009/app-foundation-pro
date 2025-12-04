import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import prangonLogo from "@/assets/prangon-logo.png";

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onComplete, 300);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!show) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{
        background: "linear-gradient(135deg, hsl(5, 100%, 69%) 0%, hsl(15, 100%, 65%) 50%, hsl(25, 100%, 70%) 100%)"
      }}
      initial={{ opacity: 1 }}
      animate={{ opacity: show ? 1 : 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Animated background circles */}
      <motion.div
        className="absolute w-96 h-96 rounded-full"
        style={{ background: "rgba(255,255,255,0.1)" }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.5, 2], opacity: [0, 0.3, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
      />
      <motion.div
        className="absolute w-64 h-64 rounded-full"
        style={{ background: "rgba(255,255,255,0.15)" }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.2, 1.5], opacity: [0, 0.4, 0] }}
        transition={{ duration: 2, delay: 0.3, repeat: Infinity, ease: "easeOut" }}
      />

      <motion.div
        className="text-center relative z-10"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          duration: 0.6, 
          ease: [0.68, -0.55, 0.265, 1.55] // Bounce effect
        }}
      >
        {/* Logo */}
        <motion.img
          src={prangonLogo}
          alt="Prangon"
          className="h-20 mx-auto mb-4 drop-shadow-2xl"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
        />

        {/* Tagline */}
        <motion.p
          className="text-white/90 text-sm tracking-[0.3em] uppercase font-medium"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          Connect • Share • Engage
        </motion.p>

        {/* Loading bar */}
        <motion.div
          className="w-32 h-1 bg-white/30 mx-auto rounded-full mt-8 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <motion.div
            className="h-full bg-white rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ delay: 0.7, duration: 1.2, ease: "easeInOut" }}
          />
        </motion.div>
      </motion.div>

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-white/30"
          initial={{ 
            x: Math.random() * 400 - 200, 
            y: 200,
            opacity: 0 
          }}
          animate={{ 
            y: -200, 
            opacity: [0, 1, 0] 
          }}
          transition={{ 
            duration: 2 + Math.random(), 
            delay: i * 0.2,
            repeat: Infinity,
            ease: "easeOut"
          }}
        />
      ))}
    </motion.div>
  );
};
