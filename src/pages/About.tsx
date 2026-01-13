import { ArrowLeft, Heart, Globe, Shield, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import prangonLogo from "@/assets/prangon-logo.png";

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
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
        <div className="text-center">
          <img
            src={prangonLogo}
            alt="Prangon Logo"
            className="w-24 h-24 mx-auto rounded-2xl shadow-lg"
          />
          <h1 className="text-2xl font-bold mt-4">Prangon</h1>
          <p className="text-muted-foreground">Version 1.3.8</p>
        </div>

        {/* Mission */}
        <section className="text-center">
          <h2 className="text-xl font-bold mb-3">Our Mission</h2>
          <p className="text-muted-foreground">
            To create a next-generation social networking platform that reimagines social
            interaction through innovative features and AI-enhanced experiences, connecting
            people in meaningful ways.
          </p>
        </section>

        {/* Values */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-red-500/10 flex items-center justify-center">
              <Heart className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="font-semibold">Authentic</h3>
            <p className="text-xs text-muted-foreground mt-1">Real connections matter</p>
          </Card>
          
          <Card className="p-4 text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Globe className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="font-semibold">Global</h3>
            <p className="text-xs text-muted-foreground mt-1">Connecting worldwide</p>
          </Card>
          
          <Card className="p-4 text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-green-500/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-green-500" />
            </div>
            <h3 className="font-semibold">Safe</h3>
            <p className="text-xs text-muted-foreground mt-1">Your privacy protected</p>
          </Card>
          
          <Card className="p-4 text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-purple-500" />
            </div>
            <h3 className="font-semibold">Community</h3>
            <p className="text-xs text-muted-foreground mt-1">Built for everyone</p>
          </Card>
        </div>

        {/* Features */}
        <section>
          <h3 className="text-lg font-semibold mb-3">Key Features</h3>
          <ul className="space-y-3 text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Share moments with photos, videos, and stories</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Connect with friends through instant messaging and video calls</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Discover trending content with AI-powered recommendations</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Create and join Circles for intimate group sharing</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Go live and engage with your audience in real-time</span>
            </li>
          </ul>
        </section>

        {/* Legal */}
        <section className="space-y-2">
          <button
            onClick={() => navigate("/community-standards")}
            className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors text-sm"
          >
            Community Standards
          </button>
          <button
            onClick={() => navigate("/cookies-policy")}
            className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors text-sm"
          >
            Cookies Policy
          </button>
          <button
            onClick={() => navigate("/settings")}
            className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors text-sm"
          >
            Privacy Policy
          </button>
        </section>

        {/* Footer */}
        <div className="text-center pt-6 border-t space-y-2">
          <p className="text-sm text-muted-foreground">
            © 2024 Prangon. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground/60">
            Made with ❤️ for connecting people
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;
