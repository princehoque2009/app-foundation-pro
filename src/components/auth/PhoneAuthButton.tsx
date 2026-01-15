import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { setupRecaptcha, sendOTP, verifyOTP, clearRecaptcha } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface PhoneAuthButtonProps {
  onSuccess: (firebaseUser: any, phoneNumber: string) => void;
  className?: string;
}

export const PhoneAuthButton = ({ onSuccess, className }: PhoneAuthButtonProps) => {
  const [step, setStep] = useState<"idle" | "phone" | "otp" | "verifying">("idle");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      clearRecaptcha();
    };
  }, []);

  const handleStartPhoneAuth = () => {
    setStep("phone");
  };

  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number with country code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Setup recaptcha
      const verifier = setupRecaptcha("recaptcha-container");
      await verifier.render();
      
      // Format phone number (ensure it has + prefix)
      const formattedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`;
      
      await sendOTP(formattedPhone);
      
      setStep("otp");
      setCountdown(60); // 60 second countdown for resend
      
      toast({
        title: "OTP Sent",
        description: `Verification code sent to ${formattedPhone}`,
      });
    } catch (error: any) {
      console.error("[PhoneAuth] Error sending OTP:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP",
        variant: "destructive",
      });
      clearRecaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setStep("verifying");
    setLoading(true);
    try {
      const firebaseUser = await verifyOTP(otpCode);
      
      toast({
        title: "Phone Verified",
        description: "Your phone number has been verified successfully",
      });
      
      onSuccess(firebaseUser, phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`);
    } catch (error: any) {
      console.error("[PhoneAuth] Error verifying OTP:", error);
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid OTP code",
        variant: "destructive",
      });
      setStep("otp");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    clearRecaptcha();
    await handleSendOTP();
  };

  const handleCancel = () => {
    setStep("idle");
    setPhoneNumber("");
    setOtpCode("");
    clearRecaptcha();
  };

  return (
    <div className={className}>
      {/* Hidden recaptcha container */}
      <div id="recaptcha-container" />

      <AnimatePresence mode="wait">
        {step === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 rounded-xl gap-3 bg-muted/30 border-border/50 hover:bg-muted/50"
              onClick={handleStartPhoneAuth}
            >
              <Phone className="h-5 w-5" />
              Continue with Phone
            </Button>
          </motion.div>
        )}

        {step === "phone" && (
          <motion.div
            key="phone"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label className="text-sm font-medium">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
                <Input
                  type="tel"
                  placeholder="+1234567890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="h-12 pl-12 rounded-xl bg-muted/30 border-border/50"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your phone number with country code (e.g., +1 for US)
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1 gap-2"
                onClick={handleSendOTP}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Send OTP
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {(step === "otp" || step === "verifying") && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code sent to
              </p>
              <p className="font-medium">
                {phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`}
              </p>
            </div>

            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={setOtpCode}
                disabled={step === "verifying"}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
              type="button"
              className="w-full h-12 rounded-xl gap-2"
              onClick={handleVerifyOTP}
              disabled={loading || otpCode.length !== 6}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Verify
                </>
              )}
            </Button>

            <div className="flex justify-between items-center text-sm">
              <button
                type="button"
                onClick={handleCancel}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Change number
              </button>
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={countdown > 0}
                className={`${
                  countdown > 0
                    ? "text-muted-foreground"
                    : "text-primary hover:underline"
                } transition-colors`}
              >
                {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};