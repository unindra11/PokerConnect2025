
"use client"; 

import { useState, useEffect } from "react"; 
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle, CardContent, CardHeader } from "@/components/ui/card";
import Link from "next/link";
import { PlusCircle, Loader2 } from "lucide-react";
import { PostCard } from "@/components/post-card";
import type { Post } from "@/types/post";
import { useToast } from "@/hooks/use-toast";
import { getFirestore, collection, query, where, orderBy, getDocs, doc, updateDoc, increment, deleteDoc, Timestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { app } from "@/lib/firebase";

export default function MyPostsPage() {
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const { toast } = useToast();
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
        setUserPosts([]); // Clear posts if user logs out
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!currentUser) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const db = getFirestore(app, "poker");
        const postsCollectionRef = collection(db, "posts");
        const q = query(
          postsCollectionRef,
          where("userId", "==", currentUser.uid),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        
        const posts: Post[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const postUser = data.user || { name: "Unknown User", avatar: `https://placehold.co/100x100.png?text=U`, handle: "@unknown" };
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
            // likedByCurrentUser needs to be managed, potentially in a separate user-specific collection or fetched.
            // For now, we'll keep it as a transient client-side state after fetching.
            likedByCurrentUser: false, 
            comments: data.comments || 0,
            commentTexts: data.commentTexts || [],
            shares: data.shares || 0,
            createdAt: data.createdAt,
            timestamp: data.createdAt instanceof Timestamp 
              ? data.createdAt.toDate().toLocaleString() 
              : (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000).toLocaleString() : new Date().toLocaleString()),
          });
        });
        setUserPosts(posts);
      } catch (error) {
        console.error("Error fetching user posts from Firestore:", error);
        toast({
          title: "Error Loading Your Posts",
          description: "Could not retrieve your posts from Firestore.",
          variant: "destructive",
        });
        setUserPosts([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser) {
      fetchUserPosts();
    }
  }, [currentUser, toast]);

  const handleDeletePost = async (postId: string) => {
    const originalPosts = [...userPosts];
    setUserPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
    toast({
      title: "Post Deleting...",
      description: "Removing your post.",
    });

    try {
      const db = getFirestore(app, "poker");
      const postRef = doc(db, "posts", postId);
      await deleteDoc(postRef);
      toast({
        title: "Post Deleted",
        description: "Your post has been successfully removed from Firestore.",
      });
    } catch (error) {
      console.error("Error deleting post from Firestore:", error);
      setUserPosts(originalPosts); // Revert optimistic update
      toast({
        title: "Error Deleting Post",
        description: "Could not remove the post from Firestore. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLikePost = async (postId: string) => {
    let postContentForToast = "";
    let newLikedByCurrentUserOptimistic = false;
    const originalPosts = userPosts.map(p => ({...p})); // Deep copy for potential revert

    setUserPosts(prevPosts =>
      prevPosts.map(p => {
        if (p.id === postId) {
          postContentForToast = p.content.substring(0, 20) + "...";
          newLikedByCurrentUserOptimistic = !p.likedByCurrentUser;
          
          let newLikesCount = p.likes;
          if (newLikedByCurrentUserOptimistic) {
            newLikesCount = p.likes + 1;
          } else {
            newLikesCount = p.likes > 0 ? p.likes - 1 : 0;
          }
          const finalLikedByCurrentUser = newLikesCount === 0 ? false : newLikedByCurrentUserOptimistic;
          return { 
            ...p, 
            likes: newLikesCount, 
            likedByCurrentUser: finalLikedByCurrentUser
          };
        }
        return p;
      })
    );

    try {
      const db = getFirestore(app, "poker");
      const postRef = doc(db, "posts", postId);
      const incrementValue = newLikedByCurrentUserOptimistic ? 1 : -1;
      
      await updateDoc(postRef, {
        likes: increment(incrementValue)
      });

      toast({
        title: newLikedByCurrentUserOptimistic ? "Post Liked!" : "Like Removed",
        description: `You reacted to "${postContentForToast}". (Firestore updated)`,
      });
    } catch (error) {
      console.error("Error updating likes in Firestore:", error);
      setUserPosts(originalPosts); // Revert optimistic update
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
      description: `Firestore comment '${commentText}' for post ${postId} on 'My Posts' page coming soon! Firestore interaction for comments needs to be implemented.`,
    });
  };

  if (isLoading && !currentUser) {
    return (
        <div className="container mx-auto max-w-2xl text-center py-10">
            <p>Authenticating...</p>
        </div>
    );
  }
  
  if (isLoading) {
    return (
        <div className="container mx-auto max-w-2xl text-center py-10">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="mt-4">Loading your posts from Firestore...</p>
        </div>
    );
  }

  if (!currentUser) {
    return (
        <div className="container mx-auto max-w-2xl text-center py-10">
            <p>Please log in to see your posts.</p>
             <Link href="/login" passHref>
                <Button className="mt-4">Go to Login</Button>
            </Link>
        </div>
    );
  }

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
        {userPosts.length === 0 && (
          <Card className="text-center p-8 shadow-lg rounded-xl">
            <CardHeader>
              <CardTitle className="text-xl mb-2">No Posts Yet!</CardTitle>
              <CardDescription className="mb-4">Start sharing your poker journey with the community.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/create-post" passHref>
                <Button>Create Your First Post</Button>
              </Link>
            </CardContent>
          </Card>
        )}
        {userPosts.map((post, index) => (
          <PostCard 
            key={post.id} 
            post={post} 
            showManagementControls={true} 
            onDeletePost={handleDeletePost}
            onLikePost={handleLikePost}
            onCommentPost={handleCommentOnPost}
            isLCPItem={index === 0}
          />
        ))}
      </div>
    </div>
  );
}
