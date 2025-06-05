
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserCircle, BellDot, Palette, ShieldAlert, Save, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { app, auth, firestore, storage } from "@/lib/firebase"; // Import Firestore and Storage
import { doc, updateDoc, getDoc } from "firebase/firestore"; // Firestore functions
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"; // Storage functions
import type { User as FirebaseUser } from "firebase/auth"; // For current Firebase Auth user

interface LoggedInUserDetails {
  uid: string; // Ensure UID is part of this
  fullName: string;
  username: string;
  email: string;
  bio?: string;
  avatar?: string;
  coverImage?: string;
}

const MAX_COVER_IMAGE_SIZE_MB = 5;
const MAX_COVER_IMAGE_SIZE_BYTES = MAX_COVER_IMAGE_SIZE_MB * 1024 * 1024;

export default function SettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [firebaseAuthUser, setFirebaseAuthUser] = useState<FirebaseUser | null>(null);
  const [currentUserDetails, setCurrentUserDetails] = useState<LoggedInUserDetails | null>(null);
  
  const [editableFullName, setEditableFullName] = useState("");
  const [editableBio, setEditableBio] = useState("");
  const [currentCoverImage, setCurrentCoverImage] = useState<string | undefined>(undefined);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const [notificationsLikes, setNotificationsLikes] = useState(true);
  const [notificationsComments, setNotificationsComments] = useState(true);
  const [notificationsFriendRequests, setNotificationsFriendRequests] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const coverImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setFirebaseAuthUser(user);
        const loggedInUserString = localStorage.getItem("loggedInUser");
        if (loggedInUserString) {
          try {
            const userDetails: LoggedInUserDetails = JSON.parse(loggedInUserString);
            if (userDetails.uid === user.uid) { // Ensure consistency
              setCurrentUserDetails(userDetails);
              setEditableFullName(userDetails.fullName || "");
              setEditableBio(userDetails.bio || "");
              setCurrentCoverImage(userDetails.coverImage);
            } else { // Mismatch, clear and fetch
              localStorage.removeItem("loggedInUser");
              fetchUserDetailsFromFirestore(user.uid);
            }
          } catch (e) {
            console.error("Error parsing user from localStorage:", e);
            fetchUserDetailsFromFirestore(user.uid); // Fetch if parsing fails
          }
        } else {
           fetchUserDetailsFromFirestore(user.uid); // Fetch if not in localStorage
        }
      } else {
        router.push("/login"); // Redirect if not authenticated
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchUserDetailsFromFirestore = async (uid: string) => {
    try {
      const userDocRef = doc(firestore, "users", uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const data = userDocSnap.data() as Omit<LoggedInUserDetails, 'uid'>; // Assuming Firestore doc doesn't store UID inside
        const userDetails: LoggedInUserDetails = { 
          uid, 
          ...data,
          fullName: data.fullName || "",
          username: data.username || "",
          email: data.email || "",
        };
        setCurrentUserDetails(userDetails);
        setEditableFullName(userDetails.fullName);
        setEditableBio(userDetails.bio || "");
        setCurrentCoverImage(userDetails.coverImage);
        localStorage.setItem("loggedInUser", JSON.stringify(userDetails));
      } else {
        toast({ title: "Error", description: "User profile not found in database.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error fetching user details from Firestore:", error);
      toast({ title: "Error", description: "Could not load profile details from database.", variant: "destructive"});
    }
  };


  const handleSaveChanges = async () => {
    if (!currentUserDetails || !firebaseAuthUser) {
      toast({ title: "Error", description: "User data not fully loaded or not authenticated.", variant: "destructive" });
      return;
    }
    setIsSavingProfile(true);
    try {
      const userDocRef = doc(firestore, "users", firebaseAuthUser.uid);
      await updateDoc(userDocRef, {
        fullName: editableFullName,
        bio: editableBio,
      });

      const updatedUserDetails = {
        ...currentUserDetails,
        fullName: editableFullName,
        bio: editableBio,
      };
      localStorage.setItem("loggedInUser", JSON.stringify(updatedUserDetails));
      setCurrentUserDetails(updatedUserDetails); // Update local state

      toast({
        title: "Profile Saved!",
        description: "Your profile information has been updated in Firestore.",
      });
      // Optionally, navigate or give other feedback
      // router.push(`/profile/${currentUserDetails.username}`);
    } catch (error) {
      console.error("Error saving profile to Firestore:", error);
      toast({ title: "Firestore Error", description: "Could not save profile changes to database.", variant: "destructive"});
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCoverImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !firebaseAuthUser) {
      toast({ title: "Error", description: "No file selected or user not authenticated.", variant: "destructive"});
      if (coverImageInputRef.current) coverImageInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_COVER_IMAGE_SIZE_BYTES) {
      toast({
        title: "File Too Large",
        description: `Image too large (max ${MAX_COVER_IMAGE_SIZE_MB}MB).`,
        variant: "destructive",
      });
      if (coverImageInputRef.current) coverImageInputRef.current.value = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Unsupported File Type", description: "Please select an image.", variant: "destructive" });
      if (coverImageInputRef.current) coverImageInputRef.current.value = "";
      return;
    }

    setIsUploadingCover(true);
    const storageRefPath = `cover_images/${firebaseAuthUser.uid}/${Date.now()}_${file.name}`;
    const coverImageStorageRef = ref(storage, storageRefPath);
    
    try {
      const uploadTask = uploadBytesResumable(coverImageStorageRef, file);
      await uploadTask;
      const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

      const userDocRef = doc(firestore, "users", firebaseAuthUser.uid);
      await updateDoc(userDocRef, { coverImage: downloadURL });

      if (currentUserDetails) {
        const updatedUserDetails = { ...currentUserDetails, coverImage: downloadURL };
        localStorage.setItem("loggedInUser", JSON.stringify(updatedUserDetails));
        setCurrentUserDetails(updatedUserDetails); // Update local state
        setCurrentCoverImage(downloadURL); // Update displayed cover image preview if any
      }

      toast({
        title: "Cover Image Updated!",
        description: "New cover image uploaded to Firebase Storage and URL saved to Firestore.",
      });
    } catch (error: any) {
      console.error("Error uploading/saving cover image:", error);
      toast({ title: "Upload Failed", description: `Could not save cover image: ${error.message}.`, variant: "destructive" });
    } finally {
      setIsUploadingCover(false);
      if (coverImageInputRef.current) coverImageInputRef.current.value = "";
    }
  };

  const handleDeleteAccount = () => {
    // This should ideally trigger a Firebase function for proper data deletion.
    // For now, it's simulated.
    toast({
      title: "Account Deletion (Simulated)",
      description: "Account deletion process would start here, involving backend operations.",
      variant: "destructive"
    });
    // localStorage.removeItem("loggedInUser");
    // firebaseSignOut(auth).then(() => router.push('/login'));
  };
  
  if (!currentUserDetails) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and app preferences.</p>
      </div>

      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <UserCircle className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl">Profile Information</CardTitle>
          </div>
          <CardDescription>Update your public profile details. Username and email are managed by Firebase Auth.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={editableFullName}
              onChange={(e) => setEditableFullName(e.target.value)}
              className="mt-1"
              placeholder="Your full name"
              disabled={isSavingProfile}
            />
          </div>
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={currentUserDetails?.username || ""}
              disabled
              className="mt-1 bg-muted/50"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={currentUserDetails?.email || ""}
              disabled
              className="mt-1 bg-muted/50"
            />
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={editableBio}
              onChange={(e) => setEditableBio(e.target.value)}
              className="mt-1 min-h-[100px]"
              placeholder="Tell us a bit about yourself..."
              disabled={isSavingProfile}
            />
          </div>
           {currentUserDetails && currentUserDetails.username && (
            <Link href={`/profile/${currentUserDetails.username}`} passHref>
              <Button variant="outline" className="w-full">
                View Full Profile Page
              </Button>
            </Link>
          )}
          <div>
            <Label htmlFor="cover-image-upload-settings">Cover Image</Label>
             <Button
                variant="outline"
                className="w-full mt-1"
                onClick={() => coverImageInputRef.current?.click()}
                disabled={isUploadingCover}
            >
                {isUploadingCover ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {isUploadingCover ? "Uploading..." : "Change Cover Image"}
            </Button>
            <input
              id="cover-image-upload-settings"
              type="file"
              className="sr-only"
              accept="image/*"
              onChange={handleCoverImageChange}
              ref={coverImageInputRef}
            />
            {currentCoverImage && (
              <div className="mt-2 text-center">
                <p className="text-sm text-muted-foreground">Current Cover Image:</p>
                <img src={currentCoverImage} alt="Current cover" className="mt-1 rounded-md max-h-40 mx-auto border" data-ai-hint="cover image preview"/>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <BellDot className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl">Notification Preferences (Simulated)</CardTitle>
          </div>
          <CardDescription>Choose what you want to be notified about. (These settings are local).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50">
            <Label htmlFor="notif-likes" className="flex-1 cursor-pointer">Likes on your posts</Label>
            <Switch
              id="notif-likes"
              checked={notificationsLikes}
              onCheckedChange={setNotificationsLikes}
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50">
            <Label htmlFor="notif-comments" className="flex-1 cursor-pointer">Comments on your posts</Label>
            <Switch
              id="notif-comments"
              checked={notificationsComments}
              onCheckedChange={setNotificationsComments}
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50">
            <Label htmlFor="notif-friend-requests" className="flex-1 cursor-pointer">New friend requests</Label>
            <Switch
              id="notif-friend-requests"
              checked={notificationsFriendRequests}
              onCheckedChange={setNotificationsFriendRequests}
            />
          </div>
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Palette className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl">Appearance (Simulated)</CardTitle>
          </div>
          <CardDescription>Customize the look and feel of the app. (Dark mode is default).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50">
            <Label htmlFor="dark-mode" className="flex-1 cursor-pointer">Dark Mode</Label>
            <Switch
              id="dark-mode"
              checked={isDarkMode}
              onCheckedChange={setIsDarkMode}
              disabled 
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">App is currently in Dark Mode by default.</p>
        </CardContent>
      </Card>

      {/* Account Settings */}
      <Card className="shadow-lg rounded-xl border-destructive">
        <CardHeader>
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-destructive" />
            <CardTitle className="text-xl text-destructive">Account Actions</CardTitle>
          </div>
          <CardDescription>Manage your account settings and data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <Button variant="outline" className="w-full" onClick={() => toast({title: "Change Password (Simulated)", description: "Password change flow would start here. This needs Firebase Auth functions."})}>
              Change Password
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">Delete Account</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will (simulate) permanently deleting your
                    account and remove your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                    Yes, delete account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSaveChanges} size="lg" disabled={isSavingProfile || isUploadingCover}>
          {isSavingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
          {isSavingProfile ? "Saving Profile..." : "Save Profile Changes"}
        </Button>
      </div>
    </div>
  );
}

    