import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessengerSettings } from "./MessengerSettings";
import {
  UserCircle,
  ShieldCheck,
  Bell,
  Database,
  Lock,
  ChevronRight,
  HelpCircle,
  Palette,
  LogOut,
} from "lucide-react";

interface SettingsScreenProps {
  profile?: { display_name?: string; username?: string; avatar_url?: string } | null;
  onOpenProfile: () => void;
  onExit: () => void;
}

const Row = ({
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  icon: typeof Bell;
  title: string;
  subtitle: string;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-accent/60 transition-colors text-left"
  >
    <span className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
      <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
    </span>
    <span className="flex-1 min-w-0">
      <span className="block text-[14.5px] font-medium truncate">{title}</span>
      <span className="block text-[12px] text-muted-foreground truncate">{subtitle}</span>
    </span>
    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.75} />
  </button>
);

export const SettingsScreen = ({ profile, onOpenProfile, onExit }: SettingsScreenProps) => (
  <div className="flex flex-col min-h-0 flex-1">
    <header className="sticky top-0 z-20 px-5 pt-6 pb-4 bg-background/[.88] backdrop-blur-md border-b border-border/60">
      <h1 className="text-[28px] font-extrabold tracking-tight">Settings</h1>
    </header>

    <ScrollArea className="flex-1">
      <div className="px-4 pb-32 pt-4 space-y-4">
        {/* Profile card */}
        <button
          onClick={onOpenProfile}
          className="w-full rounded-3xl border border-border/70 bg-card p-4 flex items-center gap-3.5 hover:bg-accent/40 transition-colors text-left"
        >
          <Avatar className="h-14 w-14 ring-2 ring-primary/40 ring-offset-2 ring-offset-background">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="bg-muted">
              <UserCircle className="h-7 w-7 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-semibold truncate">
              {profile?.display_name || profile?.username || "Your profile"}
            </p>
            <p className="text-[12.5px] text-muted-foreground truncate">
              @{profile?.username} · View profile
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
        </button>

        <div className="rounded-3xl border border-border/70 bg-card overflow-hidden divide-y divide-border/60">
          <MessengerSettings
            trigger={
              <div>
                <Row icon={Bell} title="Notifications" subtitle="Sounds, previews and alerts" />
              </div>
            }
          />
          <MessengerSettings
            trigger={
              <div>
                <Row icon={Lock} title="Privacy" subtitle="Last seen, read receipts, blocking" />
              </div>
            }
          />
          <MessengerSettings
            trigger={
              <div>
                <Row icon={ShieldCheck} title="Security" subtitle="Encryption and chat lock" />
              </div>
            }
          />
          <MessengerSettings
            trigger={
              <div>
                <Row icon={Database} title="Storage & data" subtitle="Media auto-download, usage" />
              </div>
            }
          />
        </div>

        <div className="rounded-3xl border border-border/70 bg-card overflow-hidden divide-y divide-border/60">
          <MessengerSettings
            trigger={
              <div>
                <Row icon={Palette} title="Appearance" subtitle="Chat themes and bubbles" />
              </div>
            }
          />
          <Row
            icon={HelpCircle}
            title="Help & support"
            subtitle="FAQs and contact us"
            onClick={() => window.open("/help-support", "_self")}
          />
        </div>

        <button
          onClick={onExit}
          className="w-full h-12 rounded-2xl border border-border/70 bg-card text-[14.5px] font-medium inline-flex items-center justify-center gap-2 hover:bg-accent/60 transition-colors"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} /> Back to chats
        </button>
      </div>
    </ScrollArea>
  </div>
);
