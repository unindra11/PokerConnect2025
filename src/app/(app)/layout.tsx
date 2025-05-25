
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
import { Settings, LogOut, UploadCloud, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast"; 
import { storage, auth, firestore } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import type { MockUserPin } from "@/app/(app)/map/page";

interface LoggedInUser {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  username?: string;
  fullName?: string;
  bio?: string;
  avatar?: string;
  coverImage?: string;
  location?: string;
  locationCoords?: { lat: number; lng: number } | null;
}

const MAX_AVATAR_SIZE_MB = 2;
const MAX_AVATAR_SIZE_BYTES = MAX_AVATAR_SIZE_MB * 1024 * 1024;

export default function AppLayout({ children }: AppLayoutProps) {
  const [currentUserAuth, setCurrentUserAuth] = useState<firebase.default.User | null>(null);
  const [loggedInUserDetails, setLoggedInUserDetails] = useState<LoggedInUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoadingAuth(true);
      if (user) {
        console.log("Firebase Auth state changed: User is logged in", user.uid);
        setCurrentUserAuth(user);
        // Attempt to load from localStorage first (might be stale but faster)
        const storedUserString = localStorage.getItem("loggedInUser");
        if (storedUserString) {
            const storedUser: LoggedInUser = JSON.parse(storedUserString);
            // Verify if the stored user matches the auth user
            if (storedUser.uid === user.uid) {
                setLoggedInUserDetails(storedUser);
                setIsLoadingAuth(false);
                console.log("Loaded user details from localStorage:", storedUser);
                // Optionally, re-fetch from Firestore to ensure freshness if needed, or on a timer
                // For now, we'll assume localStorage is up-to-date after login
                return; // Exit if successfully loaded from localStorage
            } else {
                 // Stored user mismatch, clear it and fetch fresh
                localStorage.removeItem("loggedInUser");
            }
        }
        
        // If not in localStorage or mismatch, fetch from Firestore
        const userDocRef = doc(firestore, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const profileData = userDocSnap.data();
          const details: LoggedInUser = {
            uid: user.uid,
            email: user.email,
            displayName: profileData.fullName || profileData.username || user.email,
            username: profileData.username,
            fullName: profileData.fullName,
            bio: profileData.bio,
            avatar: profileData.avatar,
            coverImage: profileData.coverImage,
            location: profileData.location,
            locationCoords: profileData.locationCoords,
          };
          setLoggedInUserDetails(details);
          localStorage.setItem("loggedInUser", JSON.stringify(details));
          console.log("Fetched and saved user details from Firestore:", details);
        } else {
          console.warn("No profile document in Firestore for UID:", user.uid);
          // Fallback: create a basic LoggedInUser object
           const basicDetails: LoggedInUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.email || "User",
            username: user.email?.split('@')[0] || "user",
            fullName: user.email || "User",
            avatar: `https://placehold.co/100x100.png?text=${(user.email || "U").substring(0,1)}`,
          };
          setLoggedInUserDetails(basicDetails);
          localStorage.setItem("loggedInUser", JSON.stringify(basicDetails));
        }
      } else {
        console.log("Firebase Auth state changed: User is logged out.");
        setCurrentUserAuth(null);
        setLoggedInUserDetails(null);
        localStorage.removeItem("loggedInUser");
        router.push("/login"); // Redirect to login if not authenticated
      }
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, [router]);


  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !loggedInUserDetails?.uid) {
      toast({ title: "Error", description: "User not fully loaded. Cannot upload avatar.", variant: "destructive"});
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

    // Show local preview
    const reader = new FileReader();
    let localPreviewUrl = loggedInUserDetails.avatar || `https://placehold.co/100x100.png?text=${(loggedInUserDetails.displayName || "P").substring(0,1)}`;
    reader.onloadend = () => {
        setLoggedInUserDetails(prev => prev ? {...prev, avatar: reader.result as string} : null);
    };
    reader.readAsDataURL(file);
    
    const storageRefPath = `avatars/${loggedInUserDetails.uid}/avatar_${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storageRefPath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    try {
      toast({ title: "Uploading Avatar...", description: "Please wait." });
      await uploadTask;
      const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

      // Update Firestore
      const userDocRef = doc(firestore, "users", loggedInUserDetails.uid);
      await updateDoc(userDocRef, { avatar: downloadURL });

      // Update local state and localStorage
      setLoggedInUserDetails(prev => {
        if (!prev) return null;
        const updatedDetails = { ...prev, avatar: downloadURL };
        localStorage.setItem("loggedInUser", JSON.stringify(updatedDetails));
        
        // Update pokerConnectMapUsers if entry exists
        const mapUsersString = localStorage.getItem("pokerConnectMapUsers");
        if (mapUsersString) {
            let mapUsers: MockUserPin[] = JSON.parse(mapUsersString);
            mapUsers = mapUsers.map(mu => mu.id === loggedInUserDetails.uid ? {...mu, avatar: downloadURL} : mu);
            localStorage.setItem("pokerConnectMapUsers", JSON.stringify(mapUsers));
        }
        return updatedDetails;
      });
      
      toast({ title: "Avatar Updated!", description: "New avatar saved to Firebase." });
    } catch (error: any) {
      console.error("Error uploading/saving avatar:", error);
      toast({ title: "Upload Failed", description: `Could not save avatar: ${error.message}. Reverting.`, variant: "destructive" });
      // Revert local preview if needed
      setLoggedInUserDetails(prev => prev ? {...prev, avatar: localPreviewUrl} : null);
    } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleLogout = async () => {
    try {
      await firebaseSignOut(auth);
      localStorage.removeItem("loggedInUser");
      // onAuthStateChanged will handle redirect to /login
      console.log("User signed out successfully.");
    } catch (error) {
      console.error("Error signing out:", error);
      toast({ title: "Logout Error", description: "Could not log out. Please try again.", variant: "destructive" });
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading user session...</p>
      </div>
    );
  }
  
  if (!loggedInUserDetails) {
    // This case should ideally be handled by the redirect in onAuthStateChanged,
    // but it's a fallback if user somehow lands here without details.
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Redirecting to login...</p>
      </div>
    );
  }

  const userNameToDisplay = loggedInUserDetails.displayName || loggedInUserDetails.email || "User";
  const userEmailToDisplay = loggedInUserDetails.email || "No email";
  const avatarUrlToDisplay = loggedInUserDetails.avatar || `https://placehold.co/100x100.png?text=${(userNameToDisplay).substring(0,1).toUpperCase()}`;


  return (
    <SidebarProvider defaultOpen collapsible="icon" variant="sidebar">
      <Sidebar side="left" className="border-r">
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
                <AvatarFallback>{userNameToDisplay.substring(0, 1)?.toUpperCase() || 'P'}</AvatarFallback>
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
              <span className="text-sm font-medium">{userNameToDisplay}</span>
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
