import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CookiesPolicy = () => {
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
          <h1 className="font-semibold text-lg ml-2">Cookies Policy</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <section>
          <h2 className="text-xl font-bold mb-3">What Are Cookies?</h2>
          <p className="text-muted-foreground">
            Cookies are small text files that are placed on your device when you visit our
            platform. They help us provide you with a better experience by remembering your
            preferences and understanding how you use Prangon.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-2">Types of Cookies We Use</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">Essential Cookies</h4>
              <p className="text-sm text-muted-foreground">
                Required for the platform to function properly. These cannot be disabled.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium">Authentication Cookies</h4>
              <p className="text-sm text-muted-foreground">
                Used to keep you signed in and secure your account.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium">Preference Cookies</h4>
              <p className="text-sm text-muted-foreground">
                Remember your settings like language and theme preferences.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium">Analytics Cookies</h4>
              <p className="text-sm text-muted-foreground">
                Help us understand how users interact with Prangon to improve our services.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-2">Third-Party Cookies</h3>
          <p className="text-muted-foreground">
            Some cookies may be set by third-party services that appear on our pages, such as
            analytics providers and advertising partners.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-2">Managing Cookies</h3>
          <p className="text-muted-foreground">
            You can control and manage cookies through your browser settings. Note that
            disabling certain cookies may affect the functionality of Prangon.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-2">Updates to This Policy</h3>
          <p className="text-muted-foreground">
            We may update this policy from time to time. Any changes will be posted on this
            page with an updated revision date.
          </p>
        </section>

        <p className="text-sm text-muted-foreground pt-6 border-t">
          Last updated: January 2024
        </p>
      </div>
    </div>
  );
};

export default CookiesPolicy;
