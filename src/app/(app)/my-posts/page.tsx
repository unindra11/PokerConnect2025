
"use client"; 

import { useState, useEffect } from "react"; 
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle, CardContent, CardHeader } from "@/components/ui/card";
import Link from "next/link";
import { PlusCircle, Loader2 } from "lucide-react";
import { PostCard } from "@/components/post-card";
import type { Post } from "@/types/post";
import { useToast } from "@/hooks/use-toast";
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc, 
  updateDoc, 
  increment, 
  deleteDoc, 
  Timestamp,
  writeBatch,
  serverTimestamp,
  addDoc // For creating like documents
} from "firebase/firestore";
import { getAuth, onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { app } from "@/lib/firebase";

export default function MyPostsPage() {
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const { toast } = useToast();
  const authInstance = getAuth(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authInstance, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
        setUserPosts([]); 
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [authInstance]);

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
        
        const postsPromises = querySnapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const postUser = data.user || { name: "Unknown User", avatar: `https://placehold.co/100x100.png?text=U`, handle: "@unknown" };
          
          let likedByCurrentUser = false;
          if (currentUser) {
            const likesCollectionRef = collection(db, "likes");
            const likeQuery = query(likesCollectionRef, where("postId", "==", docSnap.id), where("userId", "==", currentUser.uid));
            const likeSnapshot = await getDocs(likeQuery);
            likedByCurrentUser = !likeSnapshot.empty;
          }

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
            commentTexts: data.commentTexts || [],
            shares: data.shares || 0,
            createdAt: data.createdAt,
            timestamp: data.createdAt instanceof Timestamp 
              ? data.createdAt.toDate().toLocaleString() 
              : (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000).toLocaleString() : new Date().toLocaleString()),
          };
        });
        const posts = await Promise.all(postsPromises);
        setUserPosts(posts);
        if (posts.length === 0) {
            toast({
                title: "No Posts Yet",
                description: "You haven't created any posts. Share your thoughts!",
            });
        }
      } catch (error: any) {
        console.error("Error fetching user posts from Firestore:", error);
        let firestoreErrorMessage = "Could not retrieve your posts. Please ensure Firestore is correctly set up.";
         if (error.message && error.message.includes("firestore") && error.message.includes("index")) {
            firestoreErrorMessage = `Failed to fetch posts. The query requires a Firestore index. Please check the browser console for a link to create it. Details: ${error.message}`;
        }
        toast({
          title: "Error Loading Your Posts",
          description: firestoreErrorMessage,
          variant: "destructive",
          duration: 10000,
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
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to delete a post.", variant: "destructive" });
      return;
    }
    const originalPosts = [...userPosts];
    setUserPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
    
    toast({
      title: "Post Deleting...",
      description: "Removing your post from Firestore.",
    });

    try {
      const db = getFirestore(app, "poker");
      const postRef = doc(db, "posts", postId);
      await deleteDoc(postRef);

      // Optional: Delete associated likes for this post
      const likesQuery = query(collection(db, "likes"), where("postId", "==", postId));
      const likesSnapshot = await getDocs(likesQuery);
      if (!likesSnapshot.empty) {
        const batch = writeBatch(db);
        likesSnapshot.forEach(likeDoc => batch.delete(likeDoc.ref));
        await batch.commit();
      }
      
      toast({
        title: "Post Deleted",
        description: "Your post has been successfully removed from Firestore.",
      });
    } catch (error) {
      console.error("Error deleting post from Firestore:", error);
      setUserPosts(originalPosts); 
      toast({
        title: "Error Deleting Post",
        description: "Could not remove the post from Firestore. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to like a post.", variant: "destructive" });
      return;
    }

    const db = getFirestore(app, "poker");
    const originalPosts = userPosts.map(p => ({...p})); 
    
    // Optimistic UI Update
    setUserPosts(prevPosts =>
      prevPosts.map(p => {
        if (p.id === postId) {
          const isCurrentlyLiked = !!p.likedByCurrentUser;
          const newLikedByCurrentUser = !isCurrentlyLiked;
          let newLikesCount = p.likes || 0;

          if (newLikedByCurrentUser) { // LIKING
            newLikesCount = (p.likes || 0) + 1;
          } else { // UNLIKING
            newLikesCount = Math.max(0, (p.likes || 0) - 1);
          }
          return { 
            ...p, 
            likes: newLikesCount, 
            likedByCurrentUser: newLikedByCurrentUser 
          };
        }
        return p;
      })
    );

    try {
      const postRef = doc(db, "posts", postId);
      const likesCollectionRef = collection(db, "likes");
      const likeQuery = query(likesCollectionRef, where("postId", "==", postId), where("userId", "==", currentUser.uid));
      const likeSnapshot = await getDocs(likeQuery);
      const batch = writeBatch(db);

      if (likeSnapshot.empty) { // User is liking the post
        const newLikeRef = doc(likesCollectionRef); // Auto-generate ID
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
      setUserPosts(originalPosts); // Revert optimistic update on error
      toast({
        title: "Error Liking Post",
        description: "Could not save your like. Please try again.",
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
            <Card className="shadow-lg rounded-xl p-6">
              <CardHeader>
                <CardTitle>Please Log In</CardTitle>
                <CardDescription>You need to be logged in to view your posts.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/login" passHref>
                    <Button className="mt-4">Go to Login</Button>
                </Link>
              </CardContent>
            </Card>
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
        {userPosts.length === 0 && !isLoading && (
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

    