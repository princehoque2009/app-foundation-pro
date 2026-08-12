import { ArrowLeft, Heart, Globe, Shield, Users, ChevronRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import prangonLogo from "@/assets/prangon-logo.png";
import { getVersionInfo } from "@/lib/version";
import { cn } from "@/lib/utils";

const values = [
  {
    icon: Heart,
    title: "Authentic",
    description: "Real connections matter",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  {
    icon: Globe,
    title: "Global",
    description: "Connecting worldwide",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Shield,
    title: "Safe",
    description: "Your privacy protected",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: Users,
    title: "Community",
    description: "Built for everyone",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
];

const features = [
  "Share moments with photos, videos, and stories",
  "Connect with friends through instant messaging and video calls",
  "Discover trending content with AI-powered recommendations",
  "Create and join Circles for intimate group sharing",
  "Go live and engage with your audience in real-time",
];

const legalLinks = [
  { label: "Community Standards", path: "/community-standards" },
  { label: "Cookies Policy", path: "/cookies-policy" },
  { label: "Privacy Policy", path: "/settings" },
  { label: "Manage Your Information", path: "/manage-info" },
];

const About = () => {
  const navigate = useNavigate();
  const versionInfo = getVersionInfo();

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
          <h1 className="font-semibold text-lg ml-2">About Prangon</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-8">
        {/* Logo & Name */}
        <motion.div 
          className="text-center py-6"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="relative inline-block">
            <img
              src={prangonLogo}
              alt="Prangon brand mark — social networking app logo"
              className="w-24 h-24 mx-auto rounded-2xl shadow-lg"
            />
            <motion.div
              className="absolute -top-1 -right-1 p-1.5 bg-primary rounded-full shadow-lg"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 400 }}
            >
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            </motion.div>
          </div>
          <h2 className="text-2xl font-bold mt-4 text-foreground">{versionInfo.name}</h2>
          <p className="text-muted-foreground text-sm">Version {versionInfo.version}</p>
        </motion.div>

        {/* Mission */}
        <motion.section 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <h2 className="text-xl font-bold mb-3 text-foreground">Our Mission</h2>
          <p className="text-muted-foreground leading-relaxed">
            To create a next-generation social networking platform that reimagines social
            interaction through innovative features and AI-enhanced experiences, connecting
            people in meaningful ways.
          </p>
        </motion.section>

        {/* Values */}
        <motion.div 
          className="grid grid-cols-2 gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          {values.map((value, index) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.05, duration: 0.3 }}
            >
              <Card className="p-4 text-center bg-card border-border hover:shadow-md transition-shadow">
                <div className={cn(
                  "w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center",
                  value.bgColor
                )}>
                  <value.icon className={cn("h-6 w-6", value.color)} />
                </div>
                <h3 className="font-semibold text-foreground">{value.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{value.description}</p>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Features */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <h3 className="text-lg font-semibold mb-4 text-foreground">Key Features</h3>
          <Card className="p-4 bg-card border-border">
            <ul className="space-y-3">
              {features.map((feature, index) => (
                <li 
                  key={index}
                  className="flex items-start gap-3 text-sm"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </Card>
        </motion.section>

        {/* Legal Links */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <h3 className="text-lg font-semibold mb-3 text-foreground">Legal & Privacy</h3>
          <div className="space-y-1">
            {legalLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={cn(
                  "w-full flex items-center justify-between p-3.5 rounded-xl",
                  "hover:bg-muted transition-colors text-left"
                )}
              >
                <span className="text-sm text-foreground">{link.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </motion.section>

        {/* Footer */}
        <motion.div 
          className="text-center pt-6 border-t border-border space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <p className="text-sm text-muted-foreground">
            {versionInfo.copyright}
          </p>
          <p className="text-xs text-muted-foreground/60">
            Made with ❤️ for connecting people
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default About;
