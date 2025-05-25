
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { UserCircle, BellDot, Palette, ShieldAlert, Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
} from "@/components/ui/alert-dialog"

export default function SettingsPage() {
  const { toast } = useToast();
  const [notificationsLikes, setNotificationsLikes] = useState(true);
  const [notificationsComments, setNotificationsComments] = useState(true);
  const [notificationsFriendRequests, setNotificationsFriendRequests] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true); // Assuming app is dark by default

  const handleSaveChanges = () => {
    toast({
      title: "Settings Saved (Simulated)",
      description: "Your preferences have been updated.",
    });
  };

  const handleDeleteAccount = () => {
    toast({
      title: "Account Deletion (Simulated)",
      description: "Your account deletion process has started.",
      variant: "destructive"
    });
  };

  return (
    <div className="container mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and app preferences.</p>
      </div>

      {/* Profile Settings */}
      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <UserCircle className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl">Profile Settings</CardTitle>
          </div>
          <CardDescription>Update your public profile information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* In a real app, these would be inputs or link to an edit form */}
          <div className="flex justify-between items-center">
            <Label>Name</Label>
            <span className="text-muted-foreground">Player One (Mock)</span>
          </div>
           <div className="flex justify-between items-center">
            <Label>Username</Label>
            <span className="text-muted-foreground">@playerone (Mock)</span>
          </div>
          <Link href="/profile/playerone" passHref>
            <Button variant="outline" className="w-full">
              <Edit3 className="mr-2 h-4 w-4" /> View/Edit Full Profile
            </Button>
          </Link>
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
              disabled // App is dark by default, this is a placeholder
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
        <Button onClick={handleSaveChanges} size="lg">Save Changes</Button>
      </div>
    </div>
  );
}
