import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { MessageCircle, Heart, Repeat, PlusCircle, Edit3, Trash2 } from "lucide-react";
import Image from "next/image";

const userPosts = [
  {
    id: "mypost1",
    user: { name: "Player One", avatar: "https://placehold.co/100x100.png", handle: "@playerone" },
    content: "Had a great session last night! Practicing my bluffing game. #PokerJourney",
    image: "https://placehold.co/600x400.png?t=mp1",
    imageAiHint: "poker table chips",
    likes: 45,
    comments: 8,
    shares: 2,
    timestamp: "1d ago",
  },
  {
    id: "mypost2",
    user: { name: "Player One", avatar: "https://placehold.co/100x100.png", handle: "@playerone" },
    content: "Thinking about starting a study group for GTO strategies. Who's interested?",
    likes: 22,
    comments: 12,
    shares: 1,
    timestamp: "3d ago",
  },
];

export default function MyPostsPage() {
  return (
    <div className="container mx-auto max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Posts</h1>
        <Link href="/create-post" passHref>
          <Button>
            <PlusCircle className="mr-2 h-5 w-5" /> Create New Post
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        {userPosts.length === 0 && (
          <Card className="text-center p-8 shadow-lg rounded-xl">
            <CardTitle className="text-xl mb-2">No Posts Yet!</CardTitle>
            <CardDescription className="mb-4">Start sharing your poker journey with the community.</CardDescription>
            <Link href="/create-post" passHref>
              <Button>Create Your First Post</Button>
            </Link>
          </Card>
        )}
        {userPosts.map((post) => (
          <Card key={post.id} className="overflow-hidden shadow-lg rounded-xl">
            <CardHeader className="flex flex-row items-start space-x-4 p-4">
              <Avatar>
                <AvatarImage src={post.user.avatar} alt={post.user.name} data-ai-hint="profile picture" />
                <AvatarFallback>{post.user.name.substring(0, 1)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-lg">{post.user.name}</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">{post.timestamp}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-2">
              <p className="text-foreground mb-3">{post.content}</p>
              {post.image && (
                 <div className="rounded-lg overflow-hidden border">
                  <Image
                    src={post.image}
                    alt="Post image"
                    width={600}
                    height={400}
                    className="w-full h-auto object-cover"
                    data-ai-hint={post.imageAiHint}
                  />
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-around p-2 border-t">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                <MessageCircle className="mr-1 h-4 w-4" /> {post.comments}
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                <Heart className="mr-1 h-4 w-4" /> {post.likes}
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                <Repeat className="mr-1 h-4 w-4" /> {post.shares}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
