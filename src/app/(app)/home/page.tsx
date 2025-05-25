
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, Lightbulb, Loader2, RefreshCcw } from "lucide-react";
import { PostCard } from "@/components/post-card";
import type { Post } from "@/types/post";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generatePokerTips, type GeneratePokerTipsInput, type GeneratePokerTipsOutput } from "@/ai/flows/generate-poker-tips";
import { useToast } from "@/hooks/use-toast";

const initialPostsData: Post[] = [
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
  const [aiTips, setAiTips] = useState<string[]>([]);
  const [isLoadingTips, setIsLoadingTips] = useState(true);
  const [tipsError, setTipsError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPokerTips = async () => {
    setIsLoadingTips(true);
    setTipsError(null);
    try {
      // Mock inputs for the AI tips generation
      const input: GeneratePokerTipsInput = {
        recentActivity: "Playing low-stakes Texas Hold'em tournaments online, focusing on tight-aggressive play.",
        skillLevel: "intermediate",
        interests: "Tournament strategy, bankroll management, reading opponents.",
      };
      const result: GeneratePokerTipsOutput = await generatePokerTips(input);
      setAiTips(result.tips);
    } catch (error) {
      console.error("Error generating poker tips:", error);
      setTipsError("Failed to load poker tips. Please try refreshing.");
      toast({
        title: "Error Loading Tips",
        description: "Could not fetch AI poker tips. You can try refreshing.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTips(false);
    }
  };

  useEffect(() => {
    fetchPokerTips();
  }, []);

  return (
    <div className="container mx-auto max-w-2xl">
      {/* AI Poker Tips Section */}
      <Card className="mb-8 shadow-lg rounded-xl">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-6 w-6 text-primary" />
              <CardTitle className="text-xl">AI Poker Insights</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={fetchPokerTips} disabled={isLoadingTips}>
              {isLoadingTips ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              <span className="ml-2 hidden sm:inline">{isLoadingTips ? "Refreshing..." : "Refresh Tips"}</span>
            </Button>
          </div>
          <CardDescription>Personalized poker advice to up your game.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTips && !tipsError && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
              <p>Loading your personalized tips...</p>
            </div>
          )}
          {tipsError && (
            <p className="text-destructive text-center py-4">{tipsError}</p>
          )}
          {!isLoadingTips && !tipsError && aiTips.length > 0 && (
            <ul className="space-y-3 list-disc list-inside text-sm">
              {aiTips.map((tip, index) => (
                <li key={index} className="text-foreground/90">{tip}</li>
              ))}
            </ul>
          )}
          {!isLoadingTips && !tipsError && aiTips.length === 0 && (
             <p className="text-muted-foreground text-center py-4">No tips available at the moment. Try refreshing!</p>
          )}
        </CardContent>
      </Card>

      {/* Home Feed Posts Section */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Home Feed</h1>
        <Link href="/create-post" passHref>
          <Button>
            <PlusCircle className="mr-2 h-5 w-5" /> Create Post
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        {initialPostsData.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
