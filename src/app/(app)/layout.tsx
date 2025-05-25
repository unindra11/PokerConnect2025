
"use client"; 

import type { ReactNode } from 'react';
import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { AppNavigation } from "@/components/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Settings, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast"; // Import useToast

interface AppLayoutProps {
  children: ReactNode;
}

const MAX_AVATAR_SIZE_MB = 2;
const MAX_AVATAR_SIZE_BYTES = MAX_AVATAR_SIZE_MB * 1024 * 1024;

export default function AppLayout({ children }: AppLayoutProps) {
  const [userName, setUserName] = useState("Player One");
  const [userEmail, setUserEmail] = useState("unindra111@gmail.com");
  const [avatarUrl, setAvatarUrl] = useState("https://placehold.co/100x100.png"); // Default avatar
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const loggedInUserString = localStorage.getItem("loggedInUser");
      if (loggedInUserString) {
        const loggedInUser = JSON.parse(loggedInUserString);
        setUserName(loggedInUser.fullName || loggedInUser.username || "User");
        setUserEmail(loggedInUser.email || "No email");
        if (loggedInUser.avatar) {
          setAvatarUrl(loggedInUser.avatar);
        }
      }
    } catch (error) {
      console.error("Error reading loggedInUser from localStorage:", error);
    }
  }, []);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_AVATAR_SIZE_BYTES) {
        toast({
          title: "File Too Large",
          description: `Please select an image smaller than ${MAX_AVATAR_SIZE_MB}MB.`,
          variant: "destructive",
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast({
          title: "Unsupported File Type",
          description: "Please select an image file (e.g., PNG, JPG, GIF).",
          variant: "destructive",
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const newAvatarDataUrl = reader.result as string;
        setAvatarUrl(newAvatarDataUrl);

        // Update localStorage
        try {
          const loggedInUserString = localStorage.getItem("loggedInUser");
          if (loggedInUserString) {
            const loggedInUser = JSON.parse(loggedInUserString);
            loggedInUser.avatar = newAvatarDataUrl;
            localStorage.setItem("loggedInUser", JSON.stringify(loggedInUser));
            toast({
              title: "Avatar Updated!",
              description: "Your new profile picture has been saved.",
            });
          }
        } catch (error) {
          console.error("Error saving avatar to localStorage:", error);
          toast({
            title: "Storage Error",
            description: "Could not save your new avatar.",
            variant: "destructive",
          });
        }
      };
      reader.onerror = () => {
        toast({ title: "Error", description: "Could not read the selected file.", variant: "destructive" });
      };
      reader.readAsDataURL(file);
    }
    // Reset file input value to allow re-uploading the same file if needed
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("loggedInUser");
      localStorage.removeItem("pokerConnectUser");
      localStorage.removeItem("pokerConnectMapUsers");
      localStorage.removeItem("pokerConnectUserPosts");
    } catch (error) {
      console.error("Error clearing localStorage on logout:", error);
    }
    router.push("/login");
  };

  return (
    <SidebarProvider defaultOpen collapsible="icon" variant="sidebar">
      <Sidebar side="left" className="border-r">
        <SidebarHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <Logo className="group-data-[collapsible=icon]:hidden delay-300" />
            <SidebarTrigger className="md:hidden" /> {/* Mobile trigger */}
          </div>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <AppNavigation />
        </SidebarContent>
        <SidebarFooter className="p-4 border-t">
          <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
            <label htmlFor="avatar-upload-sidebar" className="cursor-pointer rounded-full" title="Change avatar">
              <Avatar className="h-9 w-9">
                <AvatarImage src={avatarUrl} alt="User Avatar" data-ai-hint="user avatar" />
                <AvatarFallback>{userName.substring(0, 1) || 'P'}</AvatarFallback>
              </Avatar>
            </label>
            <input
              id="avatar-upload-sidebar"
              type="file"
              className="sr-only"
              accept="image/*"
              onChange={handleAvatarChange}
              ref={fileInputRef}
            />
            <div className="group-data-[collapsible=icon]:hidden delay-300 flex flex-col">
              <span className="text-sm font-medium">{userName}</span>
              <span className="text-xs text-muted-foreground">{userEmail}</span>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-1">
            <SidebarMenuButton asChild tooltip="Settings" size="sm">
              <Link href="/settings">
                <Settings size={18} />
                <span className="group-data-[collapsible=icon]:hidden delay-300">Settings</span>
              </Link>
            </SidebarMenuButton>
            <SidebarMenuButton
              asChild
              tooltip="Logout"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive data-[active=true]:text-destructive data-[active=true]:bg-destructive/10"
            >
              <button onClick={handleLogout} className="w-full flex items-center gap-2">
                <LogOut size={18} />
                <span className="group-data-[collapsible=icon]:hidden delay-300">Logout</span>
              </button>
            </SidebarMenuButton>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
          <Logo size={20} />
          <SidebarTrigger />
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
