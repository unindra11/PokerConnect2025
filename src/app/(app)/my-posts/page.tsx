
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card"; // CardDescription used for empty state
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { PostCard } from "@/components/post-card"; // New import
import type { Post } from "@/types/post"; // New import

const userPostsData: Post[] = [
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
        {userPostsData.length === 0 && (
          <Card className="text-center p-8 shadow-lg rounded-xl">
            <CardTitle className="text-xl mb-2">No Posts Yet!</CardTitle>
            <CardDescription className="mb-4">Start sharing your poker journey with the community.</CardDescription>
            <Link href="/create-post" passHref>
              <Button>Create Your First Post</Button>
            </Link>
          </Card>
        )}
        {userPostsData.map((post) => (
          <PostCard key={post.id} post={post} showManagementControls={true} />
        ))}
      </div>
    </div>
  );
}
