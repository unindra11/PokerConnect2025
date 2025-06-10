'use client';

import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, Lightbulb, Loader2, RefreshCcw } from "lucide-react";
import { PostCard } from "@/components/post-card";
import type { Post, Comment as PostComment } from "@/types/post";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generatePokerTips, type GeneratePokerTipsInput, type GeneratePokerTipsOutput } from "@/ai/flows/generate-poker-tips";
import { useToast } from "@/hooks/use-toast";
import { getFirestore, collection, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { useUser } from "@/context/UserContext";
import { handleLikePost } from "@/utils/handleLikePost";
import { handleCommentOnPost } from "@/utils/handleCommentOnPost";

interface UserDetails {
  username?: string;
  avatar?: string;
}

export default function HomePage() {
  const { currentUserAuth, loggedInUserDetails, isLoadingAuth, isLoadingUserDetails } = useUser();
  const [aiTips, setAiTips] = useState<string[]>([]);
  const [isLoadingTips, setIsLoadingTips] = useState(true);
  const [tipsError, setTipsError] = useState<string | null>(null);
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const { toast } = useToast();

  console.log('HomePage: Component mounted');

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
      console.log('HomePage: Successfully fetched poker tips:', result.tips);
    } catch (error) {
      console.error("HomePage: Error generating poker tips:", error);
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
    if (!currentUserAuth) {
      console.log('HomePage: Cannot fetch posts, no authenticated user');
      setIsLoadingPosts(false);
      return;
    }

    setIsLoadingPosts(true);
    const db = getFirestore(app, "poker");
    try {
      const postsCollectionRef = collection(db, "posts");
      const q = query(postsCollectionRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      console.log('HomePage: Fetched posts from Firestore, count:', querySnapshot.size);

      const postsDataPromises: Promise<Post>[] = querySnapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const postUser = data.user || { name: "Unknown User", avatar: `https://placehold.co/100x100.png?text=U`, handle: "@unknown" };

        let likedByCurrentUser = false;
        if (currentUserAuth) {
          const likesCollectionRef = collection(db, "likes");
          const likeQuery = query(likesCollectionRef, where("postId", "==", docSnap.id), where("userId", "==", currentUserAuth.uid));
          const likeSnapshot = await getDocs(likeQuery);
          likedByCurrentUser = !likeSnapshot.empty;
        }

        const commentsCollectionRef = collection(db, "posts", docSnap.id, "comments");
        const commentsQuery = query(commentsCollectionRef, orderBy("createdAt", "asc"));
        const commentsSnapshot = await getDocs(commentsQuery);
        const fetchedComments: PostComment[] = commentsSnapshot.docs.map(commentDoc => ({
          id: commentDoc.id,
          ...(commentDoc.data() as Omit<PostComment, 'id'>),
        }));

        return {
          id: docSnap.id,
          userId: data.userId,
          user: {
            name: postUser.name || "Unknown User",
            avatar: postUser.avatar || `https://placehold.co/100x100.png?text=${(postUser.name || "U").substring(0, 1)}`,
            handle: postUser.handle || `@${postUser.username || 'unknown'}`,
          },
          content: data.content,
          image: data.image,
          imageAiHint: data.imageAiHint,
          likes: data.likes || 0,
          likedByCurrentUser: likedByCurrentUser,
          comments: data.comments || 0,
          fetchedComments: fetchedComments,
          shares: data.shares || 0,
          createdAt: data.createdAt,
          timestamp: data.createdAt instanceof Timestamp
            ? data.createdAt.toDate().toLocaleString()
            : (data.createdAt?.seconds
              ? new Date(data.createdAt.seconds * 1000).toLocaleString()
              : new Date().toLocaleString()),
        };
      });

      const postsData = await Promise.all(postsDataPromises);
      setFeedPosts(postsData);
      console.log('HomePage: Processed and set feed posts:', postsData.length);

      if (postsData.length === 0) {
        toast({
          title: "No Posts Yet",
          description: "The home feed is quiet. Create a post!",
        });
      }
    } catch (error: any) {
      console.error("HomePage: Error fetching posts from Firestore for Home Feed:", error);
      let firestoreErrorMessage = "Could not retrieve posts from Firestore. Please ensure Firestore is set up and rules allow reads.";
      if (error.message && (error.message.includes("firestore") || error.message.includes("Firestore") || error.message.includes("RPC") || (typeof error.code === 'string' && error.code.startsWith("permission-denied")) || error.code === 'unavailable' || error.code === 'unimplemented' || error.code === 'internal')) {
        firestoreErrorMessage = `Failed to fetch posts. Ensure Firestore is correctly set up (DB 'poker' exists, API enabled, and security rules published for 'posts' collection). Details: ${error.message}`;
      }
      toast({
        title: "Error Loading Feed Posts",
        description: firestoreErrorMessage,
        variant: "destructive",
        duration: 10000,
      });
      setFeedPosts([]);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  useEffect(() => {
    console.log('HomePage: Fetching poker tips on mount');
    fetchPokerTips();
  }, []);

  useEffect(() => {
    console.log('HomePage: useEffect for fetching posts triggered, currentUserAuth:', !!currentUserAuth);
    if (currentUserAuth !== undefined) {
      fetchFeedPosts();
    }
  }, [currentUserAuth]);

  const onLikePost = async (postId: string) => {
    if (!currentUserAuth) {
      console.log('HomePage: Cannot like post, no authenticated user');
      toast({
        title: "Authentication Required",
        description: "Please log in to like posts.",
        variant: "destructive",
      });
      return;
    }
    try {
      const result = await handleLikePost({ postId, currentUser: currentUserAuth, posts: feedPosts, loggedInUserDetails });
      if (result.updatedPosts) {
        setFeedPosts(result.updatedPosts);
      } else {
        toast({
          title: "Error",
          description: "Could not like the post. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("HomePage: Error liking post:", error);
      toast({
        title: "Error",
        description: "Could not like the post. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onCommentPost = async (postId: string, commentText: string) => {
    if (!currentUserAuth) {
      console.log('HomePage: Cannot comment on post, no authenticated user');
      toast({
        title: "Authentication Required",
        description: "Please log in to comment on posts.",
        variant: "destructive",
      });
      return;
    }
    try {
      const result = await handleCommentOnPost({ postId, commentText, currentUser: currentUserAuth, posts: feedPosts, loggedInUserDetails });
      if (result.updatedPosts) {
        setFeedPosts(result.updatedPosts);
      } else {
        toast({
          title: "Error",
          description: "Could not add your comment. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("HomePage: Error commenting on post:", error);
      toast({
        title: "Error",
        description: "Could not add your comment. Please try again.",
        variant: "destructive",
      });
    }
  };

  console.log('HomePage: Rendering component, isLoadingAuth:', isLoadingAuth, 'isLoadingUserDetails:', isLoadingUserDetails);

  if (isLoadingAuth || isLoadingUserDetails) {
    console.log('HomePage: Rendering loading state');
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  // Rely on UserContext for redirect, no need to check currentUserAuth here
  console.log('HomePage: Rendering main content for user:', loggedInUserDetails?.username);

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
        <Link href="/create-post">
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
              <Link href="/create-post">
                <Button>Create a Post</Button>
              </Link>
            </CardContent>
          </Card>
        )}
        {feedPosts.map((post, index) => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={currentUserAuth?.uid}
            onLikePost={onLikePost}
            onCommentPost={onCommentPost}
            isLCPItem={index === 0}
          />
        ))}
      </div>
    </div>
  );
}