import { useState } from "react";
import { Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArchivedPostsModal } from "@/components/ArchivedPostsModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Standalone button to view archived posts
 * Place in navigation bar or user menu
 */
export const ArchiveNavigation = () => {
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setArchiveModalOpen(true)}
        className="flex items-center gap-2"
        title="View archived posts"
      >
        <Archive className="h-4 w-4" />
        <span>Archived Posts</span>
      </Button>

      <ArchivedPostsModal
        open={archiveModalOpen}
        onOpenChange={setArchiveModalOpen}
      />
    </>
  );
};

/**
 * Dropdown menu variant for integration into existing user menus
 * Use in profile dropdown or settings menu
 */
export const ArchiveMenuDropdown = () => {
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            ⋯
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            onClick={() => setArchiveModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Archive className="mr-2 h-4 w-4" />
            <span>View Archived Posts</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ArchivedPostsModal
        open={archiveModalOpen}
        onOpenChange={setArchiveModalOpen}
      />
    </>
  );
};

/**
 * Icon-only button for compact navigation
 */
export const ArchiveIconButton = () => {
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setArchiveModalOpen(true)}
        title="View archived posts"
        className="h-9 w-9"
      >
        <Archive className="h-5 w-5" />
      </Button>

      <ArchivedPostsModal
        open={archiveModalOpen}
        onOpenChange={setArchiveModalOpen}
      />
    </>
  );
};
