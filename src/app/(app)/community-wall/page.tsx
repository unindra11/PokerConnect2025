
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { PostCard } from "@/components/post-card"; // New import
import type { Post } from "@/types/post"; // New import
import { Card, CardContent, CardTitle } from "@/components/ui/card"; // Keep for empty state


const communityPostsData: Post[] = [
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
        {communityPostsData.length === 0 && (
            <Card className="text-center p-8 shadow-lg rounded-xl">
                <CardTitle className="text-xl mb-2">The Wall is Quiet</CardTitle>
                <CardContent>
                    <p className="mb-4 text-muted-foreground">Be the first to share something with the community!</p>
                     <Link href="/create-post" passHref>
                        <Button>Create Post</Button>
                    </Link>
                </CardContent>
            </Card>
        )}
        {communityPostsData.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
