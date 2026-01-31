import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  MessageCircle, 
  Users, 
  Video, 
  Bell, 
  Share2, 
  Shield,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface OnboardingSlidesProps {
  onComplete: () => void;
}

const slides = [
  {
    icon: MessageCircle,
    title: "Real-time Messaging",
    description: "Chat instantly with friends using our lightning-fast messaging system. Send text, photos, videos, and voice messages.",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Video,
    title: "Voice & Video Calls",
    description: "Connect face-to-face with crystal-clear voice and video calls. Stay close to your loved ones, no matter the distance.",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: Users,
    title: "Groups & Circles",
    description: "Create groups for your communities, teams, or close friends. Share moments and stay connected together.",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: Share2,
    title: "Share Your Moments",
    description: "Post photos, videos, and stories. Express yourself and let your friends see what you're up to.",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    icon: Bell,
    title: "Stay Updated",
    description: "Never miss a message or update with smart notifications tailored to your preferences.",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    icon: Shield,
    title: "Your Privacy Matters",
    description: "Your data is secure with us. We prioritize your privacy with end-to-end encryption and robust security measures.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
];

export const OnboardingSlides = ({ onComplete }: OnboardingSlidesProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setDirection(1);
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(currentSlide - 1);
    }
  };

  const goToSlide = (index: number) => {
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  };

  const slide = slides[currentSlide];
  const SlideIcon = slide.icon;

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-background flex flex-col"
      style={{ 
        paddingTop: 'env(safe-area-inset-top)', 
        paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' 
      }}
    >
      {/* Skip button */}
      <div className="flex justify-end p-4">
        <Button 
          variant="ghost" 
          onClick={onComplete}
          className="text-muted-foreground"
        >
          Skip
        </Button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="flex flex-col items-center text-center"
          >
            {/* Icon */}
            <div className={cn(
              "w-32 h-32 rounded-full flex items-center justify-center mb-8",
              slide.bgColor
            )}>
              <SlideIcon className={cn("w-16 h-16", slide.color)} />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold mb-4">{slide.title}</h2>

            {/* Description */}
            <p className="text-muted-foreground max-w-sm leading-relaxed">
              {slide.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Pagination dots */}
      <div className="flex justify-center gap-2 py-6">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              index === currentSlide 
                ? "w-8 bg-primary" 
                : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
          />
        ))}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between px-6 pb-4">
        <Button
          variant="ghost"
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className={cn(currentSlide === 0 && "invisible")}
        >
          <ChevronLeft className="h-5 w-5 mr-1" />
          Back
        </Button>

        <Button onClick={nextSlide} className="min-w-[120px]">
          {currentSlide === slides.length - 1 ? (
            "Get Started"
          ) : (
            <>
              Next
              <ChevronRight className="h-5 w-5 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
