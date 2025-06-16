"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserCircle, ShieldAlert, Save, Loader2 } from "lucide-react";
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
import { app, auth, firestore } from "@/lib/firebase";
import { doc, updateDoc, getDoc, deleteDoc, collection, getDocs, query, where } from "firebase/firestore";
import { signOut, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import type { User as FirebaseUser } from "firebase/auth";

interface LoggedInUserDetails {
  uid: string;
  fullName: string;
  username: string;
  email: string;
  bio?: string;
  avatar?: string;
  coverImage?: string;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [firebaseAuthUser, setFirebaseAuthUser] = useState<FirebaseUser | null>(null);
  const [currentUserDetails, setCurrentUserDetails] = useState<LoggedInUserDetails | null>(null);
  
  const [editableFullName, setEditableFullName] = useState("");
  const [editableBio, setEditableBio] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showReauthDialog, setShowReauthDialog] = useState(false);
  const [reauthEmail, setReauthEmail] = useState("");
  const [reauthPassword, setReauthPassword] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setFirebaseAuthUser(user);
        const loggedInUserString = localStorage.getItem("loggedInUser");
        if (loggedInUserString) {
          try {
            const userDetails: LoggedInUserDetails = JSON.parse(loggedInUserString);
            if (userDetails.uid === user.uid) {
              setCurrentUserDetails(userDetails);
              setEditableFullName(userDetails.fullName || "");
              setEditableBio(userDetails.bio || "");
            } else {
              localStorage.removeItem("loggedInUser");
              fetchUserDetailsFromFirestore(user.uid);
            }
          } catch (e) {
            console.error("Error parsing user from localStorage:", e);
            fetchUserDetailsFromFirestore(user.uid);
          }
        } else {
           fetchUserDetailsFromFirestore(user.uid);
        }
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchUserDetailsFromFirestore = async (uid: string) => {
    try {
      const userDocRef = doc(firestore, "users", uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const data = userDocSnap.data() as Omit<LoggedInUserDetails, 'uid'>;
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
      setCurrentUserDetails(updatedUserDetails);

      toast({
        title: "Profile Saved!",
        description: "Your profile information has been updated in Firestore.",
      });
      router.push(`/profile/${currentUserDetails.username}`);
    } catch (error) {
      console.error("Error saving profile to Firestore:", error);
      toast({ title: "Firestore Error", description: "Could not save profile changes to database.", variant: "destructive"});
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleReauthAndDelete = async () => {
    if (!firebaseAuthUser || !currentUserDetails) {
      toast({ title: "Error", description: "User not authenticated or data not loaded.", variant: "destructive" });
      setShowReauthDialog(false);
      return;
    }

    try {
      // Re-authenticate the user
      const credential = EmailAuthProvider.credential(reauthEmail, reauthPassword);
      await reauthenticateWithCredential(firebaseAuthUser, credential);
      setShowReauthDialog(false);
      toast({ title: "Authentication Successful", description: "Proceeding with account deletion..." });

      // Proceed with account deletion
      await performAccountDeletion();
    } catch (error: any) {
      console.error("Re-authentication error:", error);
      toast({
        title: "Authentication Failed",
        description: error.message || "Please enter valid credentials to proceed.",
        variant: "destructive",
      });
      setShowReauthDialog(false);
    }
  };

  const performAccountDeletion = async () => {
    if (!firebaseAuthUser || !currentUserDetails) {
      toast({ title: "Error", description: "User not authenticated or data not loaded.", variant: "destructive" });
      return;
    }

    setIsDeletingAccount(true);
    try {
      const userId = firebaseAuthUser.uid;
      console.log("performAccountDeletion: userId =", userId);

      // Step 1: Delete user's subcollections (friends, notifications)
      console.log("performAccountDeletion: Step 1 - Deleting friends and notifications...");
      const friendsRef = collection(firestore, "users", userId, "friends");
      const notificationsRef = collection(firestore, "users", userId, "notifications");
      const [friendsSnapshot, notificationsSnapshot] = await Promise.all([
        getDocs(friendsRef),
        getDocs(notificationsRef),
      ]);
      console.log("performAccountDeletion: Friends count =", friendsSnapshot.docs.length, "Notifications count =", notificationsSnapshot.docs.length);

      const deleteFriends = friendsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      const deleteNotifications = notificationsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all([...deleteFriends, ...deleteNotifications]);
      console.log("performAccountDeletion: Step 1 - Friends and notifications deleted.");

      // Step 2: Delete user's posts and their comments
      console.log("performAccountDeletion: Step 2 - Deleting posts and comments...");
      const postsQuery = query(collection(firestore, "posts"), where("userId", "==", userId));
      const postsSnapshot = await getDocs(postsQuery);
      console.log("performAccountDeletion: Posts count =", postsSnapshot.docs.length);
      const deletePostsTasks = postsSnapshot.docs.map(async (postDoc) => {
        console.log("performAccountDeletion: Deleting comments for post", postDoc.id);
        const commentsRef = collection(firestore, "posts", postDoc.id, "comments");
        const commentsSnapshot = await getDocs(commentsRef);
        console.log("performAccountDeletion: Comments count for post", postDoc.id, "=", commentsSnapshot.docs.length);
        const deleteComments = commentsSnapshot.docs.map(commentDoc => deleteDoc(commentDoc.ref));
        await Promise.all(deleteComments);
        console.log("performAccountDeletion: Comments deleted for post", postDoc.id);
        await deleteDoc(postDoc.ref);
        console.log("performAccountDeletion: Post deleted", postDoc.id);
      });
      await Promise.all(deletePostsTasks);
      console.log("performAccountDeletion: Step 2 - Posts and comments deleted.");

      // Step 3: Delete user's likes
      console.log("performAccountDeletion: Step 3 - Deleting likes...");
      const likesQuery = query(collection(firestore, "likes"), where("userId", "==", userId));
      const likesSnapshot = await getDocs(likesQuery);
      console.log("performAccountDeletion: Likes count =", likesSnapshot.docs.length);
      const deleteLikes = likesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deleteLikes);
      console.log("performAccountDeletion: Step 3 - Likes deleted.");

      // Step 4: Delete friend requests (sent and received)
      console.log("performAccountDeletion: Step 4 - Deleting friend requests...");
      const sentFriendRequestsQuery = query(
        collection(firestore, "friendRequests"),
        where("senderId", "==", userId)
      );
      const receivedFriendRequestsQuery = query(
        collection(firestore, "friendRequests"),
        where("receiverId", "==", userId)
      );
      const [sentFriendRequestsSnapshot, receivedFriendRequestsSnapshot] = await Promise.all([
        getDocs(sentFriendRequestsQuery),
        getDocs(receivedFriendRequestsQuery),
      ]);
      console.log("performAccountDeletion: Sent friend requests count =", sentFriendRequestsSnapshot.docs.length);
      console.log("performAccountDeletion: Received friend requests count =", receivedFriendRequestsSnapshot.docs.length);
      const deleteSentFriendRequests = sentFriendRequestsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      const deleteReceivedFriendRequests = receivedFriendRequestsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all([...deleteSentFriendRequests, ...deleteReceivedFriendRequests]);
      console.log("performAccountDeletion: Step 4 - Friend requests deleted.");

      // Step 5: Delete chats and remove user from friends' friends lists
      console.log("performAccountDeletion: Step 5 - Deleting chats...");
      const chatsQuery = query(
        collection(firestore, "chats"),
        where("participants", "array-contains", userId)
      );
      const chatsSnapshot = await getDocs(chatsQuery);
      console.log("performAccountDeletion: Chats count =", chatsSnapshot.docs.length);
      const deleteChatsTasks = chatsSnapshot.docs.map(async (chatDoc) => {
        console.log("performAccountDeletion: Processing chat", chatDoc.id);
        const chatData = chatDoc.data();
        const otherParticipant = chatData.participants.find((id: string) => id !== userId);
        if (otherParticipant) {
          console.log("performAccountDeletion: Removing user from friend list of", otherParticipant);
          const friendRef = doc(firestore, "users", otherParticipant, "friends", userId);
          await deleteDoc(friendRef);
          console.log("performAccountDeletion: Removed user from friend list of", otherParticipant);
        }
        await deleteDoc(chatDoc.ref);
        console.log("performAccountDeletion: Chat deleted", chatDoc.id);
      });
      await Promise.all(deleteChatsTasks);
      console.log("performAccountDeletion: Step 5 - Chats deleted.");

      // Step 6: Delete the user's main document
      console.log("performAccountDeletion: Step 6 - Deleting user document...");
      const userDocRef = doc(firestore, "users", userId);
      await deleteDoc(userDocRef);
      console.log("performAccountDeletion: Step 6 - User document deleted.");

      // Step 7: Delete the Firebase Auth user
      console.log("performAccountDeletion: Step 7 - Deleting Firebase Auth user...");
      await deleteUser(firebaseAuthUser);
      console.log("performAccountDeletion: Step 7 - Firebase Auth user deleted.");

      // Step 8: Clear local storage and redirect
      console.log("performAccountDeletion: Step 8 - Clearing local storage and redirecting...");
      localStorage.removeItem("loggedInUser");
      await signOut(auth);
      toast({
        title: "Account Deleted",
        description: "Your account and all associated data have been permanently deleted.",
        variant: "destructive",
      });
      router.push("/login");
      console.log("performAccountDeletion: Step 8 - Completed.");
    } catch (error: any) {
      console.error("performAccountDeletion: Error deleting account:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete account. Please try again.",
        variant: "destructive",
      });
      setIsDeletingAccount(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!firebaseAuthUser || !currentUserDetails) {
      toast({ title: "Error", description: "User not authenticated or data not loaded.", variant: "destructive" });
      return;
    }

    // Show re-authentication dialog
    setReauthEmail(currentUserDetails.email || "");
    setReauthPassword("");
    setShowReauthDialog(true);
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
        </CardContent>
      </Card>

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
          <AlertDialog open={showReauthDialog} onOpenChange={setShowReauthDialog}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full" disabled={isDeletingAccount}>
                {isDeletingAccount ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isDeletingAccount ? "Deleting Account..." : "Delete Account"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              {showReauthDialog && !isDeletingAccount ? (
                <>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Your Identity</AlertDialogTitle>
                    <AlertDialogDescription>
                      To delete your account, please re-enter your credentials for security purposes.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="reauth-email">Email</Label>
                      <Input
                        id="reauth-email"
                        type="email"
                        value={reauthEmail}
                        onChange={(e) => setReauthEmail(e.target.value)}
                        className="mt-1"
                        placeholder="Enter your email"
                      />
                    </div>
                    <div>
                      <Label htmlFor="reauth-password">Password</Label>
                      <Input
                        id="reauth-password"
                        type="password"
                        value={reauthPassword}
                        onChange={(e) => setReauthPassword(e.target.value)}
                        className="mt-1"
                        placeholder="Enter your password"
                      />
                    </div>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReauthAndDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                      Continue
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </>
              ) : (
                <>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your
                      account and remove your data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                      Yes, delete account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </>
              )}
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSaveChanges} size="lg" disabled={isSavingProfile}>
          {isSavingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
          {isSavingProfile ? "Saving Profile..." : "Save Profile Changes"}
        </Button>
      </div>
    </div>
  );
}