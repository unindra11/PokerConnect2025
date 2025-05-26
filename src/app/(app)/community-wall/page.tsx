
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, Loader2 } from "lucide-react";
import { PostCard } from "@/components/post-card";
import type { Post } from "@/types/post";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  addDoc,
  where,
  writeBatch,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";
import { app, auth } from "@/lib/firebase"; 
import type { User as FirebaseUser } from "firebase/auth";

export default function CommunityWallPage() {
  const [communityPosts, setCommunityPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        const db = getFirestore(app, "poker");
        const postsCollectionRef = collection(db, "posts");
        const q = query(postsCollectionRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        const posts: Post[] = [];
        for (const docSnap of querySnapshot.docs) {
          const data = docSnap.data();
          const postUser = data.user || { name: "Unknown User", avatar: `https://placehold.co/100x100.png?text=U`, handle: "@unknown" };
          
          let likedByCurrentUser = false;
          if (currentUser) {
            const likesCollectionRef = collection(db, "likes");
            const likeQuery = query(likesCollectionRef, where("postId", "==", docSnap.id), where("userId", "==", currentUser.uid));
            const likeSnapshot = await getDocs(likeQuery);
            likedByCurrentUser = !likeSnapshot.empty;
          }

          posts.push({
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
            commentTexts: data.commentTexts || [],
            shares: data.shares || 0,
            createdAt: data.createdAt, 
            timestamp: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toLocaleString() : (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000).toLocaleString() : new Date().toLocaleString()),
          });
        }
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
          description: "Could not retrieve community posts. Check Firestore setup and rules.",
          variant: "destructive",
          duration: 7000,
        });
        setCommunityPosts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, [toast, currentUser]); // Re-fetch posts if currentUser changes

  const handleLikePost = async (postId: string) => {
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to like a post.", variant: "destructive" });
      return;
    }

    const db = getFirestore(app, "poker");
    const postRef = doc(db, "posts", postId);
    const likesCollectionRef = collection(db, "likes");
    const likeQuery = query(likesCollectionRef, where("postId", "==", postId), where("userId", "==", currentUser.uid));

    // Optimistic update
    const originalPosts = communityPosts.map(p => ({...p}));
    let isCurrentlyLiked = false;
    setCommunityPosts(prevPosts =>
      prevPosts.map(p => {
        if (p.id === postId) {
          isCurrentlyLiked = !!p.likedByCurrentUser;
          return { 
            ...p, 
            likes: p.likes + (isCurrentlyLiked ? -1 : 1), 
            likedByCurrentUser: !isCurrentlyLiked 
          };
        }
        return p;
      })
    );

    try {
      const likeSnapshot = await getDocs(likeQuery);
      const batch = writeBatch(db);

      if (likeSnapshot.empty) { // User is liking the post
        const newLikeRef = doc(likesCollectionRef); // Auto-generate ID for the like document
        batch.set(newLikeRef, {
          postId: postId,
          userId: currentUser.uid,
          createdAt: serverTimestamp()
        });
        batch.update(postRef, { likes: increment(1) });
        await batch.commit();
        toast({ title: "Post Liked!", description: "Your like has been recorded." });
      } else { // User is unliking the post
        likeSnapshot.forEach(doc => {
          batch.delete(doc.ref);
        });
        batch.update(postRef, { likes: increment(-1) });
        await batch.commit();
        toast({ title: "Like Removed", description: "Your like has been removed." });
      }
    } catch (error) {
      console.error("Error updating likes in Firestore:", error);
      setCommunityPosts(originalPosts); // Revert optimistic update
      toast({
        title: "Error Liking Post",
        description: "Could not save your like to Firestore.",
        variant: "destructive",
      });
    }
  };

  const handleCommentOnPost = (postId: string, commentText: string) => {
     toast({
      title: "Comment Action (Simulated)",
      description: `Firestore comment '${commentText}' for post ${postId} coming soon! Firestore interaction for comments needs to be implemented.`,
    });
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
        {communityPosts.map((post, index) => (
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

    