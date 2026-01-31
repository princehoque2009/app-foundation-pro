import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { countryCodes } from "@/lib/countries";

interface SupabasePhoneAuthProps {
  onSuccess: (phone: string) => void;
  mode: "login" | "signup";
  className?: string;
}

export const SupabasePhoneAuth = ({ onSuccess, mode, className }: SupabasePhoneAuthProps) => {
  const [step, setStep] = useState<"idle" | "phone" | "otp" | "verifying">("idle");
  const [countryCode, setCountryCode] = useState("+880"); // Bangladesh default
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

  const handleStartPhoneAuth = () => {
    setStep("phone");
  };

  const getFullPhoneNumber = () => {
    return `${countryCode}${phoneNumber.replace(/^0+/, "")}`;
  };

  const handleSendOTP = async () => {
    const fullPhone = getFullPhoneNumber();
    
    if (phoneNumber.length < 6) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
      });

      if (error) throw error;

      setStep("otp");
      setCountdown(60);

      toast({
        title: "OTP Sent",
        description: `Verification code sent to ${fullPhone}`,
      });
    } catch (error: any) {
      console.error("[PhoneAuth] Error sending OTP:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP. Please try again.",
        variant: "destructive",
      });
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

    const fullPhone = getFullPhoneNumber();
    setStep("verifying");
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: otpCode,
        type: "sms",
      });

      if (error) throw error;

      toast({
        title: "Phone Verified",
        description: "Your phone number has been verified successfully",
      });

      onSuccess(fullPhone);
    } catch (error: any) {
      console.error("[PhoneAuth] Error verifying OTP:", error);
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid OTP code. Please try again.",
        variant: "destructive",
      });
      setStep("otp");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    await handleSendOTP();
  };

  const handleCancel = () => {
    setStep("idle");
    setPhoneNumber("");
    setOtpCode("");
  };

  return (
    <div className={className}>
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
              <div className="flex gap-2">
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger className="w-24 h-12 rounded-xl bg-muted/30 border-border/50">
                    <SelectValue placeholder="+1" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {countryCodes.map((country) => (
                      <SelectItem key={country.code} value={country.dial_code}>
                        {country.dial_code} {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
                  <Input
                    type="tel"
                    placeholder="1234567890"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                    className="h-12 pl-12 rounded-xl bg-muted/30 border-border/50"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                We'll send you a verification code via SMS
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
                disabled={loading || phoneNumber.length < 6}
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
              <p className="font-medium">{getFullPhoneNumber()}</p>
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
