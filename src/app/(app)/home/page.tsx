
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
import { getFirestore, collection, query, orderBy, getDocs, Timestamp, doc, updateDoc, increment } from "firebase/firestore";
import { app } from "@/lib/firebase"; 

export default function HomePage() {
  const [aiTips, setAiTips] = useState<string[]>([]);
  const [isLoadingTips, setIsLoadingTips] = useState(true);
  const [tipsError, setTipsError] = useState<string | null>(null);
  const { toast } = useToast();
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);

  const fetchPokerTips = async () => {
    setIsLoadingTips(true);
    setTipsError(null);
    try {
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

  const fetchFeedPosts = async () => {
    setIsLoadingPosts(true);
    try {
      const db = getFirestore(app, "poker");
      const postsCollectionRef = collection(db, "posts");
      const q = query(postsCollectionRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      
      const postsData: Post[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const postUser = data.user || { name: "Unknown User", avatar: `https://placehold.co/100x100.png?text=U`, handle: "@unknown" };
        postsData.push({
          id: doc.id,
          userId: data.userId,
          user: {
            name: postUser.name || "Unknown User",
            avatar: postUser.avatar || `https://placehold.co/100x100.png?text=${(postUser.name || "U").substring(0,1)}`,
            handle: postUser.handle || `@${postUser.username || 'unknown'}`,
          },
          content: data.content,
          image: data.image,
          imageAiHint: data.imageAiHint,
          likes: data.likes || 0,
          likedByCurrentUser: data.likedByCurrentUser || false, 
          comments: data.comments || 0,
          commentTexts: data.commentTexts || [],
          shares: data.shares || 0,
          createdAt: data.createdAt, 
          timestamp: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toLocaleString() : (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000).toLocaleString() : new Date().toLocaleString()),
        });
      });
      setFeedPosts(postsData);
       if (postsData.length === 0) {
          toast({
            title: "No Posts Yet",
            description: "The home feed is quiet. Create a post!",
          });
        }
    } catch (error) {
      console.error("Error fetching posts from Firestore for Home Feed:", error);
      toast({
        title: "Error Loading Feed Posts",
        description: "Could not retrieve posts from Firestore. Please ensure Firestore is set up and rules allow reads.",
        variant: "destructive",
        duration: 7000,
      });
      setFeedPosts([]);
    } finally {
      setIsLoadingPosts(false);
    }
  };


  useEffect(() => {
    fetchPokerTips();
    fetchFeedPosts();
  }, []);

  const handleLikePost = async (postId: string) => {
    let postContentForToast = "";
    let newLikedByCurrentUser = false;

    setFeedPosts(prevPosts =>
      prevPosts.map(p => {
        if (p.id === postId) {
          postContentForToast = p.content.substring(0, 20) + "...";
          newLikedByCurrentUser = !p.likedByCurrentUser;
          return { 
            ...p, 
            likes: p.likes + (newLikedByCurrentUser ? 1 : -1), 
            likedByCurrentUser: newLikedByCurrentUser 
          };
        }
        return p;
      })
    );

    try {
      const db = getFirestore(app, "poker");
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, {
        likes: increment(newLikedByCurrentUser ? 1 : -1)
      });
      toast({
        title: newLikedByCurrentUser ? "Post Liked!" : "Like Removed",
        description: `You reacted to "${postContentForToast}". (Firestore updated)`,
      });
    } catch (error) {
      console.error("Error updating likes in Firestore:", error);
      toast({
        title: "Error Liking Post",
        description: "Could not save your like to Firestore.",
        variant: "destructive",
      });
      setFeedPosts(prevPosts =>
        prevPosts.map(p => {
          if (p.id === postId) {
            return { 
              ...p, 
              likes: p.likes + (newLikedByCurrentUser ? -1 : 1), 
              likedByCurrentUser: !newLikedByCurrentUser 
            };
          }
          return p;
        })
      );
    }
  };

  const handleCommentOnPost = (postId: string, commentText: string) => {
     toast({
      title: "Comment Action (Simulated)",
      description: `Firestore comment '${commentText}' for post ${postId} on home feed coming soon!`,
    });
  };


  return (
    <div className="container mx-auto max-w-2xl">
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

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Home Feed</h1>
        <Link href="/create-post" passHref>
          <Button>
            <PlusCircle className="mr-2 h-5 w-5" /> Create Post
          </Button>
        </Link>
      </div>
        
      {isLoadingPosts && (
        <div className="text-center py-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4">Loading feed posts from Firestore...</p>
        </div>
      )}

      <div className="space-y-6">
        {!isLoadingPosts && feedPosts.length === 0 && (
          <Card className="text-center p-8 shadow-lg rounded-xl">
            <CardHeader>
              <CardTitle className="text-xl mb-2">Feed is Empty</CardTitle>
              <CardDescription className="mb-4 text-muted-foreground">
                No posts to show yet. Be the first to share something or check back later!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/create-post" passHref>
                <Button>Create a Post</Button>
              </Link>
            </CardContent>
          </Card>
        )}
        {feedPosts.map((post, index) => (
          <PostCard 
            key={post.id} 
            post={post} 
            onLikePost={handleLikePost}
            onCommentPost={handleCommentOnPost}
            isLCPItem={index === 0}
          />
        ))}
      </div>
    </div>
  );
}
