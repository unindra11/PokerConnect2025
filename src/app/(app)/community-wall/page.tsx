
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, Loader2 } from "lucide-react";
import { PostCard } from "@/components/post-card";
import type { Post } from "@/types/post";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getFirestore, collection, query, orderBy, getDocs, Timestamp } from "firebase/firestore";
import { app } from "@/lib/firebase"; // Import the initialized Firebase app

// const USER_POSTS_STORAGE_KEY = "pokerConnectUserPosts"; // No longer primary source

export default function CommunityWallPage() {
  const [communityPosts, setCommunityPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        const db = getFirestore(app, "poker");
        const postsCollectionRef = collection(db, "posts");
        const q = query(postsCollectionRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        const posts: Post[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Ensure user object and its properties exist
          const postUser = data.user || { name: "Unknown User", avatar: "", handle: "@unknown" };
          
          posts.push({
            id: doc.id,
            userId: data.userId,
            user: {
              name: postUser.name || postUser.fullName || "Unknown User", // Check for fullName as well
              avatar: postUser.avatar || `https://placehold.co/100x100.png?text=${(postUser.name || postUser.fullName || "U").substring(0,1)}`,
              handle: postUser.handle || `@${postUser.username || 'unknown'}`,
            },
            content: data.content,
            image: data.image,
            imageAiHint: data.imageAiHint,
            likes: data.likes || 0,
            likedByCurrentUser: data.likedByCurrentUser || false, // This will need to be managed per user later
            comments: data.comments || 0,
            commentTexts: data.commentTexts || [],
            shares: data.shares || 0,
            createdAt: data.createdAt, // Keep as Firestore Timestamp or Date
            timestamp: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toLocaleString() : (data.createdAt || new Date()).toLocaleString(), // For display
          });
        });
        setCommunityPosts(posts);
        if (posts.length === 0) {
          toast({
            title: "No Posts Yet",
            description: "The community wall is quiet. Be the first to post!",
          });
        }
      } catch (error) {
        console.error("Error fetching posts from Firestore for Community Wall:", error);
        toast({
          title: "Error Loading Posts",
          description: "Could not retrieve community posts from Firestore. Please ensure Firestore is set up and rules allow reads.",
          variant: "destructive",
          duration: 7000,
        });
        setCommunityPosts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, [toast]);

  const handleLikePost = (postId: string) => {
    // TODO: Update this to interact with Firestore
    toast({
      title: "Like Action (Simulated)",
      description: ` Firestore like for post ${postId} coming soon!`,
    });
    // For now, we can optimistically update the UI if desired, but it won't persist to Firestore yet.
    // Or, we can disable this until Firestore write is implemented.
    // Example optimistic UI update (will revert on refresh if not saved to Firestore):
    setCommunityPosts(prevPosts =>
      prevPosts.map(p => 
        p.id === postId ? { ...p, likes: p.likes + (p.likedByCurrentUser ? -1 : 1), likedByCurrentUser: !p.likedByCurrentUser } : p
      )
    );
  };

  const handleCommentOnPost = (postId: string, commentText: string) => {
    // TODO: Update this to interact with Firestore
     toast({
      title: "Comment Action (Simulated)",
      description: `Firestore comment '${commentText}' for post ${postId} coming soon!`,
    });
    // Example optimistic UI update:
    setCommunityPosts(prevPosts =>
      prevPosts.map(p =>
        p.id === postId ? { ...p, comments: (p.comments || 0) + 1, commentTexts: [...(p.commentTexts || []), commentText] } : p
      )
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-2xl text-center py-10">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="mt-4">Loading community posts from Firestore...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Community Wall</h1>
          <p className="text-muted-foreground text-sm mt-1">
            See what everyone in the PokerConnect community is talking about! (Posts from Firestore)
          </p>
        </div>
        <Link href="/create-post" passHref>
          <Button>
            <PlusCircle className="mr-2 h-5 w-5" /> Share Your Thoughts
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        {communityPosts.length === 0 && !isLoading && (
          <Card className="text-center p-8 shadow-lg rounded-xl">
            <CardHeader>
              <CardTitle className="text-xl mb-2">The Wall is Quiet</CardTitle>
              <CardDescription className="mb-4 text-muted-foreground">
                Be the first to share something with the community!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/create-post" passHref>
                <Button>Create a Post</Button>
              </Link>
            </CardContent>
          </Card>
        )}
        {communityPosts.map((post) => (
          <PostCard 
            key={post.id} 
            post={post} 
            onLikePost={handleLikePost}
            onCommentPost={handleCommentOnPost}
          />
        ))}
      </div>
    </div>
  );
}
