
"use client"; // Add "use client" for hooks

import type { ReactNode } from 'react'; // Import ReactNode
import { useState, useEffect } from "react"; // Import useState and useEffect
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
import { useRouter } from "next/navigation"; // Import useRouter

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [userName, setUserName] = useState("Player One");
  const [userEmail, setUserEmail] = useState("unindra111@gmail.com");
  const router = useRouter();

  useEffect(() => {
    try {
      const loggedInUserString = localStorage.getItem("loggedInUser");
      if (loggedInUserString) {
        const loggedInUser = JSON.parse(loggedInUserString);
        setUserName(loggedInUser.fullName || loggedInUser.username || "User");
        setUserEmail(loggedInUser.email || "No email");
      } else {
        // If no loggedInUser, perhaps redirect to login or show default
        // For now, defaults are fine as set by useState initial values
      }
    } catch (error) {
      console.error("Error reading loggedInUser from localStorage:", error);
      // Handle error, e.g., by showing default user info
    }
  }, []);

  const handleLogout = () => {
    try {
      localStorage.removeItem("loggedInUser");
      localStorage.removeItem("pokerConnectUser"); // Also clear signup details if desired
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
            <Logo className="group-data-[collapsible=icon]:hidden delay-300"/>
            <SidebarTrigger className="md:hidden"/> {/* Mobile trigger */}
          </div>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <AppNavigation />
        </SidebarContent>
        <SidebarFooter className="p-4 border-t">
          <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
            <Avatar className="h-9 w-9">
              <AvatarImage src="https://placehold.co/100x100.png" alt="User Avatar" data-ai-hint="user avatar" />
              <AvatarFallback>{userName.substring(0,1) || 'P'}</AvatarFallback>
            </Avatar>
            <div className="group-data-[collapsible=icon]:hidden delay-300 flex flex-col">
              <span className="text-sm font-medium">{userName}</span>
              <span className="text-xs text-muted-foreground">{userEmail}</span>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-1">
             <SidebarMenuButton asChild tooltip="Settings" size="sm">
                <Link href="#">
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
                {/* We use a button that calls handleLogout for localStorage interaction, then link */}
                {/* For proper Link behavior with SPA, best to wrap or use router.push */}
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
