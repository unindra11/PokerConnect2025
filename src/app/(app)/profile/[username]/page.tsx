'use client';

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { app, auth } from "@/lib/firebase";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  onSnapshot,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MapPin, MoreHorizontal, UserMinus, UserPlus, Share2, MessageCircle, Heart } from "lucide-react";

interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  username: string;
  avatar: string;
  bio: string;
  location: { country: string; state: string; city: string } | null;
  locationCoords?: { lat: number; lng: number };
  createdAt: any;
}

interface Friend {
  friendUserId: string;
  username: string;
  name: string;
  avatar: string;
  since: any;
}

interface Post {
  id: string;
  userId: string;
  user: {
    name: string;
    handle: string;
    avatar: string;
  };
  content: string;
  image?: string;
  imageAiHint?: string;
  likes: number;
  comments: number;
  shares: number;
  createdAt: any;
  updatedAt?: any;
  originalPostId?: string;
  likedByCurrentUser: boolean;
  commentsData?: Comment[];
}

interface Comment {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  text: string;
  createdAt: any;
}

export default function UserProfilePage() {
  const router = useRouter();
  const { username } = useParams();
  const { toast } = useToast();
  const [currentUserAuth, setCurrentUserAuth] = useState<FirebaseUser | null>(null);
  const [loggedInUserDetails, setLoggedInUserDetails] = useState<UserProfile | null>(null);
  const [profileUser, setProfileUser] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [relationshipStatus, setRelationshipStatus] = useState<
    "self" | "friends" | "pending_sent" | "pending_received" | "not_friends"
  >("not_friends");
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [displayLocation, setDisplayLocation] = useState<string | null>(null);
  const db = getFirestore(app, "poker");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      console.log("UserProfilePage: Checking authentication state", {
        isLoadingAuth,
        currentUserAuth: user,
      });
      setCurrentUserAuth(user);
      if (!user) {
        router.push("/login");
        setIsLoadingAuth(false);
        setIsLoadingProfile(false);
        return;
      }

      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        setLoggedInUserDetails(userDocSnap.data() as UserProfile);
      }
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, [router, db]);

  const fetchProfileUser = async () => {
    console.log("fetchProfileUser: Triggering fetchProfileUser");
    try {
      const startTime = new Date();
      console.log(`fetchProfileUser: Starting fetch at ${startTime.toISOString()}`);
      console.log("fetchProfileUser: Current state", {
        username,
        currentUserAuth,
        loggedInUserDetails,
      });

      if (!username || typeof username !== "string") {
        toast({
          title: "Error",
          description: "Invalid username in URL.",
          variant: "destructive",
        });
        router.push("/");
        return;
      }

      console.log(`fetchProfileUser: Fetching profile for username: ${username}`);
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", username));
      console.log(`fetchProfileUser: Executing query for username: ${username}`);
      const querySnapshot = await getDocs(q);

      console.log(`fetchProfileUser: Query snapshot size: ${querySnapshot.size}`);
      console.log(`fetchProfileUser: Query snapshot docs:`, querySnapshot.docs);

      if (querySnapshot.empty) {
        toast({
          title: "User Not Found",
          description: `No user found with username ${username}.`,
          variant: "destructive",
        });
        router.push("/");
        return;
      }

      const userData = querySnapshot.docs[0].data() as UserProfile;
      userData.uid = querySnapshot.docs[0].id;
      console.log("fetchProfileUser: Found user by username query:", userData);
      setProfileUser(userData);
    } catch (error) {
      console.error("fetchProfileUser: Error fetching user profile:", error);
      toast({
        title: "Error",
        description: "Could not load user profile. Please try again later.",
        variant: "destructive",
      });
      router.push("/");
    } finally {
      console.log("fetchProfileUser: Finally block reached, setting isLoadingProfile to false");
      setIsLoadingProfile(false);
    }

    return () => {
      console.log("fetchProfileUser: Cleanup - Component unmounted");
    };
  };

  useEffect(() => {
    if (!isLoadingAuth) {
      fetchProfileUser();
    }
  }, [isLoadingAuth, username]);

  useEffect(() => {
    if (!profileUser || !profileUser.location) {
      setDisplayLocation(null);
      return;
    }
    const { city, state, country } = profileUser.location;
    setDisplayLocation(`${city}, ${state}, ${country}`);
  }, [profileUser]);

  useEffect(() => {
    if (!currentUserAuth || !profileUser) return;

    const fetchPosts = async () => {
      try {
        setIsLoadingPosts(true);
        console.log("UserProfilePage: Setting up posts listener for user:", profileUser);
        console.log("UserProfilePage: Querying posts with userId:", profileUser.uid);
        const postsQuery = query(
          collection(db, "posts"),
          where("userId", "==", profileUser.uid)
        );

        const unsubscribe = onSnapshot(postsQuery, async (snapshot) => {
          console.log(`Posts query snapshot size: ${snapshot.size}`);
          console.log("Posts query snapshot docs:", snapshot.docs);

          const postsData: Post[] = [];
          for (const docSnap of snapshot.docs) {
            const postData = docSnap.data();
            console.log(`Processing post ID: ${docSnap.id} data:`, postData);

            const userDocRef = doc(db, "users", postData.userId);
            const userDocSnap = await getDoc(userDocRef);
            let userData = postData.user;
            if (userDocSnap.exists()) {
              userData = userDocSnap.data();
              console.log("Fetched user data for post author:", userData);
            }

            const likesQuery = query(
              collection(db, "likes"),
              where("postId", "==", docSnap.id),
              where("userId", "==", currentUserAuth.uid)
            );
            const likesSnapshot = await getDocs(likesQuery);
            console.log(`Liked by current user: ${!likesSnapshot.empty}`);

            const commentsQuery = query(
              collection(db, "posts", docSnap.id, "comments")
            );
            const commentsSnapshot = await getDocs(commentsQuery);
            const commentsData = commentsSnapshot.docs.map((commentDoc) => ({
              id: commentDoc.id,
              ...commentDoc.data(),
            })) as Comment[];
            console.log("Fetched comments for post:", commentsData);

            postsData.push({
              id: docSnap.id,
              userId: postData.userId,
              user: {
                name: userData.fullName || userData.username || "Unknown",
                handle: userData.username || "unknown",
                avatar: userData.avatar || "",
              },
              content: postData.content,
              image: postData.image || null,
              imageAiHint: postData.imageAiHint || null,
              likes: postData.likes || 0,
              comments: postData.comments || 0,
              shares: postData.shares || 0,
              createdAt: postData.createdAt,
              updatedAt: postData.updatedAt || null,
              originalPostId: postData.originalPostId || null,
              likedByCurrentUser: !likesSnapshot.empty,
              commentsData,
            });
          }

          postsData.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
          console.log("UserProfilePage: Fetched posts:", postsData);
          setPosts(postsData);
          setIsLoadingPosts(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("UserProfilePage: Error fetching posts:", error);
        setPosts([]);
        setIsLoadingPosts(false);
      }
    };

    fetchPosts();
  }, [currentUserAuth, profileUser, db, toast]);

  useEffect(() => {
    if (!currentUserAuth || !profileUser) return;

    const checkRelationship = async () => {
      if (currentUserAuth.uid === profileUser.uid) {
        setRelationshipStatus("self");
        return;
      }

      console.log(
        `Checking relationship between ${currentUserAuth.uid} and ${profileUser.uid}`
      );
      const friendRequestSentQuery = query(
        collection(db, "friendRequests"),
        where("senderId", "==", currentUserAuth.uid),
        where("receiverId", "==", profileUser.uid),
        where("status", "==", "pending")
      );

      const friendRequestReceivedQuery = query(
        collection(db, "friendRequests"),
        where("senderId", "==", profileUser.uid),
        where("receiverId", "==", currentUserAuth.uid),
        where("status", "==", "pending")
      );

      const [sentSnapshot, receivedSnapshot, friendSnapshot] = await Promise.all([
        getDocs(friendRequestSentQuery),
        getDocs(friendRequestReceivedQuery),
        getDoc(doc(db, "users", currentUserAuth.uid, "friends", profileUser.uid)),
      ]);

      if (friendSnapshot.exists()) {
        console.log("Users are friends. Setting relationshipStatus to 'friends'");
        setRelationshipStatus("friends");
      } else if (!sentSnapshot.empty) {
        setRelationshipStatus("pending_sent");
      } else if (!receivedSnapshot.empty) {
        setRelationshipStatus("pending_received");
      } else {
        setRelationshipStatus("not_friends");
      }
    };

    const fetchFriends = async () => {
      try {
        if (
          relationshipStatus !== "friends" &&
          relationshipStatus !== "self" &&
          currentUserAuth.uid !== profileUser.uid
        ) {
          console.log("UserProfilePage: Skipping friends fetch due to lack of permission", {
            currentUserUid: currentUserAuth.uid,
            profileUserUid: profileUser.uid,
            relationshipStatus,
          });
          setFriends([]);
          setIsLoadingFriends(false);
          return;
        }

        setIsLoadingFriends(true);
        console.log(`UserProfilePage: Fetching friends for user: ${profileUser.uid}`);
        const friendsRef = collection(db, "users", profileUser.uid, "friends");
        const friendsQuery = query(friendsRef);
        const friendsSnapshot = await getDocs(friendsQuery);

        const friendsList: Friend[] = [];
        for (const docSnap of friendsSnapshot.docs) {
          const friendData = docSnap.data();
          friendsList.push({
            friendUserId: friendData.friendUserId,
            username: friendData.username,
            name: friendData.name,
            avatar: friendData.avatar,
            since: friendData.since,
          });
        }

        console.log("UserProfilePage: Fetched friends:", friendsList);
        setFriends(friendsList);
        setIsLoadingFriends(false);

        const unsubscribe = onSnapshot(friendsQuery, (snapshot) => {
          const updatedFriends: Friend[] = [];
          snapshot.forEach((docSnap) => {
            const friendData = docSnap.data();
            updatedFriends.push({
              friendUserId: friendData.friendUserId,
              username: friendData.username,
              name: friendData.name,
              avatar: friendData.avatar,
              since: friendData.since,
            });
          });
          setFriends(updatedFriends);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("UserProfilePage: Error fetching friends:", error);
        setFriends([]);
        setIsLoadingFriends(false);
      }
    };

    checkRelationship().then(() => {
      fetchFriends();
    });
  }, [currentUserAuth, profileUser, relationshipStatus, db]);

  const handleAddFriend = async () => {
    if (!currentUserAuth || !profileUser || !loggedInUserDetails) return;

    try {
      // Use a deterministic ID for the friend request
      const friendRequestId = `${currentUserAuth.uid}_${profileUser.uid}`;
      const friendRequestRef = doc(db, "friendRequests", friendRequestId);

      // Check for existing friend request
      const existingRequestSnap = await getDoc(friendRequestRef);
      if (existingRequestSnap.exists() && existingRequestSnap.data().status === "pending") {
        toast({
          title: "Request Already Sent",
          description: "You have already sent a friend request to this user.",
        });
        return;
      }

      // Create the friend request
      await setDoc(friendRequestRef, {
        senderId: currentUserAuth.uid,
        receiverId: profileUser.uid,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Create a notification for the receiver with the same ID as the friend request
      const notificationRef = doc(db, "users", profileUser.uid, "notifications", friendRequestId);
      await setDoc(notificationRef, {
        type: "friend_request_firestore", // Updated to match expected type
        senderId: currentUserAuth.uid,
        senderUsername: loggedInUserDetails.username || "Unknown User",
        senderAvatar: loggedInUserDetails.avatar || "",
        createdAt: serverTimestamp(),
        read: false,
      });

      setRelationshipStatus("pending_sent");
      toast({
        title: "Friend Request Sent",
        description: `Friend request sent to ${profileUser.fullName}.`,
      });
    } catch (error) {
      console.error("UserProfilePage: Error sending friend request:", error);
      toast({
        title: "Error",
        description: "Could not send friend request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!currentUserAuth || !profileUser || !loggedInUserDetails) return;

    try {
      const friendRequestsQuery = query(
        collection(db, "friendRequests"),
        where("senderId", "==", profileUser.uid),
        where("receiverId", "==", currentUserAuth.uid),
        where("status", "==", "pending")
      );
      const friendRequestsSnapshot = await getDocs(friendRequestsQuery);

      if (friendRequestsSnapshot.empty) {
        toast({
          title: "Error",
          description: "No pending friend request found.",
          variant: "destructive",
        });
        return;
      }

      const friendRequestDoc = friendRequestsSnapshot.docs[0];
      const friendRequestRef = doc(db, "friendRequests", friendRequestDoc.id);
      await updateDoc(friendRequestRef, {
        status: "accepted",
        updatedAt: serverTimestamp(),
      });

      const friendRef = doc(db, "users", currentUserAuth.uid, "friends", profileUser.uid);
      const userFriendRef = doc(db, "users", profileUser.uid, "friends", currentUserAuth.uid);

      await Promise.all([
        setDoc(friendRef, {
          friendUserId: profileUser.uid,
          username: profileUser.username,
          name: profileUser.fullName,
          avatar: profileUser.avatar,
          since: serverTimestamp(),
        }),
        setDoc(userFriendRef, {
          friendUserId: currentUserAuth.uid,
          username: loggedInUserDetails.username,
          name: loggedInUserDetails.fullName,
          avatar: loggedInUserDetails.avatar,
          since: serverTimestamp(),
        }),
        addDoc(collection(db, "users", profileUser.uid, "notifications"), {
          type: "friend_request_accepted",
          senderId: currentUserAuth.uid,
          senderUsername: loggedInUserDetails.username,
          senderAvatar: loggedInUserDetails.avatar,
          receiverId: profileUser.uid,
          createdAt: serverTimestamp(),
          read: false,
        }),
      ]);

      setRelationshipStatus("friends");
      toast({
        title: "Friend Request Accepted",
        description: `You are now friends with ${profileUser.fullName}!`,
      });
    } catch (error) {
      console.error("UserProfilePage: Error accepting friend request:", error);
      toast({
        title: "Error",
        description: "Could not accept friend request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeclineFriendRequest = async () => {
    if (!currentUserAuth || !profileUser || !loggedInUserDetails) return;

    try {
      const friendRequestsQuery = query(
        collection(db, "friendRequests"),
        where("senderId", "==", profileUser.uid),
        where("receiverId", "==", currentUserAuth.uid),
        where("status", "==", "pending")
      );
      const friendRequestsSnapshot = await getDocs(friendRequestsQuery);

      if (friendRequestsSnapshot.empty) {
        toast({
          title: "Error",
          description: "No pending friend request found.",
          variant: "destructive",
        });
        return;
      }

      const friendRequestDoc = friendRequestsSnapshot.docs[0];
      const friendRequestRef = doc(db, "friendRequests", friendRequestDoc.id);
      await updateDoc(friendRequestRef, {
        status: "declined",
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, "users", profileUser.uid, "notifications"), {
        type: "friend_request_declined",
        senderId: currentUserAuth.uid,
        senderUsername: loggedInUserDetails.username,
        senderAvatar: loggedInUserDetails.avatar,
        receiverId: profileUser.uid,
        createdAt: serverTimestamp(),
        read: false,
      });

      setRelationshipStatus("not_friends");
      toast({
        title: "Friend Request Declined",
        description: `You have declined the friend request from ${profileUser.fullName}.`,
      });
    } catch (error) {
      console.error("UserProfilePage: Error declining friend request:", error);
      toast({
        title: "Error",
        description: "Could not decline friend request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUnfriend = async () => {
    if (!currentUserAuth || !profileUser) return;

    try {
      const friendRef = doc(db, "users", currentUserAuth.uid, "friends", profileUser.uid);
      const userFriendRef = doc(db, "users", profileUser.uid, "friends", currentUserAuth.uid);

      const chatId = [currentUserAuth.uid, profileUser.uid].sort().join("_");
      const chatRef = doc(db, "chats", chatId);
      const chatSnap = await getDoc(chatRef);

      await Promise.all([
        deleteDoc(friendRef),
        deleteDoc(userFriendRef),
        chatSnap.exists() ? deleteDoc(chatRef) : Promise.resolve(),
      ]);

      setRelationshipStatus("not_friends");
      setFriends([]);
      toast({
        title: "Friend Removed",
        description: `You have unfriended ${profileUser.fullName}.`,
      });
    } catch (error) {
      console.error("UserProfilePage: Error unfriending user:", error);
      toast({
        title: "Error",
        description: "Could not unfriend the user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleMessage = async () => {
    if (!currentUserAuth || !profileUser) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to send messages.",
        variant: "destructive",
      });
      return;
    }

    try {
      const friendshipRef1 = doc(db, "users", currentUserAuth.uid, "friends", profileUser.uid);
      const friendshipRef2 = doc(db, "users", profileUser.uid, "friends", currentUserAuth.uid);
      const [friendshipSnap1, friendshipSnap2] = await Promise.all([
        getDoc(friendshipRef1),
        getDoc(friendshipRef2),
      ]);

      if (!friendshipSnap1.exists() || !friendshipSnap2.exists()) {
        toast({
          title: "Cannot Start Chat",
          description: `You must be friends with ${profileUser.fullName} to start a chat.`,
          variant: "destructive",
        });
        return;
      }

      const chatId = [currentUserAuth.uid, profileUser.uid].sort().join("_");
      const chatRef = doc(db, "chats", chatId);
      const chatSnap = await getDoc(chatRef);
      if (!chatSnap.exists()) {
        const [finalCheck1, finalCheck2] = await Promise.all([
          getDoc(friendshipRef1),
          getDoc(friendshipRef2),
        ]);

        if (!finalCheck1.exists() || !finalCheck2.exists()) {
          console.error("UserProfilePage (handleMessage): Friendship status changed before creating chat");
          toast({
            title: "Cannot Start Chat",
            description: `Friendship status with ${profileUser.fullName} changed. Please try again.`,
            variant: "destructive",
          });
          return;
        }

        const chatData = {
          participants: [currentUserAuth.uid, profileUser.uid],
          lastMessage: {
            text: "",
            senderId: "",
            timestamp: null,
          },
          unreadCounts: {
            [currentUserAuth.uid]: 0,
            [profileUser.uid]: 0,
          },
        };
        await setDoc(chatRef, chatData);
      }

      router.push(`/chat/${chatId}`);
      toast({
        title: "Starting Chat",
        description: `Opening conversation with ${profileUser.fullName}.`,
      });
    } catch (error) {
      console.error("UserProfilePage (handleMessage): Error starting chat:", error);
      toast({
        title: "Error",
        description: "Could not start the chat. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLike = async (postId: string, loved: boolean) => {
    if (!currentUserAuth) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to like posts.",
        variant: "destructive",
      });
      return;
    }

    try {
      const postRef = doc(db, "posts", postId);
      const likeRef = doc(db, "likes", `${currentUserAuth.uid}_${postId}`);

      if (loved) {
        await Promise.all([
          deleteDoc(likeRef),
          updateDoc(postRef, {
            likes: posts.find((p) => p.id === postId)!.likes - 1,
          }),
        ]);
      } else {
        await Promise.all([
          setDoc(likeRef, {
            userId: currentUserAuth.uid,
            postId: postId,
            createdAt: serverTimestamp(),
          }),
          updateDoc(postRef, {
            likes: posts.find((p) => p.id === postId)!.likes + 1,
          }),
          addDoc(collection(db, "users", profileUser!.uid, "notifications"), {
            type: "like_post",
            senderId: currentUserAuth.uid,
            senderUsername: loggedInUserDetails?.username,
            senderAvatar: loggedInUserDetails?.avatar,
            postId: postId,
            createdAt: serverTimestamp(),
            read: false,
          }),
        ]);
      }
    } catch (error) {
      console.error("UserProfilePage: Error liking/unliking post:", error);
      toast({
        title: "Error",
        description: "Could not like/unlike the post. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async (post: Post) => {
    if (!currentUserAuth || !profileUser || !loggedInUserDetails) return;

    try {
      const newPostRef = await addDoc(collection(db, "posts"), {
        userId: currentUserAuth.uid,
        user: {
          name: loggedInUserDetails.fullName,
          handle: loggedInUserDetails.username,
          avatar: loggedInUserDetails.avatar,
        },
        content: post.content,
        image: post.image || null,
        imageAiHint: post.imageAiHint || null,
        likes: 0,
        comments: 0,
        shares: 0,
        createdAt: serverTimestamp(),
        originalPostId: post.id,
      });

      const originalPostRef = doc(db, "posts", post.id);
      await Promise.all([
        updateDoc(originalPostRef, {
          shares: post.shares + 1,
        }),
        addDoc(collection(db, "users", post.userId, "notifications"), {
          type: "share_post",
          senderId: currentUserAuth.uid,
          senderUsername: loggedInUserDetails.username,
          senderAvatar: loggedInUserDetails.avatar,
          postId: newPostRef.id,
          caption: post.content,
          createdAt: serverTimestamp(),
          read: false,
        }),
      ]);

      toast({
        title: "Post Shared",
        description: "The post has been shared successfully.",
      });
    } catch (error) {
      console.error("UserProfilePage: Error sharing post:", error);
      toast({
        title: "Error",
        description: "Could not share the post. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoadingAuth || isLoadingProfile) {
    console.log("UserProfilePage: Rendering loading state", {
      profileUser,
      isLoadingProfile,
    });
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-green-900 to-green-700">
        <div className="text-center">
          <p className="text-lg font-medium text-white">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-green-900 to-green-700">
        <div className="text-center">
          <p className="text-lg font-medium text-white">User not found.</p>
          <Link href="/" className="text-yellow-400 hover:underline font-semibold">
            Go back to home
          </Link>
        </div>
      </div>
    );
  }

  console.log("UserProfilePage: Rendering profile page", { profileUser });

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-green-700">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        <div className="mx-4 sm:mx-6">
          <Card className="shadow-xl rounded-xl bg-white/90 border border-red-600">
            <CardHeader className="relative flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 p-4 sm:p-6 bg-gradient-to-r from-black to-gray-800 rounded-t-xl">
              <div className="relative flex-shrink-0">
                <Avatar className="h-28 w-28 sm:h-36 sm:w-36 border-4 border-yellow-500 shadow-md">
                  <AvatarImage src={profileUser.avatar} alt={profileUser.fullName} />
                  <AvatarFallback className="text-3xl sm:text-4xl font-bold bg-gray-700 text-white">
                    {profileUser.fullName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">{profileUser.fullName}</h2>
                    <p className="text-sm sm:text-base text-yellow-400">@{profileUser.username}</p>
                  </div>
                </div>
                {profileUser.bio && (
                  <p className="mt-2 text-white text-sm sm:text-base leading-relaxed">{profileUser.bio}</p>
                )}
                <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-yellow-400 text-sm">
                  {displayLocation && (
                    <p className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-red-500" />
                      {displayLocation}
                    </p>
                  )}
                  <p>
                    Joined{" "}
                    {profileUser.createdAt
                      ? new Date(profileUser.createdAt.toDate()).toLocaleDateString()
                      : "Unknown"}
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 justify-center sm:justify-start">
                  {relationshipStatus === "self" ? (
                    <Button
                      variant="default"
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full px-4 py-2 transition-colors border border-yellow-500"
                      onClick={() => router.push("/settings")}
                    >
                      Edit Profile
                    </Button>
                  ) : relationshipStatus === "friends" ? (
                    <>
                      <Button
                        variant="default"
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full px-4 py-2 transition-colors border border-yellow-500"
                        onClick={handleMessage}
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Message
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full border-yellow-500 text-white hover:bg-gray-700 transition-colors"
                          >
                            <MoreHorizontal className="h-5 w-5 text-yellow-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-gray-800 border border-yellow-500">
                          <DropdownMenuItem
                            onClick={handleUnfriend}
                            className="text-red-500 hover:bg-gray-700"
                          >
                            <UserMinus className="mr-2 h-4 w-4" />
                            Unfriend
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  ) : relationshipStatus === "pending_sent" ? (
                    <Button
                      variant="outline"
                      disabled
                      className="rounded-full border-yellow-500 text-gray-400 cursor-not-allowed"
                    >
                      Request Sent
                    </Button>
                  ) : relationshipStatus === "pending_received" ? (
                    <>
                      <Button
                        variant="default"
                        className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-full px-4 py-2 transition-colors border border-black"
                        onClick={handleAcceptFriendRequest}
                      >
                        Accept Friend Request
                      </Button>
                      <Button
                        variant="destructive"
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full px-4 py-2 transition-colors border border-black"
                        onClick={handleDeclineFriendRequest}
                      >
                        Decline
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="default"
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full px-4 py-2 transition-colors border border-yellow-500"
                      onClick={handleAddFriend}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Friend
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 bg-white/90">
              <Tabs defaultValue="posts" className="mt-4">
                <TabsList className="flex justify-center sm:justify-start bg-gray-800 rounded-full p-2 gap-4">
                  <TabsTrigger
                    value="posts"
                    className="rounded-full px-6 py-3 font-semibold text-white data-[state=active]:bg-red-600 data-[state=active]:text-white transition-all border border-yellow-500"
                  >
                    Posts
                  </TabsTrigger>
                  <TabsTrigger
                    value="friends"
                    className="rounded-full px-6 py-3 font-semibold text-white data-[state=active]:bg-red-600 data-[state=active]:text-white transition-all border border-yellow-500"
                  >
                    Friends
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="posts" className="mt-6">
                  {isLoadingPosts ? (
                    <p className="text-center text-gray-700 font-medium">Loading posts...</p>
                  ) : posts.length === 0 ? (
                    <p className="text-center text-gray-700 font-medium">No posts yet.</p>
                  ) : (
                    <div className="space-y-6">
                      {posts.map((post) => (
                        <Card
                          key={post.id}
                          className="shadow-md rounded-xl bg-white border border-red-600 hover:shadow-lg transition-shadow duration-300"
                        >
                          <CardHeader className="p-4 bg-gray-100 rounded-t-xl">
                            <div className="flex items-center gap-3">
                              <Link href={`/profile/${post.user.handle}`}>
                                <Avatar className="h-10 w-10 border-2 border-yellow-500">
                                  <AvatarImage src={post.user.avatar} alt={post.user.name} />
                                  <AvatarFallback className="bg-gray-700 text-white">{post.user.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                              </Link>
                              <div className="flex-1">
                                <Link href={`/profile/${post.user.handle}`}>
                                  <p className="font-semibold text-gray-900 hover:underline">{post.user.name}</p>
                                </Link>
                                <p className="text-sm text-gray-600">
                                  @{post.user.handle} •{" "}
                                  {new Date(post.createdAt.toDate()).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 pt-0">
                            <p className="text-gray-900 leading-relaxed">{post.content}</p>
                            {post.image && (
                              <img
                                src={post.image}
                                alt={post.imageAiHint || "Post image"}
                                className="mt-4 rounded-md max-w-full h-auto shadow-sm border border-gray-300"
                              />
                            )}
                            {post.originalPostId && (
                              <p className="text-sm text-gray-600 mt-2 italic">
                                Shared from original post
                              </p>
                            )}
                            <div className="flex gap-3 mt-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleLike(post.id, post.likedByCurrentUser)}
                                className={`flex items-center gap-1 ${
                                  post.likedByCurrentUser ? "text-red-600" : "text-gray-600"
                                } hover:bg-gray-200 rounded-full transition-colors`}
                              >
                                <Heart
                                  className={`h-5 w-5 ${
                                    post.likedByCurrentUser ? "fill-current" : ""
                                  }`}
                                />
                                <span>{post.likes}</span>
                              </Button>
                              <Link href={`/post/${post.id}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="flex items-center gap-1 text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                                >
                                  <MessageCircle className="h-5 w-5" />
                                  <span>{post.comments}</span>
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleShare(post)}
                                className="flex items-center gap-1 text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                              >
                                <Share2 className="h-5 w-5" />
                                <span>{post.shares}</span>
                              </Button>
                            </div>
                            {post.commentsData && post.commentsData.length > 0 && (
                              <div className="mt-4">
                                <h4 className="text-sm font-semibold text-gray-900">Comments</h4>
                                <div className="space-y-3 mt-2">
                                  {post.commentsData.map((comment) => (
                                    <div
                                      key={comment.id}
                                      className="flex items-start gap-3 border-t border-gray-300 pt-3"
                                    >
                                      <Link href={`/profile/${comment.username}`}>
                                        <Avatar className="h-8 w-8 border border-yellow-500">
                                          <AvatarImage src={comment.avatar} alt={comment.username} />
                                          <AvatarFallback className="bg-gray-700 text-white">{comment.username.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                      </Link>
                                      <div className="flex-1">
                                        <Link href={`/profile/${comment.username}`}>
                                          <p className="text-sm font-semibold text-gray-900 hover:underline">
                                            {comment.username}
                                          </p>
                                        </Link>
                                        <p className="text-sm text-gray-900">{comment.text}</p>
                                        <p className="text-xs text-gray-600">
                                          {new Date(comment.createdAt.toDate()).toLocaleDateString()}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="friends" className="mt-6">
                  {isLoadingFriends ? (
                    <p className="text-center text-gray-700 font-medium">Loading friends...</p>
                  ) : friends.length === 0 ? (
                    <p className="text-center text-gray-700 font-medium">
                      {relationshipStatus === "self"
                        ? "You have no friends yet."
                        : "No friends to display."}
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {friends.map((friend) => (
                        <div key={friend.friendUserId}>
                          <Link href={`/profile/${friend.username}`}>
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-red-600 hover:bg-gray-100 transition-colors shadow-sm">
                              <Avatar className="h-10 w-10 border border-yellow-500">
                                <AvatarImage src={friend.avatar} alt={friend.name} />
                                <AvatarFallback className="bg-gray-700 text-white">{friend.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900 hover:underline">{friend.name}</p>
                                <p className="text-sm text-gray-600">@{friend.username}</p>
                                <p className="text-sm text-gray-600">
                                  Friends since{" "}
                                  {friend.since
                                    ? new Date(friend.since.toDate()).toLocaleDateString()
                                    : "Unknown"}
                                </p>
                              </div>
                            </div>
                          </Link>
                          <Separator className="bg-gray-300" />
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}