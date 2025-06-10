'use client';

import { useUser } from "@/context/UserContext";
import { Loader2 } from "lucide-react";

export function Logo({ size = 20, className = "" }) {
  const { loggedInUserDetails, isLoadingUserDetails } = useUser();

  if (isLoadingUserDetails) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!loggedInUserDetails) {
    return null; // Let UserContext handle redirects
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 24 24">
        <path d="M12 2L2 22h20L12 2z" fill="currentColor" />
      </svg>
      <span>PokerConnect</span>
    </div>
  );
}