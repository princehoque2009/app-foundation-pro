import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { MessageSquarePlus, UserPlus, Users, Plus, Home, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewMenuSheetProps {
  onNewChat?: () => void;
  onNewContact?: () => void;
  onNewCommunity?: () => void;
  className?: string;
  /** Messenger-internal tab navigation */
  activeTab?: "chats" | "feed" | "me";
  onSelectTab?: (tab: "chats" | "feed" | "me") => void;
}

interface MenuItem {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number | string }>;
  title: string;
  description: string;
  onClick?: () => void;
}

export const NewMenuSheet = ({
  onNewChat,
  onNewContact,
  onNewCommunity,
  className,
}: NewMenuSheetProps) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const items: MenuItem[] = [
    {
      icon: MessageSquarePlus,
      title: "New Chat",
      description: "Send a message to your contact",
      onClick: onNewChat,
    },
    {
      icon: UserPlus,
      title: "New Contact",
      description: "Add a contact to be able to send message",
      onClick: onNewContact,
    },
    {
      icon: Users,
      title: "New Community",
      description: "Join the community around you",
      onClick: onNewCommunity,
    },
  ];

  const handleItem = (fn?: () => void) => {
    setOpen(false);
    fn?.();
  };

  return (
    <>
      {/* Bottom action bar: Home | +New | Profile */}
      <div
        className={cn(
          "fixed bottom-4 inset-x-0 z-40 flex items-center justify-center gap-8 px-6",
          className
        )}
      >
        <button
          onClick={() => navigate("/")}
          aria-label="Home"
          className="h-11 w-11 rounded-full flex items-center justify-center text-neutral-800 dark:text-neutral-200 active:scale-95 transition-transform"
        >
          <Home className="h-6 w-6" />
        </button>

        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-6 h-11 rounded-full bg-[#111111] text-white text-sm font-semibold shadow-xl active:scale-95 transition-transform"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          New
        </button>

        <button
          onClick={() => navigate("/profile")}
          aria-label="Profile"
          className="h-11 w-11 rounded-full flex items-center justify-center text-neutral-800 dark:text-neutral-200 active:scale-95 transition-transform"
        >
          <User className="h-6 w-6" />
        </button>
      </div>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <button
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-xl animate-fade-in"
            />

            {/* Sheet */}
            <div
              className="absolute inset-x-0 bottom-0 pb-6 flex flex-col items-center gap-4"
              style={{ animation: "slideUp 0.28s cubic-bezier(0.22, 1, 0.36, 1)" }}
            >
              <div className="w-[min(92vw,420px)] bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden mx-4">
                {items.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.title}
                      onClick={() => handleItem(item.onClick)}
                      className={cn(
                        "w-full flex items-center gap-4 px-5 py-4 text-left transition-colors",
                        "hover:bg-neutral-50 dark:hover:bg-neutral-800 active:bg-neutral-100",
                        i > 0 && "border-t border-neutral-200/70 dark:border-neutral-800"
                      )}
                    >
                      <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-neutral-900 dark:text-neutral-100">
                        <Icon className="h-[22px] w-[22px]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">
                          {item.title}
                        </div>
                        <div className="text-[12.5px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {item.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Cancel pill */}
              <button
                onClick={() => setOpen(false)}
                className="px-6 h-11 rounded-full bg-white text-neutral-900 text-sm font-semibold shadow-lg active:scale-95 transition-transform"
              >
                Cancel
              </button>
            </div>

            <style>{`
              @keyframes slideUp {
                from { transform: translateY(24px); opacity: 0; }
                to   { transform: translateY(0);    opacity: 1; }
              }
            `}</style>
          </div>,
          document.body
        )}
    </>
  );
};
