
"use client"; 

import { useState, useEffect, use, useRef } from "react"; // Added useRef
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCog, ShieldCheck, Edit3, UserPlus, Loader2, Users, Camera } from "lucide-react"; // Added Camera
import Image from "next/image";
import Link from "next/link";
import { PostCard } from "@/components/post-card";
import type { Post, User as PostUser } from "@/types/post";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation"; // Import useRouter

interface LoggedInUser {
  username: string;
  fullName?: string;
  email?: string;
  avatar?: string; 
  bio?: string; // Added bio
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
  const router = useRouter(); // Initialize useRouter

  const [isCurrentUserProfile, setIsCurrentUserProfile] = useState(false);
  const [profilePosts, setProfilePosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [profileUser, setProfileUser] = useState<LoggedInUser | null>(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | undefined>(undefined);
  const { toast } = useToast();
  const profileAvatarInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    let userForProfile: LoggedInUser | null = null;
    let avatarForProfile: string | undefined = `https://placehold.co/150x150.png?u=${resolvedParams.username}`; 

    try {
      const loggedInUserString = localStorage.getItem("loggedInUser");
      if (loggedInUserString) {
        const loggedInUser: LoggedInUser = JSON.parse(loggedInUserString);
        if (loggedInUser && loggedInUser.username === resolvedParams.username) {
          setIsCurrentUserProfile(true);
          userForProfile = loggedInUser; 
          if (loggedInUser.avatar) {
            avatarForProfile = loggedInUser.avatar;
          }
        } else {
          setIsCurrentUserProfile(false);
          userForProfile = { 
            username: resolvedParams.username, 
            fullName: resolvedParams.username.charAt(0).toUpperCase() + resolvedParams.username.slice(1),
            bio: "A passionate poker player enjoying the game." // Default bio for other users
          };
        }
      } else {
        setIsCurrentUserProfile(false);
        userForProfile = { 
          username: resolvedParams.username,
          fullName: resolvedParams.username.charAt(0).toUpperCase() + resolvedParams.username.slice(1),
          bio: "A passionate poker player enjoying the game." // Default bio for non-logged-in scenarios
        };
      }
    } catch (error) {
      console.error("Error reading loggedInUser from localStorage for profile page:", error);
      setIsCurrentUserProfile(false);
      userForProfile = { 
        username: resolvedParams.username,
        fullName: resolvedParams.username.charAt(0).toUpperCase() + resolvedParams.username.slice(1),
        bio: "A passionate poker player enjoying the game."
      };
    }
    setProfileUser(userForProfile);
    setProfileAvatarUrl(avatarForProfile);
  }, [resolvedParams.username]);


  useEffect(() => {
    setIsLoadingPosts(true);
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
        description: "The post has been removed from local storage.",
        variant: "destructive"
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

  const handleProfileAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
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

      const reader = new FileReader();
      reader.onloadend = () => {
        const newAvatarDataUrl = reader.result as string;
        setProfileAvatarUrl(newAvatarDataUrl); 

        try {
          const loggedInUserString = localStorage.getItem("loggedInUser");
          if (loggedInUserString) {
            const loggedInUser = JSON.parse(loggedInUserString);
            loggedInUser.avatar = newAvatarDataUrl;
            localStorage.setItem("loggedInUser", JSON.stringify(loggedInUser));
            toast({
              title: "Profile Picture Updated!",
              description: "Your new profile picture has been saved.",
            });
          }
        } catch (error) {
          console.error("Error saving avatar to localStorage from profile:", error);
          toast({ title: "Storage Error", description: "Could not save new avatar.", variant: "destructive" });
        }
      };
      reader.onerror = () => {
        toast({ title: "Error", description: "Could not read selected file.", variant: "destructive" });
      };
      reader.readAsDataURL(file);
    }
    if (profileAvatarInputRef.current) profileAvatarInputRef.current.value = "";
  };

  const mockUser = {
    name: profileUser?.fullName || resolvedParams.username.charAt(0).toUpperCase() + resolvedParams.username.slice(1), 
    username: resolvedParams.username,
    avatar: profileAvatarUrl || `https://placehold.co/150x150.png?u=${resolvedParams.username}`,
    bio: profileUser?.bio || "Passionate poker player, always learning and looking for the next big win. Specializing in Texas Hold'em tournaments.",
    joinedDate: "Joined January 2023",
    friendsCount: 78, 
    totalPosts: profilePosts.length, 
    coverImage: "https://placehold.co/1200x300.png?cover=1",
    coverImageAiHint: "poker table background",
  };

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
          />
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
            <div className="flex flex-col sm:flex-row items-center sm:items-end space-x-0 sm:space-x-4">
             
              <div className="relative group">
                <label htmlFor={isCurrentUserProfile ? "profile-avatar-upload" : undefined} 
                       className={isCurrentUserProfile ? "cursor-pointer" : ""}>
                  <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background -mb-12 sm:-mb-0 relative z-10">
                    <AvatarImage src={mockUser.avatar} alt={mockUser.name} data-ai-hint="profile picture" />
                    <AvatarFallback>{mockUser.name.substring(0, 2).toUpperCase() || 'P'}</AvatarFallback>
                  </Avatar>
                  {isCurrentUserProfile && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full z-20 -mb-12 sm:-mb-0">
                      <Camera className="h-8 w-8 text-white" />
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
               {isCurrentUserProfile && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4 sm:mt-0 sm:ml-auto bg-white/20 hover:bg-white/30 text-white border-white/50"
                  onClick={() => router.push('/settings')} // Navigate to settings
                >
                  <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
                </Button>
              )}
              {!isCurrentUserProfile && (
                <Button variant="default" size="sm" className="mt-4 sm:mt-0 sm:ml-auto">
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

