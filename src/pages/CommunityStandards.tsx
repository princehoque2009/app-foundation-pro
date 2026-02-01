import { ArrowLeft, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface StandardSection {
  id: string;
  title: string;
  content: string;
  items?: string[];
}

const standards: StandardSection[] = [
  {
    id: "authenticity",
    title: "Authenticity",
    content: "We want people to feel confident that the accounts and content they interact with are authentic. Be yourself and don't impersonate others or create fake accounts.",
  },
  {
    id: "safety",
    title: "Safety",
    content: "We are committed to making Prangon a safe place. We remove content that could contribute to real-world harm, including harassment, threats, and dangerous content.",
  },
  {
    id: "privacy",
    title: "Privacy",
    content: "We're committed to protecting personal privacy. Never share private or confidential information about others without their consent.",
  },
  {
    id: "dignity",
    title: "Dignity",
    content: "We believe that all people are equal in dignity and rights. We do not tolerate hate speech or discrimination based on race, ethnicity, religion, gender, or any other characteristic.",
  },
  {
    id: "prohibited",
    title: "Prohibited Content",
    content: "The following types of content are not allowed on Prangon:",
    items: [
      "Violence and graphic content",
      "Nudity and sexual content",
      "Hate speech and discrimination",
      "Harassment and bullying",
      "Spam and misleading content",
      "Illegal activities",
      "Intellectual property violations",
      "Dangerous organizations",
    ],
  },
  {
    id: "reporting",
    title: "Reporting Violations",
    content: "If you see content that violates our standards, please report it. We review all reports and take appropriate action to maintain community safety. Reports are confidential and help keep our community safe.",
  },
  {
    id: "enforcement",
    title: "Enforcement",
    content: "When content violates our standards, we may remove it, restrict its visibility, or disable the account responsible. Repeated violations may result in permanent suspension.",
  },
];

const CommunityStandards = () => {
  const navigate = useNavigate();
  const [openSections, setOpenSections] = useState<string[]>(["authenticity"]);

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
          <h1 className="font-semibold text-lg ml-2">Community Standards</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl font-bold mb-3 text-foreground">Our Community Values</h2>
          <p className="text-muted-foreground leading-relaxed">
            Prangon is built on a foundation of respect, authenticity, and safety. Our community
            standards help ensure that everyone can express themselves freely while maintaining
            a positive environment for all.
          </p>
        </motion.section>

        {/* Collapsible Sections */}
        <div className="space-y-3">
          {standards.map((section, index) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              <Collapsible
                open={openSections.includes(section.id)}
                onOpenChange={() => toggleSection(section.id)}
              >
                <CollapsibleTrigger asChild>
                  <button className={cn(
                    "w-full flex items-center justify-between p-4 rounded-xl",
                    "bg-card border border-border",
                    "hover:bg-muted/50 transition-colors",
                    "text-left"
                  )}>
                    <h3 className="text-base font-semibold text-foreground">
                      {section.title}
                    </h3>
                    <ChevronDown className={cn(
                      "h-5 w-5 text-muted-foreground transition-transform duration-200",
                      openSections.includes(section.id) && "rotate-180"
                    )} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 pt-2 space-y-3">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {section.content}
                    </p>
                    {section.items && (
                      <ul className="space-y-2 pt-2">
                        {section.items.map((item, i) => (
                          <li 
                            key={i}
                            className="flex items-start gap-3 text-sm text-muted-foreground"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </motion.div>
          ))}
        </div>

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

export default CommunityStandards;
