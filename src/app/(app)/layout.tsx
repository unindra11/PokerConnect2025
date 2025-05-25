
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
import { Settings, LogOut, UploadCloud } from "lucide-react"; // Added UploadCloud for clarity
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast"; 
import { storage } from "@/lib/firebase"; // Import Firebase storage
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import type { MockUserPin } from "@/app/(app)/map/page"; // For pokerConnectMapUsers type

interface AppLayoutProps {
  children: ReactNode;
}

const MAX_AVATAR_SIZE_MB = 2;
const MAX_AVATAR_SIZE_BYTES = MAX_AVATAR_SIZE_MB * 1024 * 1024;

export default function AppLayout({ children }: AppLayoutProps) {
  const [userName, setUserName] = useState("Player One");
  const [userEmail, setUserEmail] = useState("player@example.com"); 
  const [avatarUrl, setAvatarUrl] = useState("https://placehold.co/100x100.png?text=P"); 
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const loggedInUserString = localStorage.getItem("loggedInUser");
      if (loggedInUserString) {
        const loggedInUser = JSON.parse(loggedInUserString);
        setUserName(loggedInUser.fullName || loggedInUser.username || "User");
        setUserEmail(loggedInUser.email || "No email provided");
        setCurrentUsername(loggedInUser.username || null);
        if (loggedInUser.avatar) {
          setAvatarUrl(loggedInUser.avatar);
        } else {
          setAvatarUrl(`https://placehold.co/100x100.png?text=${(loggedInUser.fullName || loggedInUser.username || "P").substring(0,1)}`);
        }
      } else {
        setUserName("Player One");
        setUserEmail("player@example.com");
        setCurrentUsername("playerone"); // Fallback username
        setAvatarUrl("https://placehold.co/100x100.png?text=P");
      }
    } catch (error) {
      console.error("Error reading loggedInUser from localStorage:", error);
      setUserName("Player One");
      setUserEmail("player@example.com");
      setCurrentUsername("playerone");
      setAvatarUrl("https://placehold.co/100x100.png?text=P");
    }
  }, []); 


  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!currentUsername) {
        toast({ title: "Error", description: "Username not found. Cannot upload avatar.", variant: "destructive"});
        return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      toast({
        title: "File Too Large",
        description: `Please select an image smaller than ${MAX_AVATAR_SIZE_MB}MB.`,
        variant: "destructive",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Unsupported File Type",
        description: "Please select an image file (e.g., PNG, JPG, GIF).",
        variant: "destructive",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Show local preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
        setAvatarUrl(reader.result as string); // Temporary local preview
    };
    reader.readAsDataURL(file);
    
    // Upload to Firebase Storage
    const storageRef = ref(storage, `avatars/${currentUsername}/avatar_${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    try {
      toast({ title: "Uploading Avatar...", description: "Please wait." });
      await uploadTask;
      const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
      setAvatarUrl(downloadURL); // Update with Firebase URL

      // Update localStorage for loggedInUser
      const loggedInUserString = localStorage.getItem("loggedInUser");
      if (loggedInUserString) {
        let loggedInUser = JSON.parse(loggedInUserString);
        loggedInUser.avatar = downloadURL;
        localStorage.setItem("loggedInUser", JSON.stringify(loggedInUser));

        // Also update pokerConnectUser if it's the same user
        const pokerConnectUserString = localStorage.getItem("pokerConnectUser");
        if (pokerConnectUserString) {
            let pokerConnectUser = JSON.parse(pokerConnectUserString);
            if (pokerConnectUser.username === loggedInUser.username) {
                pokerConnectUser.avatar = downloadURL;
                localStorage.setItem("pokerConnectUser", JSON.stringify(pokerConnectUser));
            }
        }
        // Also update pokerConnectMapUsers
        const mapUsersString = localStorage.getItem("pokerConnectMapUsers");
        if (mapUsersString) {
            let mapUsers: MockUserPin[] = JSON.parse(mapUsersString);
            mapUsers = mapUsers.map(mu => mu.username === loggedInUser.username ? {...mu, avatar: downloadURL} : mu);
            localStorage.setItem("pokerConnectMapUsers", JSON.stringify(mapUsers));
        }
      }
      toast({
        title: "Avatar Updated!",
        description: "Your new profile picture has been saved to Firebase Storage.",
      });
    } catch (error: any) {
      console.error("Error saving avatar to Firebase Storage or localStorage:", error);
      toast({
        title: "Upload Failed",
        description: `Could not upload new avatar: ${error.message}. Reverting to previous.`,
        variant: "destructive",
      });
      // Revert to old avatar from localStorage if upload fails
       const loggedInUserString = localStorage.getItem("loggedInUser");
        if (loggedInUserString) {
            const loggedInUser = JSON.parse(loggedInUserString);
            setAvatarUrl(loggedInUser.avatar || `https://placehold.co/100x100.png?text=${(loggedInUser.fullName || loggedInUser.username || "P").substring(0,1)}`);
        }
    } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("loggedInUser");
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
            <SidebarTrigger className="md:hidden" /> {}
          </div>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <AppNavigation />
        </SidebarContent>
        <SidebarFooter className="p-4 border-t">
          <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
            <label htmlFor="avatar-upload-sidebar" className="cursor-pointer rounded-full group relative" title="Change avatar">
              <Avatar className="h-9 w-9">
                <AvatarImage src={avatarUrl} alt="User Avatar" data-ai-hint="user avatar" />
                <AvatarFallback>{userName.substring(0, 1)?.toUpperCase() || 'P'}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <UploadCloud className="h-5 w-5 text-white" />
              </div>
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
