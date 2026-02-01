import { ArrowLeft, ChevronDown, Cookie, Shield, Settings, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface CookieType {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  required?: boolean;
}

const cookieTypes: CookieType[] = [
  {
    id: "essential",
    title: "Essential Cookies",
    description: "Required for the platform to function properly. These cannot be disabled as they are necessary for core features like authentication and security.",
    icon: Shield,
    required: true,
  },
  {
    id: "authentication",
    title: "Authentication Cookies",
    description: "Used to keep you signed in and secure your account. These cookies help us verify your identity and protect your data.",
    icon: Cookie,
  },
  {
    id: "preferences",
    title: "Preference Cookies",
    description: "Remember your settings like language, theme preferences, and display options to provide a personalized experience.",
    icon: Settings,
  },
  {
    id: "analytics",
    title: "Analytics Cookies",
    description: "Help us understand how users interact with Prangon to improve our services. We use this data to optimize performance and user experience.",
    icon: BarChart3,
  },
];

const CookiesPolicy = () => {
  const navigate = useNavigate();
  const [openSections, setOpenSections] = useState<string[]>(["essential"]);

  const toggleSection = (id: string) => {
    setOpenSections(prev => 
      prev.includes(id) 
        ? prev.filter(s => s !== id)
        : [...prev, id]
    );
  };

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
          <h1 className="font-semibold text-lg ml-2">Cookies Policy</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl font-bold mb-3 text-foreground">What Are Cookies?</h2>
          <p className="text-muted-foreground leading-relaxed">
            Cookies are small text files that are placed on your device when you visit our
            platform. They help us provide you with a better experience by remembering your
            preferences and understanding how you use Prangon.
          </p>
        </motion.section>

        {/* Cookie Types */}
        <section>
          <h3 className="text-lg font-semibold mb-4 text-foreground">Types of Cookies We Use</h3>
          <div className="space-y-3">
            {cookieTypes.map((cookie, index) => (
              <motion.div
                key={cookie.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                <Collapsible
                  open={openSections.includes(cookie.id)}
                  onOpenChange={() => toggleSection(cookie.id)}
                >
                  <CollapsibleTrigger asChild>
                    <button className={cn(
                      "w-full flex items-center justify-between p-4 rounded-xl",
                      "bg-card border border-border",
                      "hover:bg-muted/50 transition-colors",
                      "text-left"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          cookie.required ? "bg-primary/10" : "bg-muted"
                        )}>
                          <cookie.icon className={cn(
                            "h-5 w-5",
                            cookie.required ? "text-primary" : "text-muted-foreground"
                          )} />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-foreground">
                            {cookie.title}
                          </h4>
                          {cookie.required && (
                            <span className="text-xs text-primary font-medium">Required</span>
                          )}
                        </div>
                      </div>
                      <ChevronDown className={cn(
                        "h-5 w-5 text-muted-foreground transition-transform duration-200",
                        openSections.includes(cookie.id) && "rotate-180"
                      )} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-2">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {cookie.description}
                      </p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Third Party Cookies */}
        <Card className="p-4 bg-card border-border">
          <h3 className="text-base font-semibold mb-2 text-foreground">Third-Party Cookies</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Some cookies may be set by third-party services that appear on our pages, such as
            analytics providers. These help us understand how you use our platform and improve
            your experience.
          </p>
        </Card>

        {/* Managing Cookies */}
        <Card className="p-4 bg-card border-border">
          <h3 className="text-base font-semibold mb-2 text-foreground">Managing Cookies</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You can control and manage cookies through your browser settings. Note that
            disabling certain cookies may affect the functionality of Prangon. Most browsers
            allow you to view, delete, and block cookies from websites.
          </p>
        </Card>

        {/* Updates */}
        <Card className="p-4 bg-card border-border">
          <h3 className="text-base font-semibold mb-2 text-foreground">Updates to This Policy</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We may update this policy from time to time. Any changes will be posted on this
            page with an updated revision date. We encourage you to review this policy
            periodically.
          </p>
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

export default CookiesPolicy;
