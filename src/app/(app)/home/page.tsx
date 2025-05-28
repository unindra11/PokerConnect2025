
"use client";

import type { ReactNode } from 'react';
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, Lightbulb, Loader2, RefreshCcw } from "lucide-react";
import { PostCard } from "@/components/post-card";
import type { Post, Comment as PostComment } from "@/types/post"; // Import PostComment
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generatePokerTips, type GeneratePokerTipsInput, type GeneratePokerTipsOutput } from "@/ai/flows/generate-poker-tips";
import { useToast } from "@/hooks/use-toast";
import { 
  getFirestore, 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  Timestamp, 
  doc, 
  updateDoc, 
  increment,
  where,
  writeBatch,
  serverTimestamp,
  addDoc 
} from "firebase/firestore";
import { app } from "@/lib/firebase"; 
import { getAuth, type User as FirebaseUser } from "firebase/auth";

interface LoggedInUserDetails {
  username?: string;
  avatar?: string;
  // Add other fields if needed from localStorage.loggedInUser
}

export default function HomePage() {
  const [aiTips, setAiTips] = useState<string[]>([]);
  const [isLoadingTips, setIsLoadingTips] = useState(true);
  const [tipsError, setTipsError] = useState<string | null>(null);
  const { toast } = useToast();
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, [auth]);

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
    const db = getFirestore(app, "poker");
    try {
      const postsCollectionRef = collection(db, "posts");
      const q = query(postsCollectionRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      
      const postsDataPromises: Promise<Post>[] = querySnapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const postUser = data.user || { name: "Unknown User", avatar: `https://placehold.co/100x100.png?text=U`, handle: "@unknown" };
        
        let likedByCurrentUser = false;
        if (currentUser) {
          const likesCollectionRef = collection(db, "likes");
          const likeQuery = query(likesCollectionRef, where("postId", "==", docSnap.id), where("userId", "==", currentUser.uid));
          const likeSnapshot = await getDocs(likeQuery);
          likedByCurrentUser = !likeSnapshot.empty;
        }

        // Fetch comments for this post
        const commentsCollectionRef = collection(db, "posts", docSnap.id, "comments");
        const commentsQuery = query(commentsCollectionRef, orderBy("createdAt", "asc"));
        const commentsSnapshot = await getDocs(commentsQuery);
        const fetchedComments: PostComment[] = commentsSnapshot.docs.map(commentDoc => ({
          id: commentDoc.id,
          ...(commentDoc.data() as Omit<PostComment, 'id'>)
        }));

        return {
          id: docSnap.id,
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
          likedByCurrentUser: likedByCurrentUser, 
          comments: data.comments || 0,
          fetchedComments: fetchedComments,
          shares: data.shares || 0,
          createdAt: data.createdAt, 
          timestamp: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toLocaleString() : (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000).toLocaleString() : new Date().toLocaleString()),
        };
      });
      const postsData = await Promise.all(postsDataPromises);
      setFeedPosts(postsData);
       if (postsData.length === 0 && !isLoadingPosts) { 
          toast({
            title: "No Posts Yet",
            description: "The home feed is quiet. Create a post!",
          });
        }
    } catch (error: any) {
      console.error("Error fetching posts from Firestore for Home Feed:", error);
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
    fetchPokerTips();
  }, []); 

  useEffect(() => {
    if (currentUser !== undefined) { 
        fetchFeedPosts();
    }
  }, [currentUser]); 


  const handleLikePost = async (postId: string) => {
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to like a post.", variant: "destructive" });
      return;
    }
    const db = getFirestore(app, "poker");
    const originalPosts = feedPosts.map(p => ({...p, fetchedComments: p.fetchedComments ? [...p.fetchedComments] : [] }));
    
    console.log(`Liking post ${postId}. Current state:`, feedPosts.find(p => p.id === postId));

    setFeedPosts(prevPosts => {
      const updatedPosts = prevPosts.map(p => {
        if (p.id === postId) {
          const isCurrentlyLiked = !!p.likedByCurrentUser;
          const newLikedByCurrentUser = !isCurrentlyLiked;
          
          console.log(`Post ${postId} - Before optimistic update: p.likes = ${p.likes}, p.likedByCurrentUser = ${p.likedByCurrentUser}`);
          
          let newLikesCount = p.likes || 0;
          if (newLikedByCurrentUser) { 
            newLikesCount = Math.max(0, (p.likes || 0)) + 1;
          } else { 
            newLikesCount = Math.max(0, (p.likes || 0) - 1);
          }
          
          console.log(`Post ${postId} - Calculated for optimistic update: newLikesCount = ${newLikesCount}, newLikedByCurrentUser = ${newLikedByCurrentUser}`);
          
          return { 
            ...p, 
            likes: newLikesCount, 
            likedByCurrentUser: newLikedByCurrentUser 
          };
        }
        return p;
      });
      const postAfterUpdate = updatedPosts.find(p => p.id === postId);
      console.log(`Post ${postId} - After optimistic update attempt (inside map):`, postAfterUpdate);
      return updatedPosts;
    });

    try {
      const likesCollectionRef = collection(db, "likes");
      const postDocRef = doc(db, "posts", postId);
      const likeQuery = query(likesCollectionRef, where("postId", "==", postId), where("userId", "==", currentUser.uid));
      const likeSnapshot = await getDocs(likeQuery);
      const batch = writeBatch(db);

      if (likeSnapshot.empty) { 
        const newLikeRef = doc(likesCollectionRef); 
        batch.set(newLikeRef, { postId: postId, userId: currentUser.uid, createdAt: serverTimestamp() });
        batch.update(postDocRef, { likes: increment(1) });
        await batch.commit();
        toast({ title: "Post Liked!", description: "Your like has been recorded." });
      } else { 
        likeSnapshot.forEach(doc => batch.delete(doc.ref));
        batch.update(postDocRef, { likes: increment(-1) });
        await batch.commit();
        toast({ title: "Like Removed", description: "Your like has been removed." });
      }
    } catch (error) {
      console.error("Error updating likes in Firestore:", error);
      setFeedPosts(originalPosts); 
      toast({
        title: "Error Liking Post",
        description: "Could not save your like to Firestore.",
        variant: "destructive",
      });
    }
  };

  const handleCommentOnPost = async (postId: string, commentText: string) => {
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to comment.", variant: "destructive" });
      return;
    }
    const loggedInUserString = localStorage.getItem("loggedInUser");
    let loggedInUserDetails: LoggedInUserDetails | null = null;
    if (loggedInUserString) {
      try {
        loggedInUserDetails = JSON.parse(loggedInUserString);
      } catch (e) {
        console.error("Error parsing loggedInUser from localStorage for comment:", e);
      }
    }
    if (!loggedInUserDetails) {
        toast({ title: "Profile Error", description: "Could not retrieve your profile details to comment.", variant: "destructive" });
        return;
    }

    const db = getFirestore(app, "poker");
    const postRef = doc(db, "posts", postId);
    const commentsCollectionRef = collection(db, "posts", postId, "comments");

    const newCommentData: Omit<PostComment, 'id'> = {
      userId: currentUser.uid,
      username: loggedInUserDetails.username || "Anonymous",
      avatar: loggedInUserDetails.avatar || `https://placehold.co/40x40.png?text=${(loggedInUserDetails.username || "A").substring(0,1)}`,
      text: commentText,
      createdAt: serverTimestamp(),
    };

    try {
      const commentDocRef = await addDoc(commentsCollectionRef, newCommentData);
      await updateDoc(postRef, { comments: increment(1) });

      const newCommentForUI: PostComment = {
        ...newCommentData,
        id: commentDocRef.id,
        createdAt: new Date() 
      };

      setFeedPosts(prevPosts => prevPosts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            comments: (p.comments || 0) + 1,
            fetchedComments: [...(p.fetchedComments || []), newCommentForUI].sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          };
        }
        return p;
      }));

      toast({ title: "Comment Posted!", description: "Your comment has been added." });
    } catch (error) {
      console.error("Error adding comment to Firestore:", error);
      toast({
        title: "Error Posting Comment",
        description: "Could not save your comment. Please try again.",
        variant: "destructive",
      });
    }
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
            currentUserId={currentUser?.uid}
            onLikePost={handleLikePost}
            onCommentPost={handleCommentOnPost}
            isLCPItem={index === 0}
          />
        ))}
      </div>
    </div>
  );
}
