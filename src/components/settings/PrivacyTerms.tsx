import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, FileText, Users, Lock, Database, Eye, Mail, Scale } from "lucide-react";

export const PrivacyTerms = () => {
  return (
    <div className="space-y-6">
      {/* Privacy Policy */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Privacy Policy</CardTitle>
          </div>
          <CardDescription>
            Last updated: December 2024
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="data-collection">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  Data We Collect
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p>We collect information you provide directly:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Profile information (name, username, email, profile picture)</li>
                  <li>Content you create (posts, comments, messages, stories)</li>
                  <li>Communications with other users</li>
                  <li>Verification documents (when applying for verification)</li>
                </ul>
                <p className="mt-4">We automatically collect:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Device and browser information</li>
                  <li>Usage patterns and interactions</li>
                  <li>Log data and analytics</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="data-use">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  How We Use Your Data
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p>We use your information to:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Provide and improve our services</li>
                  <li>Personalize your experience</li>
                  <li>Communicate with you about updates and features</li>
                  <li>Ensure platform security and prevent abuse</li>
                  <li>Process verification requests</li>
                  <li>Analyze usage patterns to improve features</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="data-storage">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  Storage & Retention
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p>Your data is stored securely using industry-standard encryption:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Profile data is retained while your account is active</li>
                  <li>Media files are stored on secure cloud infrastructure (Supabase Storage)</li>
                  <li>Messages are stored for real-time delivery and history</li>
                  <li>Stories automatically expire after 24 hours</li>
                  <li>Deleted content is removed within 30 days from backups</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="third-party">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Third-Party Services
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p>We use trusted third-party services:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Supabase:</strong> Database, authentication, and file storage</li>
                  <li><strong>Firebase:</strong> Real-time messaging and notifications</li>
                  <li><strong>Analytics:</strong> To understand usage patterns</li>
                </ul>
                <p className="mt-4">These services have their own privacy policies and security measures.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="user-controls">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  Your Controls
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p>You have the right to:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Access your personal data</li>
                  <li>Update or correct your information</li>
                  <li>Delete your account and associated data</li>
                  <li>Control your privacy settings</li>
                  <li>Block other users</li>
                  <li>Export your data</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="contact">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Contact Us
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p>For privacy concerns or data requests, contact us at:</p>
                <p className="font-medium text-foreground mt-2">prangon@support.com</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Terms of Service */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Terms of Service</CardTitle>
          </div>
          <CardDescription>
            By using Prangon, you agree to these terms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="acceptable-use">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Acceptable Use Policy
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p>You agree NOT to:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Post hate speech, harassment, or discriminatory content</li>
                  <li>Share illegal, violent, or sexually explicit content</li>
                  <li>Impersonate others or create fake accounts</li>
                  <li>Spam, scam, or deceive other users</li>
                  <li>Violate intellectual property rights</li>
                  <li>Attempt to hack or exploit the platform</li>
                  <li>Share private information without consent</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="account">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  Account Ownership & Suspension
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p>Account responsibilities:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>You are responsible for your account security</li>
                  <li>One account per person (no duplicate accounts)</li>
                  <li>You must be 13+ years old to use Prangon</li>
                  <li>We may suspend accounts that violate our policies</li>
                  <li>Suspended users may appeal through Help & Support</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="moderation">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  Moderation & Takedown
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p>Content moderation process:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Users can report content or other users</li>
                  <li>Reports are reviewed by our admin team</li>
                  <li>Violating content may be removed without notice</li>
                  <li>Repeat offenders face account suspension</li>
                  <li>Appeals can be submitted through Help & Support</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="verification">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-muted-foreground" />
                  Verification Process
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p>Verification badge guidelines:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Verification confirms your identity</li>
                  <li>Submit valid government-issued ID</li>
                  <li>Admins review all verification requests</li>
                  <li>Verification can be revoked for policy violations</li>
                  <li>Verified users must maintain community standards</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="changes">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Changes & Updates
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p>We may update these terms:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Significant changes will be announced</li>
                  <li>Continued use implies acceptance of new terms</li>
                  <li>Users will be notified of major policy changes</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};