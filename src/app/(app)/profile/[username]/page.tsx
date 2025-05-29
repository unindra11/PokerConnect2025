
"use client"; 

import { useState, useEffect, use, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit3, UserPlus, Loader2, Users, Camera, UserCheck, UploadCloud } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PostCard } from "@/components/post-card";
import type { Post, User as PostUser, Comment as PostComment } from "@/types/post"; 
import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams } from "next/navigation"; 
import { app, auth, storage } from "@/lib/firebase"; 
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc, 
  updateDoc, 
  increment, 
  deleteDoc, 
  Timestamp,
  serverTimestamp,
  writeBatch,
  addDoc,
  getDoc
} from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";

interface ProfilePageUser { 
  uid: string;
  username: string;
  fullName?: string;
  email?: string;
  avatar?: string; 
  bio?: string;
  coverImage?: string; 
  friendsCount?: number; 
  location?: string;
  locationCoords?: { lat: number; lng: number } | null;
  createdAt?: Timestamp;
}

interface StoredNotification { 
  id: string;
  type: string; 
  user: { name: string; avatar: string; handle: string; username: string; }; 
  message: string;
  timestamp: string;
}

const MAX_AVATAR_SIZE_MB = 2;
const MAX_AVATAR_SIZE_BYTES = MAX_AVATAR_SIZE_MB * 1024 * 1024;

interface Connection {
  id: string;
  name: string;
  avatar: string;
  username: string; 
  aiHint?: string;
}

const mockProfileConnections: Connection[] = [
  { id: "conn1", name: "Ace High Alice", avatar: "https://placehold.co/100x100.png?c=a1", username: "alicepoker", aiHint: "profile picture" },
  { id: "conn2", name: "River Rat Randy", avatar: "https://placehold.co/100x100.png?c=r2", username: "randyriver", aiHint: "profile picture" },
  { id: "conn3", name: "Bluffmaster Ben", avatar: "https://placehold.co/100x100.png?c=b3", username: "benbluffs", aiHint: "profile picture" },
];


export default function UserProfilePage() {
  const params = use(useParams<{ username: string }>());
  const resolvedParams = params; // No need for use(params) if already destructured or passed directly
  const router = useRouter();

  const [isCurrentUserProfile, setIsCurrentUserProfile] = useState(false);
  const [profilePosts, setProfilePosts] = useState<Post[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [profileUser, setProfileUser] = useState<ProfilePageUser | null>(null);
  const { toast } = useToast();
  const profileAvatarInputRef = useRef<HTMLInputElement>(null);
  const [friendRequestStatus, setFriendRequestStatus] = useState<'idle' | 'sent' | 'friends'>('idle');
  const [currentLoggedInUserAuth, setCurrentLoggedInUserAuth] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentLoggedInUserAuth(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadProfileUserData = async () => {
      if (!resolvedParams.username) {
        setIsLoadingProfile(false);
        toast({ title: "Error", description: "Username not provided in URL.", variant: "destructive" });
        return;
      }
      setIsLoadingProfile(true);
      const firestore = getFirestore(app, "poker");
      const usersCollectionRef = collection(firestore, "users");
      const q = query(usersCollectionRef, where("username", "==", resolvedParams.username));
      
      console.log(`UserProfilePage: Attempting to fetch profile for username: @${resolvedParams.username}`);

      try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const userData = userDoc.data() as Omit<ProfilePageUser, 'uid'>;
          const fetchedProfileUser: ProfilePageUser = {
            uid: userDoc.id,
            ...userData,
            fullName: userData.fullName || userData.username,
            avatar: userData.avatar || `https://placehold.co/150x150.png?u=${userData.username}`,
            coverImage: userData.coverImage || `https://placehold.co/1200x300.png?u=${userData.username}&cover=firestore`,
            bio: userData.bio || "A passionate poker player enjoying the game.",
            friendsCount: 0, // Placeholder, can be enhanced later
          };
          setProfileUser(fetchedProfileUser);
          console.log(`UserProfilePage: Profile user data loaded from Firestore for @${resolvedParams.username}:`, fetchedProfileUser);

          if (currentLoggedInUserAuth && currentLoggedInUserAuth.uid === fetchedProfileUser.uid) {
            setIsCurrentUserProfile(true);
          } else {
            setIsCurrentUserProfile(false);
            if (currentLoggedInUserAuth) {
              const notificationsKey = `pokerConnectNotifications_${currentLoggedInUserAuth.uid}`; 
              const storedNotificationsString = localStorage.getItem(notificationsKey);
              if (storedNotificationsString) {
                try {
                    const existingNotifications: StoredNotification[] = JSON.parse(storedNotificationsString);
                    const requestSent = existingNotifications.some(
                    (notif) => notif.type === "friend_request_sent_confirmation" && notif.user?.username === fetchedProfileUser.username
                    );
                    if (requestSent) setFriendRequestStatus('sent');
                } catch (e) {
                    console.error("Error parsing notifications from localStorage", e);
                }
              }
            }
          }
        } else {
          console.warn(`UserProfilePage: No user found in Firestore with username: @${resolvedParams.username}`);
          toast({ title: "Profile Not Found", description: "Could not find this user's profile.", variant: "destructive" });
          setProfileUser(null); // Set to null if not found
        }
      } catch (error) {
        console.error("UserProfilePage: Error fetching profile user data from Firestore:", error);
        toast({ title: "Error Loading Profile", description: "Could not retrieve user data.", variant: "destructive" });
        setProfileUser(null);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    if (resolvedParams.username) {
        loadProfileUserData();
    }
  }, [resolvedParams.username, currentLoggedInUserAuth, toast]);


  useEffect(() => {
    const fetchProfilePosts = async () => {
      if (!profileUser?.uid) {
        setProfilePosts([]);
        setIsLoadingPosts(false);
        return;
      }
      setIsLoadingPosts(true);
      const firestore = getFirestore(app, "poker");
      console.log(`UserProfilePage: Fetching posts for profile user UID: ${profileUser.uid}`);
      
      const postsCollectionRef = collection(firestore, "posts");
      const q = query(
        postsCollectionRef,
        where("userId", "==", profileUser.uid),
        orderBy("createdAt", "desc")
      );

      try {
        const querySnapshot = await getDocs(q);
        const postsPromises = querySnapshot.docs.map(async (docSnap) => {
          const data = docSnap.data() as Omit<Post, 'id' | 'timestamp' | 'likedByCurrentUser' | 'fetchedComments'>;
          let likedByCurrentUser = false;
          let fetchedComments: PostComment[] = [];

          if (currentLoggedInUserAuth) {
            const likesQuery = query(
              collection(firestore, "likes"),
              where("postId", "==", docSnap.id),
              where("userId", "==", currentLoggedInUserAuth.uid)
            );
            const likeSnapshot = await getDocs(likesQuery);
            likedByCurrentUser = !likeSnapshot.empty;
          }
          
          const commentsCollectionRef = collection(firestore, "posts", docSnap.id, "comments");
          const commentsQuery = query(commentsCollectionRef, orderBy("createdAt", "asc"));
          const commentsSnapshot = await getDocs(commentsQuery);
          fetchedComments = commentsSnapshot.docs.map(commentDoc => ({
            id: commentDoc.id,
            ...(commentDoc.data() as Omit<PostComment, 'id'>)
          }));

          return {
            id: docSnap.id,
            ...data,
            likedByCurrentUser,
            fetchedComments,
            timestamp: data.createdAt instanceof Timestamp 
              ? data.createdAt.toDate().toLocaleString() 
              : (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000).toLocaleString() : new Date().toLocaleString()),
          } as Post;
        });
        const posts = await Promise.all(postsPromises);
        setProfilePosts(posts);
        console.log(`UserProfilePage: Fetched ${posts.length} posts for UID ${profileUser.uid}`);
      } catch (error: any) {
        console.error(`UserProfilePage: Error fetching posts for UID ${profileUser.uid}:`, error);
        let firestoreErrorMessage = "Could not retrieve posts for this profile.";
        if (error.message && error.message.includes("index")) {
           firestoreErrorMessage = `Failed to fetch posts. The query requires a Firestore index. Please check the browser console for a link to create it. Details: ${error.message}`;
        }
        toast({
          title: "Error Loading Posts",
          description: firestoreErrorMessage,
          variant: "destructive",
          duration: 10000,
        });
        setProfilePosts([]);
      } finally {
        setIsLoadingPosts(false);
      }
    };

    if (profileUser && profileUser.uid !== "unknown") {
      fetchProfilePosts();
    }
  }, [profileUser, currentLoggedInUserAuth, toast]);


  const handleDeletePost = async (postId: string) => {
    if (!currentLoggedInUserAuth || !isCurrentUserProfile || !profileUser) {
      toast({ title: "Error", description: "You can only delete your own posts.", variant: "destructive" });
      return;
    }
    const originalPosts = [...profilePosts];
    setProfilePosts(prevPosts => prevPosts.filter(post => post.id !== postId));
    
    toast({ title: "Post Deleting...", description: "Removing your post from Firestore." });

    try {
      const firestore = getFirestore(app, "poker");
      const batch = writeBatch(firestore);
      
      const postRef = doc(firestore, "posts", postId);
      batch.delete(postRef);

      const likesQuery = query(collection(firestore, "likes"), where("postId", "==", postId));
      const likesSnapshot = await getDocs(likesQuery);
      if (!likesSnapshot.empty) {
        likesSnapshot.forEach(likeDoc => batch.delete(likeDoc.ref));
      }
      
      const commentsRef = collection(firestore, "posts", postId, "comments");
      const commentsSnapshot = await getDocs(commentsRef);
      if (!commentsSnapshot.empty) {
        commentsSnapshot.forEach(commentDoc => batch.delete(commentDoc.ref));
      }
      
      await batch.commit();
      toast({ title: "Post Deleted", description: "Your post and its associated data have been removed." });
    } catch (error) {
      console.error("Error deleting post from Firestore on profile page:", error);
      setProfilePosts(originalPosts); 
      toast({ title: "Error Deleting Post", description: "Could not remove post. Please try again.", variant: "destructive" });
    }
  };
  
 const handleLikePost = async (postId: string) => {
    if (!currentLoggedInUserAuth) {
      toast({ title: "Authentication Error", description: "You must be logged in to like a post.", variant: "destructive" });
      return;
    }

    const firestore = getFirestore(app, "poker");
    const originalPosts = profilePosts.map(p => ({ ...p, fetchedComments: p.fetchedComments ? [...p.fetchedComments] : [] }));
    
    let isCurrentlyLikedOptimistic = false;
    setProfilePosts(prevPosts =>
      prevPosts.map(p => {
        if (p.id === postId) {
          isCurrentlyLikedOptimistic = !!p.likedByCurrentUser;
          const newLikedByCurrentUser = !isCurrentlyLikedOptimistic;
          let newLikesCount = p.likes || 0;

          if (newLikedByCurrentUser) { 
            newLikesCount = (p.likes || 0) + 1;
          } else { 
            newLikesCount = Math.max(0, (p.likes || 0) - 1);
          }
          return { ...p, likes: newLikesCount, likedByCurrentUser: newLikedByCurrentUser };
        }
        return p;
      })
    );

    try {
      const postRef = doc(firestore, "posts", postId);
      const likesCollectionRef = collection(firestore, "likes");
      const likeQuery = query(likesCollectionRef, where("postId", "==", postId), where("userId", "==", currentLoggedInUserAuth.uid));
      const likeSnapshot = await getDocs(likeQuery);
      const batch = writeBatch(firestore);

      if (likeSnapshot.empty) { 
        const newLikeRef = doc(collection(firestore, "likes")); 
        batch.set(newLikeRef, { postId: postId, userId: currentLoggedInUserAuth.uid, createdAt: serverTimestamp() });
        batch.update(postRef, { likes: increment(1) });
        await batch.commit();
        toast({ title: "Post Liked!", description: "Your like has been recorded." });
      } else { 
        likeSnapshot.forEach(doc => batch.delete(doc.ref));
        batch.update(postRef, { likes: increment(-1) });
        await batch.commit();
        toast({ title: "Like Removed", description: "Your like has been removed." });
      }
    } catch (error) {
      console.error("Error updating likes in Firestore on profile page:", error);
      setProfilePosts(originalPosts); 
      toast({ title: "Error Liking Post", description: "Could not save your like.", variant: "destructive" });
    }
  };

  const handleCommentOnPost = async (postId: string, commentText: string) => {
    if (!currentLoggedInUserAuth) {
      toast({ title: "Authentication Error", description: "You must be logged in to comment.", variant: "destructive" });
      return;
    }
    const loggedInUserString = localStorage.getItem("loggedInUser");
    let viewerDetails: Partial<ProfilePageUser> = { username: "Anonymous", avatar: "" };
    if (loggedInUserString) {
      try { viewerDetails = JSON.parse(loggedInUserString); } catch (e) { console.error("Error parsing loggedInUser for comment", e); }
    }
    
    const firestore = getFirestore(app, "poker");
    const postRef = doc(firestore, "posts", postId);
    const commentsCollectionRef = collection(firestore, "posts", postId, "comments");

    const newCommentData: Omit<PostComment, 'id'> = {
      userId: currentLoggedInUserAuth.uid,
      username: viewerDetails.username || "Anonymous",
      avatar: viewerDetails.avatar || `https://placehold.co/40x40.png?text=${(viewerDetails.username || "A").substring(0,1)}`,
      text: commentText,
      createdAt: serverTimestamp(),
    };

    try {
      const commentDocRef = await addDoc(commentsCollectionRef, newCommentData);
      await updateDoc(postRef, { comments: increment(1) });

      const newCommentForUI: PostComment = {
        ...newCommentData,
        id: commentDocRef.id,
        createdAt: new Date() 
      };

      setProfilePosts(prevPosts => prevPosts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            comments: (p.comments || 0) + 1,
            fetchedComments: [...(p.fetchedComments || []), newCommentForUI].sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          };
        }
        return p;
      }));
      toast({ title: "Comment Posted!", description: "Your comment has been added." });
    } catch (error) {
      console.error("Error adding comment to Firestore on profile page:", error);
      toast({ title: "Error Posting Comment", description: "Could not save your comment.", variant: "destructive" });
    }
  };

const handleProfileAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profileUser || !isCurrentUserProfile || !currentLoggedInUserAuth) return;

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
        toast({ title: "File Too Large", description: `Max ${MAX_AVATAR_SIZE_MB}MB.`, variant: "destructive" });
        if (profileAvatarInputRef.current) profileAvatarInputRef.current.value = "";
        return;
    }
    if (!file.type.startsWith("image/")) {
        toast({ title: "Unsupported File Type", description: "Please select an image.", variant: "destructive" });
        if (profileAvatarInputRef.current) profileAvatarInputRef.current.value = "";
        return;
    }

    const originalAvatar = profileUser.avatar;
    const reader = new FileReader();
    reader.onloadend = () => setProfileUser(prev => prev ? {...prev, avatar: reader.result as string} : null);
    reader.readAsDataURL(file);

    const storageRefPath = `avatars/${currentLoggedInUserAuth.uid}/avatar_${Date.now()}_${file.name}`;
    const fileStorageRef = ref(storage, storageRefPath);
    const uploadTask = uploadBytesResumable(fileStorageRef, file);

    try {
        toast({ title: "Uploading Avatar...", description: "Please wait." });
        await uploadTask;
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        
        const firestore = getFirestore(app, "poker");
        const userDocRef = doc(firestore, "users", currentLoggedInUserAuth.uid);
        await updateDoc(userDocRef, { avatar: downloadURL });

        setProfileUser(prev => prev ? {...prev, avatar: downloadURL} : null);
        
        const loggedInUserString = localStorage.getItem("loggedInUser");
        if (loggedInUserString) {
            let loggedInUser: ProfilePageUser = JSON.parse(loggedInUserString);
            if (loggedInUser.uid === currentLoggedInUserAuth.uid) {
                loggedInUser.avatar = downloadURL;
                localStorage.setItem("loggedInUser", JSON.stringify(loggedInUser));
            }
        }
        toast({ title: "Avatar Updated!", description: "New avatar saved to Firestore." });
    } catch (error: any) {
        console.error("Error saving avatar to Firebase:", error);
        setProfileUser(prev => prev ? {...prev, avatar: originalAvatar} : null);
        toast({ title: "Upload Failed", description: `Could not save avatar: ${error.message}.`, variant: "destructive" });
    } finally {
        if (profileAvatarInputRef.current) profileAvatarInputRef.current.value = "";
    }
};


  const handleSendFriendRequest = () => {
    if (!profileUser || !currentLoggedInUserAuth || profileUser.uid === "unknown") {
        toast({ title: "Error", description: "User data not loaded.", variant: "destructive" });
        return;
    }
    if (currentLoggedInUserAuth.uid === profileUser.uid) {
      toast({ title: "Info", description: "You cannot send a friend request to yourself." });
      return;
    }
    
    try {
      const loggedInUserDetailsString = localStorage.getItem("loggedInUser");
      if (!loggedInUserDetailsString) {
        toast({title: "Error", description: "Logged in user details not found for notification.", variant: "destructive"});
        return;
      }
      const loggedInUserDetails: ProfilePageUser = JSON.parse(loggedInUserDetailsString);

      const sentNotification: StoredNotification = {
        id: `notif_sent_to_${profileUser.username}_${Date.now()}`,
        type: "friend_request_sent_confirmation",
        user: { 
          name: profileUser.fullName || profileUser.username, 
          avatar: profileUser.avatar || `https://placehold.co/100x100.png?u=${profileUser.username}`, 
          handle: `@${profileUser.username}`,
          username: profileUser.username
        },
        message: "Friend request sent.",
        timestamp: new Date().toLocaleString(),
      };

      const senderNotificationsKey = `pokerConnectNotifications_${currentLoggedInUserAuth.uid}`;
      let senderExistingNotifications: StoredNotification[] = [];
      const senderStoredNotificationsString = localStorage.getItem(senderNotificationsKey);
      if (senderStoredNotificationsString) {
        try { senderExistingNotifications = JSON.parse(senderStoredNotificationsString); if (!Array.isArray(senderExistingNotifications)) senderExistingNotifications = []; }
        catch (e) { senderExistingNotifications = []; }
      }
      senderExistingNotifications.unshift(sentNotification); 
      localStorage.setItem(senderNotificationsKey, JSON.stringify(senderExistingNotifications));

      const incomingRequestNotification: StoredNotification = {
        id: `notif_received_from_${loggedInUserDetails.username}_${Date.now()}`,
        type: "friend_request", 
        user: { 
            name: loggedInUserDetails.fullName || loggedInUserDetails.username,
            avatar: loggedInUserDetails.avatar || `https://placehold.co/100x100.png?u=${loggedInUserDetails.username}`,
            handle: `@${loggedInUserDetails.username}`,
            username: loggedInUserDetails.username
        },
        message: "sent you a friend request.",
        timestamp: new Date().toLocaleString(),
      };

      const recipientNotificationsKey = `pokerConnectNotifications_${profileUser.uid}`; 
      let recipientExistingNotifications: StoredNotification[] = [];
      const recipientStoredNotificationsString = localStorage.getItem(recipientNotificationsKey);
      if (recipientStoredNotificationsString) {
        try { recipientExistingNotifications = JSON.parse(recipientStoredNotificationsString); if (!Array.isArray(recipientExistingNotifications)) recipientExistingNotifications = []; }
        catch (e) { recipientExistingNotifications = []; }
      }
      recipientExistingNotifications.unshift(incomingRequestNotification);
      localStorage.setItem(recipientNotificationsKey, JSON.stringify(recipientExistingNotifications));

      toast({ title: "Friend Request Sent!", description: `Your friend request to ${profileUser.fullName || profileUser.username} has been sent.` });
      setFriendRequestStatus('sent'); 
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast({ title: "Error", description: "Could not send friend request.", variant: "destructive" });
    }
  };

  if (isLoadingProfile) {
    return (
        <div className="container mx-auto max-w-4xl text-center py-10">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="mt-4">Loading profile for @{resolvedParams.username}...</p>
        </div>
    );
  }
  
  if (!profileUser) { // If profileUser is null after loading attempt
     return (
        <div className="container mx-auto max-w-4xl text-center py-10">
            <Card><CardHeader><CardTitle>Profile Not Found</CardTitle></CardHeader><CardContent><p>The user @{resolvedParams.username} does not exist or their profile could not be loaded.</p></CardContent></Card>
        </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl">
      <Card className="shadow-xl rounded-xl overflow-hidden">
        <div className="relative h-48 md:h-64">
          <Image 
            src={profileUser.coverImage || `https://placehold.co/1200x300.png?text=${profileUser.username}&cover=1`} 
            alt={`${profileUser.fullName}'s cover photo`} 
            fill
            style={{objectFit: "cover"}}
            data-ai-hint="poker table background"
            priority 
            key={profileUser.coverImage} 
          />
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
            <div className="flex flex-col sm:flex-row items-center sm:items-end space-x-0 sm:space-x-4">
              <div className="relative group">
                <label htmlFor={isCurrentUserProfile ? "profile-avatar-upload" : undefined} 
                       className={isCurrentUserProfile ? "cursor-pointer" : ""}>
                  <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background -mb-12 sm:-mb-0 relative z-10">
                    <AvatarImage src={profileUser.avatar || `https://placehold.co/150x150.png?u=${profileUser.username}`} alt={profileUser.fullName} data-ai-hint="profile picture" key={profileUser.avatar} />
                    <AvatarFallback>{profileUser.fullName?.substring(0, 2)?.toUpperCase() || 'P'}</AvatarFallback>
                  </Avatar>
                  {isCurrentUserProfile && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full z-20 -mb-12 sm:-mb-0">
                      <UploadCloud className="h-8 w-8 text-white" />
                    </div>
                  )}
                </label>
                {isCurrentUserProfile && (
                  <input
                    id="profile-avatar-upload"
                    type="file"
                    className="sr-only"
                    accept="image/*"
                    onChange={handleProfileAvatarChange}
                    ref={profileAvatarInputRef}
                  />
                )}
              </div>

              <div className="text-center sm:text-left pt-12 sm:pt-0 sm:pb-2">
                <h1 className="text-3xl font-bold text-white">{profileUser.fullName}</h1>
                <p className="text-sm text-gray-300">@{profileUser.username}</p>
              </div>
                {isCurrentUserProfile ? (
                    <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4 sm:mt-0 sm:ml-auto bg-white/20 hover:bg-white/30 text-white border-white/50"
                    onClick={() => router.push('/settings')}
                    >
                    <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
                    </Button>
                ) : friendRequestStatus === 'sent' ? (
                    <Button variant="outline" size="sm" className="mt-4 sm:mt-0 sm:ml-auto" disabled>
                        <UserCheck className="mr-2 h-4 w-4" /> Request Sent
                    </Button>
                ) : (
                    <Button variant="default" size="sm" className="mt-4 sm:mt-0 sm:ml-auto" onClick={handleSendFriendRequest} disabled={!currentLoggedInUserAuth || !profileUser}>
                        <UserPlus className="mr-2 h-4 w-4" /> Add Friend
                    </Button>
                )}
            </div>
          </div>
        </div>
        
        <CardContent className="pt-16 sm:pt-8">
          <div className="grid grid-cols-2 gap-4 text-center my-4 border-b pb-4">
            <div>
              <p className="font-semibold text-lg">{profilePosts.length}</p>
              <p className="text-sm text-muted-foreground">Posts</p>
            </div>
            <div>
              <p className="font-semibold text-lg">{profileUser.friendsCount || 0}</p>
              <p className="text-sm text-muted-foreground">Friends</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold mb-1">Bio</h3>
            <p className="text-sm text-muted-foreground">{profileUser.bio || "No bio provided."}</p>
          </div>

          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-2"> 
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="connections">Connections</TabsTrigger>
            </TabsList>
            <TabsContent value="posts" className="mt-6 space-y-6">
              {isLoadingPosts && (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2">Loading posts...</p>
                </div>
              )}
              {!isLoadingPosts && profilePosts.length === 0 && (
                <Card className="text-center p-8">
                  <CardHeader> <CardTitle>No Posts Yet</CardTitle> </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      {isCurrentUserProfile ? "You haven't shared any posts." : `${profileUser.fullName} hasn't shared any posts.`}
                    </p>
                    {isCurrentUserProfile && (
                       <Link href="/create-post" passHref className="mt-4 inline-block">
                          <Button>Create Your First Post</Button>
                       </Link>
                    )}
                  </CardContent>
                </Card>
              )}
              {!isLoadingPosts && profilePosts.map((post, index) => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  currentUserId={currentLoggedInUserAuth?.uid}
                  showManagementControls={isCurrentUserProfile}
                  onDeletePost={isCurrentUserProfile ? handleDeletePost : undefined}
                  onLikePost={handleLikePost} 
                  onCommentPost={handleCommentOnPost}
                  isLCPItem={index === 0}
                />
              ))}
            </TabsContent>
            <TabsContent value="connections" className="mt-6">
               <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Users /> Connections</CardTitle>
                  <CardDescription>People connected with {profileUser.fullName}. (Mock Data)</CardDescription>
                </CardHeader>
                <CardContent>
                  {mockProfileConnections.length === 0 ? (
                    <p className="text-muted-foreground">No connections to display.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {mockProfileConnections.map((connection) => (
                        <Card key={connection.id} className="flex flex-col items-center p-4 shadow-md rounded-lg">
                          <Avatar className="h-20 w-20 mb-3 border-2 border-primary">
                            <AvatarImage src={connection.avatar} alt={connection.name} data-ai-hint={connection.aiHint || "profile picture"}/>
                            <AvatarFallback>{connection.name.substring(0,1)}</AvatarFallback>
                          </Avatar>
                          <p className="font-semibold text-center text-md mb-1">{connection.name}</p>
                          <Link href={`/profile/${connection.username}`} passHref className="mt-auto w-full">
                            <Button variant="outline" size="sm" className="w-full">View Profile</Button>
                          </Link>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

    
