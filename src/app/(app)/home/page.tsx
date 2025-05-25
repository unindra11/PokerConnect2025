
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { PostCard } from "@/components/post-card"; // New import
import type { Post } from "@/types/post"; // New import

const postsData: Post[] = [
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
        {postsData.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
