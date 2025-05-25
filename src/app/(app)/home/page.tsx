
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { MessageCircle, Heart, Repeat, PlusCircle } from "lucide-react";
import Image from "next/image";

const posts = [
  {
    id: "1",
    user: { name: "PokerPro123", avatar: "https://placehold.co/100x100.png?a=1", handle: "@pokerpro" },
    content: "Just won a huge tournament! Feeling on top of the world. #poker #win",
    image: "https://placehold.co/600x400.png?t=1",
    imageAiHint: "poker chips celebration",
    likes: 120,
    comments: 15,
    shares: 5,
    timestamp: "2h ago",
  },
  {
    id: "2",
    user: { name: "CardSharkJane", avatar: "https://placehold.co/100x100.png?a=2", handle: "@janeplays" },
    content: "Anyone else find pocket aces tricky to play post-flop? Share your strategies! 🤔",
    likes: 75,
    comments: 32,
    shares: 2,
    timestamp: "5h ago",
  },
    {
    id: "3",
    user: { name: "RiverRatRon", avatar: "https://placehold.co/100x100.png?a=3", handle: "@ronriver" },
    content: "Bad beat story of the day... got rivered again! 😭 Still love the game though.",
    image: "https://placehold.co/600x400.png?t=2",
    imageAiHint: "sad poker player",
    likes: 40,
    comments: 22,
    shares: 1,
    timestamp: "8h ago",
  },
];

export default function HomePage() {
  return (
    <div className="container mx-auto max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Home Feed</h1>
        <Link href="/create-post" passHref>
          <Button>
            <PlusCircle className="mr-2 h-5 w-5" /> Create Post
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        {posts.map((post) => (
          <Card key={post.id} className="overflow-hidden shadow-lg rounded-xl">
            <CardHeader className="flex flex-row items-start space-x-4 p-4">
              <Avatar>
                <AvatarImage src={post.user.avatar} alt={post.user.name} data-ai-hint="profile picture" />
                <AvatarFallback>{post.user.name.substring(0, 1)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Link href={`/profile/${post.user.handle.replace('@', '')}`}>
                    <CardTitle className="text-lg hover:underline">{post.user.name}</CardTitle>
                  </Link>
                  <span className="text-sm text-muted-foreground">{post.user.handle}</span>
                </div>
                <CardDescription className="text-xs text-muted-foreground">{post.timestamp}</CardDescription>
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
