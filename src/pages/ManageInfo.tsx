import { ArrowLeft, Eye, Download, Edit3, Trash2, Lock, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface InfoOption {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  action?: () => void;
  variant?: "default" | "destructive";
}

const ManageInfo = () => {
  const navigate = useNavigate();

  const infoOptions: InfoOption[] = [
    {
      id: "access",
      title: "Access Your Information",
      description: "View all the information we have about you including posts, comments, likes, and personal details.",
      icon: Eye,
      action: () => navigate("/settings"),
    },
    {
      id: "download",
      title: "Download Your Data",
      description: "Request a copy of all your data. We'll prepare a downloadable file containing your information.",
      icon: Download,
    },
    {
      id: "update",
      title: "Update Your Information",
      description: "Edit your profile, change your username, update your bio, and modify other personal details.",
      icon: Edit3,
      action: () => navigate("/settings"),
    },
    {
      id: "privacy",
      title: "Privacy Settings",
      description: "Control who can see your content, send you messages, and interact with your profile.",
      icon: Lock,
      action: () => navigate("/settings"),
    },
    {
      id: "delete",
      title: "Delete Your Data",
      description: "Delete individual posts, comments, or your entire account. Account deletion is permanent.",
      icon: Trash2,
      variant: "destructive",
    },
  ];

  const dataUsageItems = [
    "To provide and improve our services",
    "To personalize your experience",
    "To communicate with you about your account",
    "To ensure platform safety and security",
    "To show relevant content and recommendations",
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center h-14 px-4 max-w-screen-xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-semibold text-lg ml-2">Manage Your Information</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl font-bold mb-3 text-foreground">Your Data, Your Control</h2>
          <p className="text-muted-foreground leading-relaxed">
            At Prangon, we believe you should have full control over your personal information.
            Here's how you can access, manage, and control your data.
          </p>
        </motion.section>

        {/* Options Grid */}
        <div className="space-y-3">
          {infoOptions.map((option, index) => (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              <Card
                className={cn(
                  "p-4 cursor-pointer transition-colors",
                  "hover:bg-muted/50 border-border",
                  option.variant === "destructive" && "hover:border-destructive/50"
                )}
                onClick={option.action}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "p-2.5 rounded-xl flex-shrink-0",
                    option.variant === "destructive" 
                      ? "bg-destructive/10" 
                      : "bg-primary/10"
                  )}>
                    <option.icon className={cn(
                      "h-5 w-5",
                      option.variant === "destructive" 
                        ? "text-destructive" 
                        : "text-primary"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={cn(
                      "font-semibold text-sm mb-1",
                      option.variant === "destructive" 
                        ? "text-destructive" 
                        : "text-foreground"
                    )}>
                      {option.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {option.description}
                    </p>
                  </div>
                  {option.action && (
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* How We Use Your Data */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <h3 className="text-lg font-semibold mb-4 text-foreground">How We Use Your Data</h3>
          <Card className="p-4 bg-card border-border">
            <ul className="space-y-3">
              {dataUsageItems.map((item, index) => (
                <li 
                  key={index}
                  className="flex items-start gap-3 text-sm text-muted-foreground"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        </motion.section>

        {/* Contact Section */}
        <Card className="p-4 bg-card border-border">
          <h3 className="text-base font-semibold mb-2 text-foreground">Need Help?</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            If you have questions about your data or need assistance managing your information,
            our support team is here to help.
          </p>
          <Button 
            variant="outline" 
            className="w-full rounded-full"
            onClick={() => navigate("/help-support")}
          >
            Contact Support
          </Button>
        </Card>

        {/* Footer */}
        <div className="pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Last updated: February 2026
          </p>
        </div>
      </div>
    </div>
  );
};

export default ManageInfo;
