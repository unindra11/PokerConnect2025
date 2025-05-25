
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
import type { Post, User as PostUser } from "@/types/post"; 
import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams } from "next/navigation"; 
import type { MockUserPin } from "@/app/(app)/map/page";
import { storage } from "@/lib/firebase"; // Import Firebase storage
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";


interface LoggedInUser { 
  username: string;
  fullName?: string;
  email?: string;
  avatar?: string; 
  bio?: string;
  coverImage?: string; 
  friendsCount?: number; 
}

interface StoredNotification { 
  id: string;
  type: string; 
  user: { name: string; avatar: string; handle: string; username?: string; }; 
  message: string;
  timestamp: string;
}


const USER_POSTS_STORAGE_KEY = "pokerConnectUserPosts";
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
  { id: "conn4", name: "Tournament Tina", avatar: "https://placehold.co/100x100.png?c=t4", username: "tinatourney", aiHint: "profile picture" },
  { id: "conn5", name: "Strategy Sam", avatar: "https://placehold.co/100x100.png?c=s5", username: "samsgto", aiHint: "profile picture" },
];


export default function UserProfilePage({ params }: { params: { username: string } }) {
  const resolvedParams = use(params); 
  const router = useRouter();

  const [isCurrentUserProfile, setIsCurrentUserProfile] = useState(false);
  const [profilePosts, setProfilePosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [profileUser, setProfileUser] = useState<LoggedInUser | null>(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string>("https://placehold.co/150x150.png?text=P");
  const [profileCoverImageUrl, setProfileCoverImageUrl] = useState<string>("https://placehold.co/1200x300.png?cover=1"); 
  const { toast } = useToast();
  const profileAvatarInputRef = useRef<HTMLInputElement>(null);
  const [friendRequestStatus, setFriendRequestStatus] = useState<'idle' | 'sent' | 'friends'>('idle');
  const [currentLoggedInUser, setCurrentLoggedInUser] = useState<LoggedInUser | null>(null);
  
  useEffect(() => {
    let userForProfile: LoggedInUser | null = null;
    let avatarForProfile: string = `https://placehold.co/150x150.png?u=${resolvedParams.username}`; 
    let coverForProfile: string = "https://placehold.co/1200x300.png?cover=1";
    let loggedInUserForState: LoggedInUser | null = null;

    try {
      const loggedInUserString = localStorage.getItem("loggedInUser");
      if (loggedInUserString) {
        const loggedInUser: LoggedInUser = JSON.parse(loggedInUserString);
        loggedInUserForState = loggedInUser;
        setCurrentLoggedInUser(loggedInUser);

        if (loggedInUser.username === resolvedParams.username) { 
          setIsCurrentUserProfile(true);
          userForProfile = loggedInUser;
        } else { 
          setIsCurrentUserProfile(false);
          const allUsersString = localStorage.getItem("pokerConnectMapUsers");
          let foundOtherUser = false;
          if (allUsersString) {
             const allUsers: MockUserPin[] = JSON.parse(allUsersString);
             const otherUser = allUsers.find(u => u.username === resolvedParams.username);
             if (otherUser) {
                 userForProfile = { 
                     username: otherUser.username,
                     fullName: otherUser.name,
                     bio: otherUser.bio || "A passionate poker player enjoying the game.",
                     avatar: otherUser.avatar,
                     coverImage: otherUser.coverImage || `https://placehold.co/1200x300.png?u=${otherUser.username}&cover=map`,
                     email: "", 
                     friendsCount: Math.floor(Math.random() * 200) 
                 };
                 foundOtherUser = true;
             }
          }

          if (!foundOtherUser) { 
            const pokerConnectUserString = localStorage.getItem("pokerConnectUser");
            if (pokerConnectUserString) {
                const mainStoredUser: LoggedInUser = JSON.parse(pokerConnectUserString);
                if (mainStoredUser.username === resolvedParams.username) {
                    userForProfile = mainStoredUser;
                    foundOtherUser = true;
                }
            }
          }
          
          if (!foundOtherUser) { 
             userForProfile = {
                username: resolvedParams.username,
                fullName: resolvedParams.username.charAt(0).toUpperCase() + resolvedParams.username.slice(1),
                bio: "A passionate poker player enjoying the game.",
                avatar: `https://placehold.co/150x150.png?u=${resolvedParams.username}`,
                coverImage: `https://placehold.co/1200x300.png?u=${resolvedParams.username}&cover=fallback`,
                email: "",
                friendsCount: Math.floor(Math.random() * 100)
            };
          }
        }
      } else { 
        setIsCurrentUserProfile(false);
        const allUsersString = localStorage.getItem("pokerConnectMapUsers");
        let foundPublicUser = false;
        if (allUsersString) {
           const allUsers: MockUserPin[] = JSON.parse(allUsersString);
           const publicUser = allUsers.find(u => u.username === resolvedParams.username);
           if (publicUser) {
               userForProfile = {
                   username: publicUser.username,
                   fullName: publicUser.name,
                   bio: publicUser.bio || "A passionate poker player.",
                   avatar: publicUser.avatar,
                   coverImage: publicUser.coverImage || `https://placehold.co/1200x300.png?u=${publicUser.username}&cover=publicmap`,
                   email: "",
                   friendsCount: Math.floor(Math.random() * 150)
               };
               foundPublicUser = true;
           }
        }
        if (!foundPublicUser) {
          const pokerConnectUserString = localStorage.getItem("pokerConnectUser");
          if (pokerConnectUserString) {
              const mainStoredUser: LoggedInUser = JSON.parse(pokerConnectUserString);
              if (mainStoredUser.username === resolvedParams.username) {
                  userForProfile = mainStoredUser;
                  foundPublicUser = true;
              }
          }
        }
        if (!foundPublicUser) { 
           userForProfile = {
              username: resolvedParams.username,
              fullName: resolvedParams.username.charAt(0).toUpperCase() + resolvedParams.username.slice(1),
              bio: "A passionate poker player.",
              avatar: `https://placehold.co/150x150.png?u=${resolvedParams.username}`,
              coverImage: `https://placehold.co/1200x300.png?u=${resolvedParams.username}&cover=publicfallback`,
              email: "",
              friendsCount: Math.floor(Math.random() * 50)
           };
        }
      }

      if (userForProfile) {
          avatarForProfile = userForProfile.avatar || `https://placehold.co/150x150.png?u=${userForProfile.username}&ava=1`;
          coverForProfile = userForProfile.coverImage || `https://placehold.co/1200x300.png?u=${userForProfile.username}&cover=1`;
      }
      
      if (loggedInUserForState && userForProfile && loggedInUserForState.username !== userForProfile.username) {
        const notificationsKey = `pokerConnectNotifications_${loggedInUserForState.username}`;
        const storedNotificationsString = localStorage.getItem(notificationsKey);
        if (storedNotificationsString) {
          const existingNotifications: StoredNotification[] = JSON.parse(storedNotificationsString);
          const requestSent = existingNotifications.some(
            (notif) => notif.type === "friend_request_sent_confirmation" && notif.user?.username === userForProfile?.username
          );
          if (requestSent) {
            setFriendRequestStatus('sent');
          }
        }
      }

    } catch (error) {
      console.error("Error reading user data from localStorage for profile page:", error);
      userForProfile = { 
        username: resolvedParams.username,
        fullName: resolvedParams.username.charAt(0).toUpperCase() + resolvedParams.username.slice(1),
        bio: "Error loading profile. Please try again.",
        avatar: `https://placehold.co/150x150.png?u=${resolvedParams.username}`,
        coverImage: `https://placehold.co/1200x300.png?u=${resolvedParams.username}&cover=error`,
        email: "",
        friendsCount: 0
      };
    }
    setProfileUser(userForProfile);
    setProfileAvatarUrl(avatarForProfile);
    setProfileCoverImageUrl(coverForProfile);
    console.log(`[Profile Page for ${resolvedParams.username}] User data loaded. Profile User:`, userForProfile, "Avatar URL:", avatarForProfile, "Cover URL:", coverForProfile);
  }, [resolvedParams.username]); 


  useEffect(() => {
    setIsLoadingPosts(true);
    if (!resolvedParams.username) return; 
    try {
      const storedPostsString = localStorage.getItem(USER_POSTS_STORAGE_KEY);
      if (storedPostsString) {
        const allPosts: Post[] = JSON.parse(storedPostsString);
        const userSpecificPosts = allPosts.filter(
          (post) => post.user.handle === `@${resolvedParams.username}`
        );
        setProfilePosts(userSpecificPosts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      } else {
        setProfilePosts([]);
      }
    } catch (error) {
      console.error("Error loading posts from localStorage for profile:", error);
      toast({
        title: "Error Loading Posts",
        description: "Could not retrieve posts for this profile.",
        variant: "destructive",
      });
      setProfilePosts([]);
    } finally {
      setIsLoadingPosts(false);
    }
  }, [resolvedParams.username, toast]);

  const handleDeletePost = (postId: string) => {
    try {
      const updatedPosts = profilePosts.filter(post => post.id !== postId);
      setProfilePosts(updatedPosts);
      
      const allStoredPostsString = localStorage.getItem(USER_POSTS_STORAGE_KEY);
      if (allStoredPostsString) {
          let allStoredPosts: Post[] = JSON.parse(allStoredPostsString);
          allStoredPosts = allStoredPosts.filter(p => p.id !== postId);
          localStorage.setItem(USER_POSTS_STORAGE_KEY, JSON.stringify(allStoredPosts));
      }
      toast({
        title: "Post Deleted",
        description: "The post has been removed.",
      });
    } catch (error) {
      console.error("Error deleting post from localStorage:", error);
      toast({
        title: "Error Deleting Post",
        description: "Could not remove the post.",
        variant: "destructive",
      });
    }
  };
  
 const handleLikePost = (postId: string) => {
    let postContentForToast = "";
    setProfilePosts(prevPosts =>
      prevPosts.map(p => {
        if (p.id === postId) {
          postContentForToast = p.content.substring(0, 20) + "...";
          const alreadyLiked = !!p.likedByCurrentUser;
          return { 
            ...p, 
            likes: p.likes + (alreadyLiked ? -1 : 1), 
            likedByCurrentUser: !alreadyLiked 
          };
        }
        return p;
      })
    );
    try {
      const allStoredPostsString = localStorage.getItem(USER_POSTS_STORAGE_KEY);
      if (allStoredPostsString) {
        let allStoredPosts: Post[] = JSON.parse(allStoredPostsString);
        allStoredPosts = allStoredPosts.map(p => {
          if (p.id === postId) {
             const storedPost = allStoredPosts.find(sp => sp.id === postId);
             const alreadyLiked = !!storedPost?.likedByCurrentUser;
             return { 
              ...p, 
              likes: (storedPost?.likes || 0) + (alreadyLiked ? -1 : 1), 
              likedByCurrentUser: !alreadyLiked 
            };
          }
          return p;
        });
        localStorage.setItem(USER_POSTS_STORAGE_KEY, JSON.stringify(allStoredPosts));
        toast({
          title: allStoredPosts.find(p=>p.id === postId)?.likedByCurrentUser ? "Post Liked!" : "Like Removed",
          description: `You reacted to "${postContentForToast}".`,
        });
      }
    } catch (error) {
      console.error("Error updating likes in localStorage:", error);
       toast({
        title: "Error Liking Post",
        description: "Could not save your like.",
        variant: "destructive",
      });
    }
  };

  const handleCommentOnPost = (postId: string, commentText: string) => {
    setProfilePosts(prevPosts =>
      prevPosts.map(p =>
        p.id === postId ? { 
          ...p, 
          comments: (p.comments || 0) + 1,
          commentTexts: [...(p.commentTexts || []), commentText] 
        } : p
      )
    );
    try {
      const allStoredPostsString = localStorage.getItem(USER_POSTS_STORAGE_KEY);
      if (allStoredPostsString) {
        let allStoredPosts: Post[] = JSON.parse(allStoredPostsString);
        allStoredPosts = allStoredPosts.map(p =>
          p.id === postId ? { 
            ...p, 
            comments: (p.comments || 0) + 1,
            commentTexts: [...(p.commentTexts || []), commentText] 
          } : p
        );
        localStorage.setItem(USER_POSTS_STORAGE_KEY, JSON.stringify(allStoredPosts));
        toast({
            title: "Comment Added",
            description: "Your comment has been saved.",
        });
      }
    } catch (error) {
      console.error("Error saving comment to localStorage:", error);
      toast({
        title: "Error Commenting",
        description: "Could not save your comment.",
        variant: "destructive",
      });
    }
  };

const handleProfileAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profileUser || !isCurrentUserProfile) return;

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
        toast({
            title: "File Too Large",
            description: `Please select an image smaller than ${MAX_AVATAR_SIZE_MB}MB.`,
            variant: "destructive",
        });
        if (profileAvatarInputRef.current) profileAvatarInputRef.current.value = "";
        return;
    }
    if (!file.type.startsWith("image/")) {
        toast({
            title: "Unsupported File Type",
            description: "Please select an image file (e.g., PNG, JPG, GIF).",
            variant: "destructive",
        });
        if (profileAvatarInputRef.current) profileAvatarInputRef.current.value = "";
        return;
    }

    // Show local preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
        setProfileAvatarUrl(reader.result as string); // Temporary local preview
    };
    reader.readAsDataURL(file);

    const storageRef = ref(storage, `avatars/${profileUser.username}/avatar_${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    try {
        toast({ title: "Uploading Avatar...", description: "Please wait." });
        await uploadTask;
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        setProfileAvatarUrl(downloadURL);

        // Update localStorage for loggedInUser, pokerConnectUser, and pokerConnectMapUsers
        const loggedInUserString = localStorage.getItem("loggedInUser");
        if (loggedInUserString) {
            let loggedInUser: LoggedInUser = JSON.parse(loggedInUserString);
            if (loggedInUser.username === profileUser.username) {
                loggedInUser.avatar = downloadURL;
                localStorage.setItem("loggedInUser", JSON.stringify(loggedInUser));
            }
        }
        const pokerConnectUserString = localStorage.getItem("pokerConnectUser");
        if (pokerConnectUserString) {
            let pokerConnectUser: LoggedInUser = JSON.parse(pokerConnectUserString);
            if (pokerConnectUser.username === profileUser.username) {
                pokerConnectUser.avatar = downloadURL;
                localStorage.setItem("pokerConnectUser", JSON.stringify(pokerConnectUser));
            }
        }
        const mapUsersString = localStorage.getItem("pokerConnectMapUsers");
        if (mapUsersString) {
            let mapUsers: MockUserPin[] = JSON.parse(mapUsersString);
            mapUsers = mapUsers.map(mu => mu.username === profileUser.username ? {...mu, avatar: downloadURL} : mu);
            localStorage.setItem("pokerConnectMapUsers", JSON.stringify(mapUsers));
        }

        toast({
            title: "Profile Picture Updated!",
            description: "Your new profile picture has been saved to Firebase Storage.",
        });

    } catch (error: any) {
        console.error("Error saving avatar to Firebase Storage or localStorage from profile:", error);
        toast({ title: "Upload Failed", description: `Could not save new avatar: ${error.message}. Reverting.`, variant: "destructive" });
        // Revert to previous avatar
        const loggedInUserString = localStorage.getItem("loggedInUser");
         if (loggedInUserString) {
            const loggedInUser = JSON.parse(loggedInUserString);
            if (loggedInUser.username === profileUser.username) {
                setProfileAvatarUrl(loggedInUser.avatar || `https://placehold.co/150x150.png?u=${profileUser.username}&ava=1`);
            }
        }
    } finally {
        if (profileAvatarInputRef.current) profileAvatarInputRef.current.value = "";
    }
};


  const handleSendFriendRequest = () => {
    if (!profileUser || !currentLoggedInUser) {
        toast({ title: "Error", description: "User data not loaded.", variant: "destructive" });
        return;
    }

    if (currentLoggedInUser.username === profileUser.username) {
      toast({ title: "Info", description: "You cannot send a friend request to yourself." });
      return;
    }
    
    try {
      const sentNotification: StoredNotification = {
        id: `notif_sent_to_${profileUser.username}_${Date.now()}`,
        type: "friend_request_sent_confirmation",
        user: { 
          name: profileUser.fullName || profileUser.username, 
          avatar: profileAvatarUrl || `https://placehold.co/100x100.png?u=${profileUser.username}`, 
          handle: `@${profileUser.username}`,
          username: profileUser.username
        },
        message: "Friend request sent.",
        timestamp: new Date().toLocaleString(),
      };

      const senderNotificationsKey = `pokerConnectNotifications_${currentLoggedInUser.username}`;
      let senderExistingNotifications: StoredNotification[] = [];
      const senderStoredNotificationsString = localStorage.getItem(senderNotificationsKey);
      if (senderStoredNotificationsString) {
        try {
          senderExistingNotifications = JSON.parse(senderStoredNotificationsString);
          if (!Array.isArray(senderExistingNotifications)) senderExistingNotifications = [];
        } catch (e) { senderExistingNotifications = []; }
      }
      senderExistingNotifications.unshift(sentNotification); 
      localStorage.setItem(senderNotificationsKey, JSON.stringify(senderExistingNotifications));

      const incomingRequestNotification: StoredNotification = {
        id: `notif_received_from_${currentLoggedInUser.username}_${Date.now()}`,
        type: "friend_request", 
        user: { 
            name: currentLoggedInUser.fullName || currentLoggedInUser.username,
            avatar: currentLoggedInUser.avatar || `https://placehold.co/100x100.png?u=${currentLoggedInUser.username}`,
            handle: `@${currentLoggedInUser.username}`,
            username: currentLoggedInUser.username
        },
        message: "sent you a friend request.",
        timestamp: new Date().toLocaleString(),
      };

      const recipientNotificationsKey = `pokerConnectNotifications_${profileUser.username}`;
      let recipientExistingNotifications: StoredNotification[] = [];
      const recipientStoredNotificationsString = localStorage.getItem(recipientNotificationsKey);
      if (recipientStoredNotificationsString) {
        try {
          recipientExistingNotifications = JSON.parse(recipientStoredNotificationsString);
          if (!Array.isArray(recipientExistingNotifications)) recipientExistingNotifications = [];
        } catch (e) { recipientExistingNotifications = []; }
      }
      recipientExistingNotifications.unshift(incomingRequestNotification);
      localStorage.setItem(recipientNotificationsKey, JSON.stringify(recipientExistingNotifications));


      toast({
        title: "Friend Request Sent!",
        description: `Your friend request to ${profileUser.fullName || profileUser.username} has been sent.`,
      });
      setFriendRequestStatus('sent'); 

    } catch (error) {
      console.error("Error sending friend request:", error);
      toast({ title: "Error", description: "Could not send friend request.", variant: "destructive" });
    }
  };


  const mockUser = { 
    name: profileUser?.fullName || resolvedParams.username.charAt(0).toUpperCase() + resolvedParams.username.slice(1), 
    username: resolvedParams.username,
    avatar: profileAvatarUrl || `https://placehold.co/150x150.png?u=${resolvedParams.username}`,
    bio: profileUser?.bio || "Passionate poker player, always learning and looking for the next big win. Specializing in Texas Hold'em tournaments.",
    joinedDate: "Joined January 2023", 
    friendsCount: profileUser?.friendsCount || 0, 
    totalPosts: profilePosts.length, 
    coverImage: profileCoverImageUrl || "https://placehold.co/1200x300.png?cover=1",
    coverImageAiHint: "poker table background",
  };

  if (!profileUser) { 
    return (
        <div className="container mx-auto max-w-4xl text-center py-10">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="mt-4">Loading profile...</p>
        </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl">
      <Card className="shadow-xl rounded-xl overflow-hidden">
        <div className="relative h-48 md:h-64">
          <Image 
            src={mockUser.coverImage} 
            alt={`${mockUser.name}'s cover photo`} 
            fill
            style={{objectFit: "cover"}}
            data-ai-hint={mockUser.coverImageAiHint}
            priority 
            key={mockUser.coverImage} 
          />
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
            <div className="flex flex-col sm:flex-row items-center sm:items-end space-x-0 sm:space-x-4">
             
              <div className="relative group">
                <label htmlFor={isCurrentUserProfile ? "profile-avatar-upload" : undefined} 
                       className={isCurrentUserProfile ? "cursor-pointer" : ""}>
                  <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background -mb-12 sm:-mb-0 relative z-10">
                    <AvatarImage src={mockUser.avatar} alt={mockUser.name} data-ai-hint="profile picture" key={mockUser.avatar} />
                    <AvatarFallback>{mockUser.name.substring(0, 2).toUpperCase() || 'P'}</AvatarFallback>
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
                <h1 className="text-3xl font-bold text-white">{mockUser.name}</h1>
                <p className="text-sm text-gray-300">@{mockUser.username}</p>
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
                    <Button variant="default" size="sm" className="mt-4 sm:mt-0 sm:ml-auto" onClick={handleSendFriendRequest}>
                        <UserPlus className="mr-2 h-4 w-4" /> Add Friend
                    </Button>
                )}
            </div>
          </div>
        </div>
        
        <CardContent className="pt-16 sm:pt-8">
          <div className="grid grid-cols-2 gap-4 text-center my-4 border-b pb-4">
            <div>
              <p className="font-semibold text-lg">{mockUser.totalPosts}</p>
              <p className="text-sm text-muted-foreground">Posts</p>
            </div>
            <div>
              <p className="font-semibold text-lg">{mockUser.friendsCount}</p>
              <p className="text-sm text-muted-foreground">Friends</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold mb-1">Bio</h3>
            <p className="text-sm text-muted-foreground">{mockUser.bio}</p>
            <p className="text-xs text-muted-foreground mt-2">{mockUser.joinedDate}</p>
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
                  <CardHeader>
                    <CardTitle>No Posts Yet</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">This user hasn't shared any posts.</p>
                    {isCurrentUserProfile && (
                       <Link href="/create-post" passHref className="mt-4 inline-block">
                          <Button>Create Your First Post</Button>
                       </Link>
                    )}
                  </CardContent>
                </Card>
              )}
              {!isLoadingPosts && profilePosts.map(post => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  showManagementControls={isCurrentUserProfile}
                  onDeletePost={isCurrentUserProfile ? handleDeletePost : undefined}
                  onLikePost={handleLikePost}
                  onCommentPost={handleCommentOnPost}
                />
              ))}
            </TabsContent>
            <TabsContent value="connections" className="mt-6">
               <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Users /> Connections</CardTitle>
                  <CardDescription>People connected with {mockUser.name}.</CardDescription>
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
