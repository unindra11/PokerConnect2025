
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCog, ShieldCheck, BarChart3, Edit3, UserPlus } from "lucide-react"; // Added UserPlus
import Image from "next/image";
import Link from "next/link";

// Mock data for posts, can be fetched or managed via state later
const userProfilePosts = [
  {
    id: "profilepost1",
    content: "Excited to share my latest hand analysis from the tournament last weekend!",
    image: "https://placehold.co/600x300.png?p=1",
    imageAiHint: "poker hand analysis",
    likes: 78,
    comments: 12,
    timestamp: "2d ago",
  },
  {
    id: "profilepost2",
    content: "Working on my GTO ranges. It's a grind but worth it. #PokerStudy",
    likes: 55,
    comments: 9,
    timestamp: "5d ago",
  },
];


export default function UserProfilePage({ params }: { params: { username: string } }) {
  // In a real app, you'd fetch user data based on params.username
  const mockUser = {
    name: params.username.charAt(0).toUpperCase() + params.username.slice(1), // Capitalize username
    username: params.username,
    avatar: `https://placehold.co/150x150.png?u=${params.username}`,
    bio: "Passionate poker player, always learning and looking for the next big win. Specializing in Texas Hold'em tournaments.",
    joinedDate: "Joined January 2023",
    followers: 256,
    following: 180,
    totalPosts: userProfilePosts.length,
    coverImage: "https://placehold.co/1200x300.png?cover=1",
    coverImageAiHint: "poker table background",
  };

  // Determine if this is the "logged-in" user's profile for edit button
  // This is a mock, replace with actual auth logic
  const isCurrentUserProfile = params.username === "playerone"; // Assuming "playerone" is the logged in user's username

  return (
    <div className="container mx-auto max-w-4xl">
      <Card className="shadow-xl rounded-xl overflow-hidden">
        <div className="relative h-48 md:h-64">
          <Image 
            src={mockUser.coverImage} 
            alt={`${mockUser.name}'s cover photo`} 
            layout="fill" 
            objectFit="cover"
            data-ai-hint={mockUser.coverImageAiHint}
            priority
          />
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
            <div className="flex flex-col sm:flex-row items-center sm:items-end space-x-0 sm:space-x-4">
              <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background -mb-12 sm:-mb-0 relative z-10">
                <AvatarImage src={mockUser.avatar} alt={mockUser.name} data-ai-hint="profile picture" />
                <AvatarFallback>{mockUser.name.substring(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left pt-12 sm:pt-0 sm:pb-2">
                <h1 className="text-3xl font-bold text-white">{mockUser.name}</h1>
                <p className="text-sm text-gray-300">@{mockUser.username}</p>
              </div>
               {isCurrentUserProfile && (
                <Button variant="outline" size="sm" className="mt-4 sm:mt-0 sm:ml-auto bg-white/20 hover:bg-white/30 text-white border-white/50">
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
          <div className="grid grid-cols-3 gap-4 text-center my-4 border-b pb-4">
            <div>
              <p className="font-semibold text-lg">{mockUser.totalPosts}</p>
              <p className="text-sm text-muted-foreground">Posts</p>
            </div>
            <div>
              <p className="font-semibold text-lg">{mockUser.followers}</p>
              <p className="text-sm text-muted-foreground">Followers</p>
            </div>
            <div>
              <p className="font-semibold text-lg">{mockUser.following}</p>
              <p className="text-sm text-muted-foreground">Following</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold mb-1">Bio</h3>
            <p className="text-sm text-muted-foreground">{mockUser.bio}</p>
            <p className="text-xs text-muted-foreground mt-2">{mockUser.joinedDate}</p>
          </div>

          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
              <TabsTrigger value="connections">Connections</TabsTrigger>
            </TabsList>
            <TabsContent value="posts" className="mt-6 space-y-6">
              {userProfilePosts.map(post => (
                <Card key={post.id} className="overflow-hidden shadow-md rounded-lg">
                  <CardContent className="p-4">
                    <p className="text-foreground mb-3">{post.content}</p>
                    {post.image && (
                      <div className="rounded-md overflow-hidden border mb-3">
                        <Image
                          src={post.image}
                          alt="Post image"
                          width={600}
                          height={300}
                          className="w-full h-auto object-cover"
                          data-ai-hint={post.imageAiHint || "user content"}
                        />
                      </div>
                    )}
                     <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>{post.timestamp}</span>
                        <div className="flex gap-4">
                            <span>{post.likes} Likes</span>
                            <span>{post.comments} Comments</span>
                        </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {userProfilePosts.length === 0 && (
                <p className="text-center text-muted-foreground py-8">This user hasn't posted anything yet.</p>
              )}
            </TabsContent>
            <TabsContent value="stats" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><BarChart3 /> Poker Statistics</CardTitle>
                  <CardDescription>An overview of {mockUser.name}'s poker performance and achievements.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>Win Rate: 60%</li>
                    <li>Preferred Game: Texas Hold'em</li>
                    <li>Biggest Win: $5,000</li>
                    <li>Tournaments Played: 50+</li>
                  </ul>
                   <p className="text-xs text-center mt-4 text-muted-foreground">More detailed stats coming soon!</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="connections" className="mt-6">
               <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><UserCog /> Connections & Trust Score</CardTitle>
                  <CardDescription>{mockUser.name}'s network and community standing.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center gap-2 text-lg font-semibold mb-4">
                        <ShieldCheck className="h-6 w-6 text-green-500" />
                        <span>Trust Score: 85/100</span>
                    </div>
                    <p className="text-sm text-muted-foreground">This user is a verified member of the community. They actively engage and contribute positively.</p>
                    <div className="mt-4">
                        <h4 className="font-semibold mb-2">Notable Connections:</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground">
                            <li>Connected with 10+ Pro Players</li>
                            <li>Member of 'High Stakes Strategy' group</li>
                        </ul>
                    </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
