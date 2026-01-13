import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";

const ManageInfo = () => {
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
          <h1 className="font-semibold text-lg ml-2">Manage Your Information</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <section>
          <h2 className="text-xl font-bold mb-3">Your Data, Your Control</h2>
          <p className="text-muted-foreground">
            At Prangon, we believe you should have full control over your personal information.
            Here's how you can manage your data.
          </p>
        </section>

        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Access Your Information</h3>
          <p className="text-sm text-muted-foreground">
            View all the information we have about you in your account settings. You can see
            your posts, comments, likes, and personal details.
          </p>
        </Card>

        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Download Your Data</h3>
          <p className="text-sm text-muted-foreground">
            Request a copy of all your data at any time. We'll prepare a downloadable file
            containing your information.
          </p>
        </Card>

        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Update Your Information</h3>
          <p className="text-sm text-muted-foreground">
            Edit your profile, change your username, update your bio, and modify other
            personal details through your settings.
          </p>
        </Card>

        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Delete Your Data</h3>
          <p className="text-sm text-muted-foreground">
            You can delete individual posts, comments, or your entire account. Account
            deletion is permanent and cannot be undone.
          </p>
        </Card>

        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Privacy Settings</h3>
          <p className="text-sm text-muted-foreground">
            Control who can see your content, send you messages, and interact with your
            profile through privacy settings.
          </p>
        </Card>

        <section>
          <h3 className="text-lg font-semibold mb-2">How We Use Your Data</h3>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>To provide and improve our services</li>
            <li>To personalize your experience</li>
            <li>To communicate with you about your account</li>
            <li>To ensure platform safety and security</li>
            <li>To show relevant content and ads</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-2">Contact Us</h3>
          <p className="text-muted-foreground">
            If you have questions about your data or need assistance, please contact our
            support team through the Help & Support section.
          </p>
        </section>

        <p className="text-sm text-muted-foreground pt-6 border-t">
          Last updated: January 2024
        </p>
      </div>
    </div>
  );
};

export default ManageInfo;
