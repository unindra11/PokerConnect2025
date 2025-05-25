
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserCircle, BellDot, Palette, ShieldAlert, Image as ImageIcon, Save, Upload } from "lucide-react"; // Added Upload
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

interface LoggedInUserDetails {
  fullName: string;
  username: string;
  email: string;
  bio?: string;
  avatar?: string;
  coverImage?: string; // Added coverImage
}

const MAX_COVER_IMAGE_SIZE_MB = 5;
const MAX_COVER_IMAGE_SIZE_BYTES = MAX_COVER_IMAGE_SIZE_MB * 1024 * 1024;

export default function SettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<LoggedInUserDetails | null>(null);
  const [editableFullName, setEditableFullName] = useState("");
  const [editableBio, setEditableBio] = useState("");

  const [notificationsLikes, setNotificationsLikes] = useState(true);
  const [notificationsComments, setNotificationsComments] = useState(true);
  const [notificationsFriendRequests, setNotificationsFriendRequests] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const coverImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const loggedInUserString = localStorage.getItem("loggedInUser");
      if (loggedInUserString) {
        const userDetails: LoggedInUserDetails = JSON.parse(loggedInUserString);
        setCurrentUser(userDetails);
        setEditableFullName(userDetails.fullName || "");
        setEditableBio(userDetails.bio || "");
        // coverImage is handled directly via its upload function
      } else {
        setCurrentUser({ fullName: "Player One", username: "playerone", email: "player@example.com", bio: "" });
        setEditableFullName("Player One");
        setEditableBio("");
      }
    } catch (error) {
      console.error("Error loading user from localStorage for settings:", error);
      setCurrentUser({ fullName: "Player One", username: "playerone", email: "player@example.com", bio: "" });
      setEditableFullName("Player One");
      setEditableBio("");
    }
  }, []);

  const handleSaveChanges = () => {
    if (!currentUser) {
      toast({ title: "Error", description: "User data not loaded.", variant: "destructive" });
      return;
    }
    try {
      const updatedUser = {
        ...currentUser,
        fullName: editableFullName,
        bio: editableBio,
        // coverImage is saved separately
      };
      localStorage.setItem("loggedInUser", JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      toast({
        title: "Settings Saved!",
        description: "Your profile information has been updated.",
      });
      router.push(`/profile/${currentUser.username}`);
    } catch (error) {
      console.error("Error saving user to localStorage:", error);
      toast({ title: "Error", description: "Could not save settings.", variant: "destructive"});
    }
  };

  const handleCoverImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_COVER_IMAGE_SIZE_BYTES) {
        toast({
          title: "File Too Large",
          description: `Please select an image smaller than ${MAX_COVER_IMAGE_SIZE_MB}MB for the cover image.`,
          variant: "destructive",
        });
        if (coverImageInputRef.current) coverImageInputRef.current.value = "";
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Unsupported File Type",
          description: "Please select an image file (e.g., PNG, JPG, GIF).",
          variant: "destructive",
        });
        if (coverImageInputRef.current) coverImageInputRef.current.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const newCoverImageDataUrl = reader.result as string;
        try {
          const loggedInUserString = localStorage.getItem("loggedInUser");
          if (loggedInUserString && currentUser) {
            const loggedInUser: LoggedInUserDetails = JSON.parse(loggedInUserString);
            const updatedUser = { ...loggedInUser, coverImage: newCoverImageDataUrl };
            localStorage.setItem("loggedInUser", JSON.stringify(updatedUser));
            setCurrentUser(updatedUser); // Update local state to reflect change if needed elsewhere on this page
            toast({
              title: "Cover Image Updated!",
              description: "Your new cover image has been saved. It will be visible on your profile.",
            });
          }
        } catch (error) {
          console.error("Error saving cover image to localStorage:", error);
          toast({ title: "Storage Error", description: "Could not save new cover image.", variant: "destructive" });
        }
      };
      reader.onerror = () => {
        toast({ title: "Error", description: "Could not read selected file.", variant: "destructive" });
      };
      reader.readAsDataURL(file);
    }
    if (coverImageInputRef.current) coverImageInputRef.current.value = "";
  };

  const handleDeleteAccount = () => {
    toast({
      title: "Account Deletion (Simulated)",
      description: "Your account deletion process has started.",
      variant: "destructive"
    });
    // In a real app: clear localStorage, redirect to login/signup
    // localStorage.removeItem("loggedInUser");
    // router.push('/login');
  };

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
          <CardDescription>Update your public profile details. Username and email cannot be changed here.</CardDescription>
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
            />
          </div>
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={currentUser?.username || ""}
              disabled
              className="mt-1 bg-muted/50"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={currentUser?.email || ""}
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
            />
          </div>
           {currentUser && (
            <Link href={`/profile/${currentUser.username}`} passHref>
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
            >
                <Upload className="mr-2 h-4 w-4" /> Change Cover Image
            </Button>
            <input
              id="cover-image-upload-settings"
              type="file"
              className="sr-only"
              accept="image/*"
              onChange={handleCoverImageChange}
              ref={coverImageInputRef}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <BellDot className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl">Notification Preferences</CardTitle>
          </div>
          <CardDescription>Choose what you want to be notified about.</CardDescription>
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
            <CardTitle className="text-xl">Appearance</CardTitle>
          </div>
          <CardDescription>Customize the look and feel of the app.</CardDescription>
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
            <Button variant="outline" className="w-full" onClick={() => toast({title: "Change Password (Simulated)", description: "Password change flow would start here."})}>
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
                    This action cannot be undone. This will permanently delete your
                    account and remove your data from our servers (simulated).
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
        <Button onClick={handleSaveChanges} size="lg">
          <Save className="mr-2 h-5 w-5" /> Save Changes
        </Button>
      </div>
    </div>
  );
}
