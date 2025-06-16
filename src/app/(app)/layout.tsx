'use client';

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
import { Settings, LogOut, UploadCloud, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { signOut as firebaseSignOut } from "firebase/auth";
import { getFirestore, doc, updateDoc, collection, getDocs } from "firebase/firestore";
import { auth, app } from "@/lib/firebase";
import { UserProvider, useUser } from "@/context/UserContext";

const MAX_AVATAR_SIZE_MB = 2;
const MAX_AVATAR_SIZE_BYTES = MAX_AVATAR_SIZE_MB * 1024 * 1024;

interface MockUserPin {
  id: string;
  username: string;
  avatar: string;
  lat: number;
  lng: number;
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </UserProvider>
  );
}

function AppLayoutContent({ children }: { children: ReactNode }) {
  const { currentUserAuth, loggedInUserDetails, isLoadingAuth, isLoadingUserDetails, setLoggedInUserDetails } = useUser();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [mapUsers, setMapUsers] = useState<MockUserPin[]>([]);

  // Handle redirect to /login using useEffect to avoid rendering phase side effects
  useEffect(() => {
    if (!isLoadingAuth && !isLoadingUserDetails && !loggedInUserDetails) {
      console.log("AppLayout: No loggedInUserDetails, redirecting to /login");
      router.push("/login");
    }
  }, [isLoadingAuth, isLoadingUserDetails, loggedInUserDetails, router]);

  useEffect(() => {
    console.log("AppLayout: Current user state - currentUserAuth:", currentUserAuth?.uid, "loggedInUserDetails:", loggedInUserDetails);
    // Fetch map users from Firestore
    const fetchMapUsers = async () => {
      const db = getFirestore(app, "poker");
      const usersRef = collection(db, "users");
      try {
        const usersSnapshot = await getDocs(usersRef);
        const usersData = usersSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            username: data.username || "unknown",
            avatar: data.avatar || `https://placehold.co/100x100.png?text=${(data.username || "U").substring(0,1)}`,
            lat: data.locationCoords?.lat || 0,
            lng: data.locationCoords?.lng || 0,
          };
        }).filter(user => user.lat !== 0 && user.lng !== 0); // Filter out users with invalid coordinates
        setMapUsers(usersData);
        console.log("AppLayout: Fetched map users from Firestore:", usersData);
      } catch (error) {
        console.error("AppLayout: Error fetching map users from Firestore:", error);
        toast({ title: "Error", description: "Failed to load map users", variant: "destructive" });
      }
    };

    fetchMapUsers();
  }, []); // This useEffect remains unchanged

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUserAuth?.uid || !loggedInUserDetails) {
      toast({ title: "Error", description: "User not fully loaded. Cannot upload avatar.", variant: "destructive" });
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      toast({ title: "File Too Large", description: `Image too large (max ${MAX_AVATAR_SIZE_MB}MB).`, variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Unsupported File Type", description: "Please select an image.", variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const originalAvatar = loggedInUserDetails.avatar || `https://placehold.co/100x100.png?text=${(loggedInUserDetails.displayName || "P").substring(0,1).toUpperCase()}`;

    const reader = new FileReader();
    reader.onloadend = () => {
      setLoggedInUserDetails(prev => prev ? { ...prev, avatar: reader.result as string } : null);
    };
    reader.readAsDataURL(file);

    const storageRefPath = `avatars/${currentUserAuth.uid}/avatar_${Date.now()}_${file.name}`;
    const storageRefVal = ref(storage, storageRefPath);
    const uploadTask = uploadBytesResumable(storageRefVal, file);

    try {
      toast({ title: "Uploading Avatar...", description: "Please wait." });
      await uploadTask;
      const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

      const db = getFirestore(app, "poker");
      const userDocRef = doc(db, "users", currentUserAuth.uid);
      await updateDoc(userDocRef, { avatar: downloadURL });

      setLoggedInUserDetails(prev => {
        if (!prev) return null;
        const updatedDetails = { ...prev, avatar: downloadURL };
        return updatedDetails;
      });

      setMapUsers(prev => prev.map(mu => mu.id === currentUserAuth.uid ? { ...mu, avatar: downloadURL } : mu));
      toast({ title: "Avatar Updated!", description: "New avatar saved." });
    } catch (error: any) {
      console.error("AppLayout: Error uploading/saving avatar:", error);
      toast({ title: "Upload Failed", description: `Could not save avatar: ${error.message}. Reverting.`, variant: "destructive" });
      setLoggedInUserDetails(prev => prev ? { ...prev, avatar: originalAvatar } : null);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleLogout = async () => {
    try {
      await firebaseSignOut(auth);
      console.log("AppLayout: User signed out successfully.");
      router.push("/login");
    } catch (error) {
      console.error("AppLayout: Error signing out:", error);
      toast({ title: "Logout Error", description: "Could not log out. Please try again.", variant: "destructive" });
    }
  };

  // Render loading state while authentication and user details are being fetched
  if (isLoadingAuth || isLoadingUserDetails) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading user session...</p>
      </div>
    );
  }

  // If no loggedInUserDetails, return null (redirect is handled in useEffect)
  if (!loggedInUserDetails) {
    return null;
  }

  const userNameToDisplay = loggedInUserDetails.displayName || loggedInUserDetails.email || "User";
  const userEmailToDisplay = loggedInUserDetails.email || "No email";
  const avatarUrlToDisplay = loggedInUserDetails.avatar || `https://placehold.co/100x100.png?text=${(userNameToDisplay).substring(0,1)?.toUpperCase() || 'P'}`;

  return (
    <SidebarProvider defaultOpen collapsible="icon" variant="sidebar">
      <Sidebar side="left" className="border-r bg-background">
        <SidebarHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <Logo className="group-data-[collapsible=icon]:hidden delay-300" />
            <SidebarTrigger className="md:hidden" />
          </div>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <AppNavigation />
        </SidebarContent>
        <SidebarFooter className="p-4 border-t">
          <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
            <label htmlFor="avatar-upload-sidebar" className="cursor-pointer rounded-full group relative" title="Change avatar">
              <Avatar className="h-9 w-9">
                <AvatarImage src={avatarUrlToDisplay} alt="User Avatar" data-ai-hint="user avatar" key={avatarUrlToDisplay} />
                <AvatarFallback>{userNameToDisplay.substring(0,1)?.toUpperCase() || 'P'}</AvatarFallback>
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
              <Link href={`/profile/${loggedInUserDetails.username}`}>
                <span className="text-sm font-medium hover:underline">{userNameToDisplay}</span>
              </Link>
              <span className="text-xs text-muted-foreground">{userEmailToDisplay}</span>
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
      <SidebarInset className="flex flex-col min-h-screen bg-background">
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