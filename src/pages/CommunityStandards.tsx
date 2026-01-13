import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CommunityStandards = () => {
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
          <h1 className="font-semibold text-lg ml-2">Community Standards</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <section>
          <h2 className="text-xl font-bold mb-3">Our Community Values</h2>
          <p className="text-muted-foreground">
            Prangon is built on a foundation of respect, authenticity, and safety. Our community
            standards help ensure that everyone can express themselves freely while maintaining
            a positive environment for all.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-2">Authenticity</h3>
          <p className="text-muted-foreground">
            We want people to feel confident that the accounts and content they interact with
            are authentic. Be yourself and don't impersonate others or create fake accounts.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-2">Safety</h3>
          <p className="text-muted-foreground">
            We are committed to making Prangon a safe place. We remove content that could
            contribute to real-world harm, including harassment, threats, and dangerous content.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-2">Privacy</h3>
          <p className="text-muted-foreground">
            We're committed to protecting personal privacy. Never share private or confidential
            information about others without their consent.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-2">Dignity</h3>
          <p className="text-muted-foreground">
            We believe that all people are equal in dignity and rights. We do not tolerate hate
            speech or discrimination based on race, ethnicity, religion, gender, or any other
            characteristic.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-2">Prohibited Content</h3>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>Violence and graphic content</li>
            <li>Nudity and sexual content</li>
            <li>Hate speech and discrimination</li>
            <li>Harassment and bullying</li>
            <li>Spam and misleading content</li>
            <li>Illegal activities</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-2">Reporting Violations</h3>
          <p className="text-muted-foreground">
            If you see content that violates our standards, please report it. We review all
            reports and take appropriate action to maintain community safety.
          </p>
        </section>

        <p className="text-sm text-muted-foreground pt-6 border-t">
          Last updated: January 2024
        </p>
      </div>
    </div>
  );
};

export default CommunityStandards;
