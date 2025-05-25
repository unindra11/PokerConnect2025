import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { MessageCircle, Heart, Repeat, PlusCircle } from "lucide-react";
import Image from "next/image";

const communityPosts = [
  {
    id: "comm1",
    user: { name: "StrategySteve", avatar: "https://placehold.co/100x100.png?c=1", handle: "@steve_strat" },
    content: "Discussing optimal 3-betting ranges in MTTs. What are your go-to hands for re-raising pre-flop?",
    likes: 88,
    comments: 25,
    shares: 7,
    timestamp: "45m ago",
  },
  {
    id: "comm2",
    user: { name: "MentalGameMaria", avatar: "https://placehold.co/100x100.png?c=2", handle: "@mariamental" },
    content: "How do you all handle tilt? Looking for new techniques to stay calm under pressure. #PokerMindset",
    image: "https://placehold.co/600x400.png?tc=1",
    imageAiHint: "calm meditation poker",
    likes: 150,
    comments: 42,
    shares: 11,
    timestamp: "3h ago",
  },
  {
    id: "comm3",
    user: { name: "LiveGrindLarry", avatar: "https://placehold.co/100x100.png?c=3", handle: "@larrylive" },
    content: "Just back from a 12-hour session at the local casino. Some interesting hands to share later!",
    likes: 62,
    comments: 18,
    shares: 3,
    timestamp: "6h ago",
  },
];

export default function CommunityWallPage() {
  return (
    <div className="container mx-auto max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Community Wall</h1>
        <Link href="/create-post" passHref>
          <Button>
            <PlusCircle className="mr-2 h-5 w-5" /> Share Your Thoughts
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        {communityPosts.map((post) => (
          <Card key={post.id} className="overflow-hidden shadow-lg rounded-xl">
            <CardHeader className="flex flex-row items-start space-x-4 p-4">
              <Avatar>
                <AvatarImage src={post.user.avatar} alt={post.user.name} data-ai-hint="profile picture"/>
                <AvatarFallback>{post.user.name.substring(0, 1)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                 <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{post.user.name}</CardTitle>
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
