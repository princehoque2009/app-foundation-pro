import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, Sparkles, Calendar, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { ForgotPasswordDialog } from "@/components/auth/ForgotPasswordDialog";
import prangonLogo from "@/assets/prangon-logo.png";
import { Progress } from "@/components/ui/progress";

// Calculate age from DOB
const calculateAge = (dob: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
};

const emailSchema = z.string().email("Invalid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const usernameSchema = z.string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be less than 30 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores");
const displayNameSchema = z.string().min(1, "Full name is required");
const dateOfBirthSchema = z.string().refine((val) => {
  const date = new Date(val);
  if (isNaN(date.getTime())) return false;
  const age = calculateAge(date);
  return age >= 13;
}, "You must be at least 13 years old");

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

type SignupStep = "auth" | "identity" | "profile" | "complete";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [signupStep, setSignupStep] = useState<SignupStep>("auth");
  const [searchParams] = useSearchParams();
  
  // Auth step data
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Identity step data
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  
  // Profile step data
  const [dateOfBirth, setDateOfBirth] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  // Handle password reset redirect
  useEffect(() => {
    if (searchParams.get("reset") === "true") {
      toast({
        title: "Password Reset",
        description: "You can now set a new password after logging in.",
      });
    }
  }, [searchParams]);

  const getStepProgress = () => {
    switch (signupStep) {
      case "auth": return 33;
      case "identity": return 66;
      case "profile": return 100;
      case "complete": return 100;
      default: return 0;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = loginSchema.parse({ email, password });

      const { error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) throw error;

      navigate("/");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to login",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      setSignupStep("identity");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };

  const handleIdentitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      displayNameSchema.parse(displayName);
      usernameSchema.parse(username);
      
      // Check if username is available
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();
      
      if (existingUser) {
        toast({
          title: "Username taken",
          description: "This username is already in use",
          variant: "destructive",
        });
        return;
      }
      
      setSignupStep("profile");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      dateOfBirthSchema.parse(dateOfBirth);
      
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            username,
            display_name: displayName,
            date_of_birth: dateOfBirth,
          },
        },
      });

      if (error) throw error;

      setSignupStep("complete");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to create account",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToAuth = () => {
    setSignupStep("auth");
  };

  const getMaxDate = () => {
    const today = new Date();
    today.setFullYear(today.getFullYear() - 13);
    return today.toISOString().split('T')[0];
  };

  const resetForm = () => {
    setIsLogin(true);
    setSignupStep("auth");
    setEmail("");
    setPassword("");
    setUsername("");
    setDisplayName("");
    setDateOfBirth("");
  };

  // Completion screen
  if (signupStep === "complete") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Account Created!</h1>
          <p className="text-muted-foreground mb-6">
            Please check your email to verify your account.
          </p>
          <Button onClick={resetForm} className="w-full">
            Back to Login
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-card/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-border/50 overflow-hidden">
          {/* Header */}
          <div className="pt-8 pb-4 px-8 text-center">
            {/* Back button for signup steps */}
            {!isLogin && signupStep !== "auth" && (
              <button
                onClick={() => {
                  if (signupStep === "identity") handleBackToAuth();
                  else if (signupStep === "profile") setSignupStep("identity");
                }}
                className="absolute top-6 left-6 p-2 rounded-full hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative inline-block"
            >
              <img
                src={prangonLogo}
                alt="Prangon"
                className="h-12 mx-auto drop-shadow-lg"
              />
              <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-primary animate-pulse" />
            </motion.div>
            
            {/* Progress bar for signup */}
            {!isLogin && (
              <div className="mt-4 px-4">
                <Progress value={getStepProgress()} className="h-1" />
                <p className="text-xs text-muted-foreground mt-2">
                  Step {signupStep === "auth" ? 1 : signupStep === "identity" ? 2 : 3} of 3
                </p>
              </div>
            )}
            
            <p className="text-muted-foreground mt-3 text-sm">
              {isLogin 
                ? "Welcome back! Sign in to continue"
                : signupStep === "auth"
                  ? "Create your account with email"
                  : signupStep === "identity"
                    ? "Tell us about yourself"
                    : "Just a few more details"
              }
            </p>
          </div>

          {/* Form content */}
          <div className="px-8 pb-8">
            <AnimatePresence mode="wait">
              {/* LOGIN FORM */}
              {isLogin && (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleLogin}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-12 pl-12 rounded-xl bg-muted/30 border-border/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-12 pl-12 pr-12 rounded-xl bg-muted/30 border-border/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-12 rounded-xl" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-4 bg-card text-muted-foreground">or continue with</span>
                    </div>
                  </div>
                  
                  <GoogleAuthButton mode="login" className="h-12 rounded-xl" />
                </motion.form>
              )}

              {/* SIGNUP STEP 1: AUTH METHOD */}
              {!isLogin && signupStep === "auth" && (
                <motion.div
                  key="signup-auth"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <form onSubmit={handleEmailSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-12 pl-12 rounded-xl bg-muted/30 border-border/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="At least 6 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-12 pl-12 pr-12 rounded-xl bg-muted/30 border-border/50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/50"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full h-12 rounded-xl gap-2">
                      Continue with Email
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </form>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-4 bg-card text-muted-foreground">or</span>
                    </div>
                  </div>

                  <GoogleAuthButton mode="signup" className="h-12 rounded-xl" />
                </motion.div>
              )}

              {/* SIGNUP STEP 2: IDENTITY */}
              {!isLogin && signupStep === "identity" && (
                <motion.form
                  key="signup-identity"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleIdentitySubmit}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
                      <Input
                        type="text"
                        placeholder="Your full name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="h-12 pl-12 rounded-xl bg-muted/30 border-border/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Username</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50">@</span>
                      <Input
                        type="text"
                        placeholder="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                        className="h-12 pl-10 rounded-xl bg-muted/30 border-border/50"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Letters, numbers, and underscores only
                    </p>
                  </div>

                  <Button type="submit" className="w-full h-12 rounded-xl gap-2">
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </motion.form>
              )}

              {/* SIGNUP STEP 3: PROFILE */}
              {!isLogin && signupStep === "profile" && (
                <motion.form
                  key="signup-profile"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleProfileSubmit}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
                      <Input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        max={getMaxDate()}
                        className="h-12 pl-12 rounded-xl bg-muted/30 border-border/50"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      You must be at least 13 years old to use Prangon
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-muted/30 space-y-2">
                    <p className="text-sm font-medium">Review Your Details</p>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>📧 {email}</p>
                      <p>👤 {displayName}</p>
                      <p>@ {username}</p>
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-12 rounded-xl gap-2" disabled={loading}>
                    {loading ? "Creating Account..." : "Create Account"}
                    <CheckCircle className="h-4 w-4" />
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    By creating an account, you agree to our{" "}
                    <a href="#" className="text-primary hover:underline">Terms of Service</a>
                    {" "}and{" "}
                    <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                  </p>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Switch login/signup */}
            {signupStep === "auth" && (
              <p className="text-center text-sm text-muted-foreground mt-6">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => {
                    const newIsLogin = !isLogin;
                    setEmail("");
                    setPassword("");
                    setUsername("");
                    setDisplayName("");
                    setDateOfBirth("");
                    setSignupStep("auth");
                    setIsLogin(newIsLogin);
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Support email */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          Need help?{" "}
          <a href="mailto:service.prangon@outlook.com" className="text-primary hover:underline">
            service.prangon@outlook.com
          </a>
        </p>
      </motion.div>

      {/* Forgot Password Dialog */}
      <ForgotPasswordDialog
        open={showForgotPassword}
        onOpenChange={setShowForgotPassword}
      />
    </div>
  );
};

export default Auth;