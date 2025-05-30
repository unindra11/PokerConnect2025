
"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Added import
import { UserPlus, MessageSquare, UserMinus, UserX, Flag, Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { app, auth } from "@/lib/firebase";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
  addDoc,
  deleteDoc,
  getDoc,
  orderBy,
  limit
} from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";
import Link from "next/link";

interface Friend {
  id: string; // This will be the friendUserId (UID of the friend)
  name: string; // fullName of the friend
  username: string; // username of the friend
  avatar: string; // avatar URL of the friend
  since?: any; // Firestore Timestamp or Date
}

interface LoggedInUserDetails {
  uid: string;
  username: string;
  fullName?: string;
  avatar?: string;
}

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [newFriendQuery, setNewFriendQuery] = useState("");
  const { toast } = useToast();
  const [currentUserAuth, setCurrentUserAuth] = useState<FirebaseUser | null>(null);
  const [loggedInUserDetails, setLoggedInUserDetails] = useState<LoggedInUserDetails | null>(null);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [isAddingFriend, setIsAddingFriend] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUserAuth(user);
      if (user) {
        const storedUserString = localStorage.getItem("loggedInUser");
        if (storedUserString) {
          try {
            const parsedUser: LoggedInUserDetails = JSON.parse(storedUserString);
            if (parsedUser.uid === user.uid) {
              setLoggedInUserDetails(parsedUser);
            } else {
              console.warn("FriendsPage: localStorage user UID mismatch with auth UID. Clearing local.")
              localStorage.removeItem("loggedInUser");
              setLoggedInUserDetails(null);
            }
          } catch (e) {
            console.error("FriendsPage: Error parsing loggedInUser from localStorage", e);
            localStorage.removeItem("loggedInUser");
            setLoggedInUserDetails(null);
          }
        }
      } else {
        setLoggedInUserDetails(null);
        setFriends([]); // Clear friends if logged out
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchFriends = async () => {
      if (!currentUserAuth?.uid) {
        setIsLoadingFriends(false);
        setFriends([]);
        return;
      }
      setIsLoadingFriends(true);
      const db = getFirestore(app, "poker");
      try {
        const friendsCollectionRef = collection(db, "users", currentUserAuth.uid, "friends");
        // Order by username for consistency, or 'since' for recency
        const q = query(friendsCollectionRef, orderBy("username", "asc")); 
        const querySnapshot = await getDocs(q);
        const fetchedFriends: Friend[] = querySnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id, // This is friendUserId
            name: data.name || "Unknown Friend",
            username: data.username || "unknown_friend",
            avatar: data.avatar || `https://placehold.co/100x100.png?text=${(data.name || "F").substring(0,1)}`,
            since: data.since,
          } as Friend;
        });
        setFriends(fetchedFriends);
        console.log(`FriendsPage: Fetched ${fetchedFriends.length} friends from Firestore for user ${currentUserAuth.uid}.`);
      } catch (error) {
        console.error("FriendsPage: Error fetching friends from Firestore:", error);
        toast({
          title: "Error Loading Friends",
          description: "Could not retrieve your friends list from Firestore. Check console and rules.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingFriends(false);
      }
    };

    if (currentUserAuth) {
      fetchFriends();
    }
  }, [currentUserAuth, toast]);

  const handleAddFriend = async () => {
    if (!newFriendQuery.trim()) {
      toast({ title: "Input Required", description: "Please enter a username or email.", variant: "destructive" });
      return;
    }
    if (!currentUserAuth || !loggedInUserDetails) {
      toast({ title: "Authentication Error", description: "You must be logged in to add friends.", variant: "destructive" });
      return;
    }
    setIsAddingFriend(true);
    const db = getFirestore(app, "poker");
    const currentUserId = currentUserAuth.uid;
    
    try {
      // Try finding by username first
      let userQuery = query(collection(db, "users"), where("username", "==", newFriendQuery.trim()), limit(1));
      let querySnapshot = await getDocs(userQuery);
      let targetUserDoc = querySnapshot.docs[0];

      // If not found by username, try by email (if query looks like an email)
      if (!targetUserDoc && newFriendQuery.includes('@')) {
        userQuery = query(collection(db, "users"), where("email", "==", newFriendQuery.trim()), limit(1));
        querySnapshot = await getDocs(userQuery);
        targetUserDoc = querySnapshot.docs[0];
      }

      if (!targetUserDoc) {
        toast({ title: "User Not Found", description: `No user found with username or email: ${newFriendQuery}.`, variant: "destructive" });
        setIsAddingFriend(false);
        return;
      }

      const targetUserData = targetUserDoc.data();
      const targetUserId = targetUserDoc.id;

      if (targetUserId === currentUserId) {
        toast({ title: "Cannot Add Self", description: "You cannot send a friend request to yourself.", variant: "default" });
        setIsAddingFriend(false);
        return;
      }

      // Check if already friends
      const friendDocRef = doc(db, "users", currentUserId, "friends", targetUserId);
      const friendDocSnap = await getDoc(friendDocRef);
      if (friendDocSnap.exists()) {
        toast({ title: "Already Friends", description: `You are already friends with ${targetUserData.username}.`, variant: "default" });
        setIsAddingFriend(false);
        return;
      }

      // Check for existing pending request (either way)
      const requestQuerySent = query(collection(db, "friendRequests"), 
        where("senderId", "==", currentUserId), 
        where("receiverId", "==", targetUserId),
        where("status", "==", "pending")
      );
      const requestQueryReceived = query(collection(db, "friendRequests"), 
        where("senderId", "==", targetUserId), 
        where("receiverId", "==", currentUserId),
        where("status", "==", "pending")
      );
      
      const [requestSnapshotSent, requestSnapshotReceived] = await Promise.all([getDocs(requestQuerySent), getDocs(requestQueryReceived)]);

      if (!requestSnapshotSent.empty || !requestSnapshotReceived.empty) {
        toast({ title: "Request Already Exists", description: "A friend request is already pending between you and this user.", variant: "default" });
        setIsAddingFriend(false);
        return;
      }

      // Create new friend request
      const friendRequestData = {
        senderId: currentUserId,
        senderUsername: loggedInUserDetails.username,
        senderAvatar: loggedInUserDetails.avatar || `https://placehold.co/40x40.png?text=${(loggedInUserDetails.username || "S").substring(0,1)}`,
        receiverId: targetUserId,
        receiverUsername: targetUserData.username,
        receiverAvatar: targetUserData.avatar || `https://placehold.co/40x40.png?text=${(targetUserData.username || "R").substring(0,1)}`,
        status: "pending",
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, "friendRequests"), friendRequestData);
      toast({ title: "Friend Request Sent!", description: `Friend request sent to ${targetUserData.username}. They will see it in their notifications.` });
      setNewFriendQuery("");
    } catch (error) {
      console.error("FriendsPage: Error sending friend request to Firestore:", error);
      toast({ title: "Error", description: "Could not send friend request. Check Firestore rules and console.", variant: "destructive" });
    } finally {
      setIsAddingFriend(false);
    }
  };

  const handleMessage = (name: string) => {
    toast({ title: "Message (Simulated)", description: `Opening chat with ${name}. Full chat functionality coming soon!` });
  };

  const handleUnfriend = async (friendId: string, friendName: string) => {
    if (!currentUserAuth?.uid) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive"});
      return;
    }
    const originalFriends = [...friends];
    setFriends(prevFriends => prevFriends.filter(friend => friend.id !== friendId));
    toast({ title: "Unfriending...", description: `Removing ${friendName} from your friends list.` });

    const db = getFirestore(app, "poker");
    const batch = writeBatch(db);
    const currentUserId = currentUserAuth.uid;

    const currentUserFriendRef = doc(db, "users", currentUserId, "friends", friendId);
    batch.delete(currentUserFriendRef);

    const otherUserFriendRef = doc(db, "users", friendId, "friends", currentUserId);
    batch.delete(otherUserFriendRef);

    try {
      await batch.commit();
      toast({ title: "Unfriended", description: `${friendName} has been removed from your friends.`, variant: "destructive" });
    } catch (error) {
      console.error("FriendsPage: Error unfriending user in Firestore:", error);
      setFriends(originalFriends);
      toast({ title: "Error Unfriending", description: "Could not unfriend user from Firestore. Check rules and console.", variant: "destructive" });
    }
  };

  const handleBlock = (name: string) => {
    toast({ title: "User Blocked (Simulated)", description: `${name} has been blocked. Full block functionality coming soon.`, variant: "destructive" });
  };

  const handleReport = (name: string) => {
    toast({ title: "User Reported (Simulated)", description: `A report for ${name} has been submitted. Moderation features coming soon.` });
  };

  return (
    <div className="container mx-auto">
      <Card className="mb-8 shadow-lg rounded-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl">Manage Friends</CardTitle>
          </div>
          <CardDescription>Connect with other players, manage your friend list, and send new requests (Firestore backed).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 border rounded-lg shadow-sm">
            <Label htmlFor="newFriendQuery" className="text-md font-semibold mb-2 block">Add New Friend</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="newFriendQuery"
                type="text"
                placeholder="Enter username or email"
                className="flex-grow"
                value={newFriendQuery}
                onChange={(e) => setNewFriendQuery(e.target.value)}
              />
              <Button onClick={handleAddFriend} className="w-full sm:w-auto" disabled={isAddingFriend || !loggedInUserDetails}>
                {isAddingFriend ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UserPlus className="mr-2 h-5 w-5" />}
                {isAddingFriend ? "Sending..." : "Send Request"}
              </Button>
            </div>
             <p className="text-xs text-muted-foreground mt-2">Searches users in Firestore and creates a 'friendRequest' document.</p>
          </div>
          
          <div>
            <h2 className="text-lg font-semibold mb-3">Your Friends ({friends.length})</h2>
            {isLoadingFriends && (
              <div className="text-center py-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="mt-2">Loading friends from Firestore...</p>
              </div>
            )}
            {!isLoadingFriends && friends.length === 0 && (
              <Card className="text-center p-6 shadow-md rounded-lg">
                <CardHeader>
                  <CardTitle className="text-lg">No Friends Yet!</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-muted-foreground">Use the 'Add New Friend' section to find and connect with other poker players.</p>
                </CardContent>
              </Card>
            )}
            {!isLoadingFriends && friends.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {friends.map((friend) => (
                  <Card key={friend.id} className="shadow-md rounded-lg overflow-hidden flex flex-col">
                    <CardHeader className="p-3 flex flex-row items-center space-x-3 bg-card">
                      <Link href={`/profile/${friend.username}`} passHref>
                        <Avatar className="h-14 w-14 border-2 border-primary cursor-pointer hover:opacity-80 transition-opacity">
                          <AvatarImage src={friend.avatar || `https://placehold.co/100x100.png?text=${friend.name.substring(0,1)}`} alt={friend.name} data-ai-hint="profile picture" />
                          <AvatarFallback>{friend.name.substring(0, 1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1">
                         <Link href={`/profile/${friend.username}`} passHref>
                          <CardTitle className="text-md hover:underline cursor-pointer">{friend.name}</CardTitle>
                        </Link>
                        <p className="text-xs text-muted-foreground">@{friend.username}</p>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 flex-grow flex flex-col justify-end border-t space-y-1.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => handleMessage(friend.name)}>
                          <MessageSquare className="mr-1 h-3.5 w-3.5" /> Message
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleUnfriend(friend.id, friend.name)}>
                          <UserMinus className="mr-1 h-3.5 w-3.5" /> Unfriend
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive-foreground bg-destructive/80 hover:bg-destructive" onClick={() => handleBlock(friend.name)}>
                          <UserX className="mr-1 h-3.5 w-3.5" /> Block
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleReport(friend.name)}>
                          <Flag className="mr-1 h-3.5 w-3.5" /> Report
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
