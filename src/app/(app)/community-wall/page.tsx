
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, Loader2 } from "lucide-react";
import { PostCard } from "@/components/post-card";
import type { Post, Comment as PostComment } from "@/types/post"; // Import Comment as PostComment
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
      const db = getFirestore(app, "poker");
      try {
        const postsCollectionRef = collection(db, "posts");
        const q = query(postsCollectionRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        const postsPromises: Promise<Post>[] = querySnapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const postUser = data.user || { name: "Unknown User", avatar: `https://placehold.co/100x100.png?text=U`, handle: `@unknown` };
          
          let likedByCurrentUser = false;
          if (currentUser) {
            const likesCollectionRef = collection(db, "likes");
            const likeQuery = query(likesCollectionRef, where("postId", "==", docSnap.id), where("userId", "==", currentUser.uid));
            const likeSnapshot = await getDocs(likeQuery);
            likedByCurrentUser = !likeSnapshot.empty;
          }

          // Fetch comments for this post
          const commentsCollectionRef = collection(db, "posts", docSnap.id, "comments");
          const commentsQuery = query(commentsCollectionRef, orderBy("createdAt", "asc")); // Oldest first, will reverse in PostCard
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
              handle: postUser.handle || `@${data.username || 'unknown'}`,
            },
            content: data.content,
            image: data.image,
            imageAiHint: data.imageAiHint,
            likes: data.likes || 0,
            likedByCurrentUser: likedByCurrentUser, 
            comments: data.comments || 0, // Denormalized count
            fetchedComments: fetchedComments, // Actual comment objects
            shares: data.shares || 0,
            createdAt: data.createdAt, 
            timestamp: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toLocaleString() : (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000).toLocaleString() : new Date().toLocaleString()),
          };
        });

        const posts = await Promise.all(postsPromises);
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

    if (currentUser !== undefined) { // Ensure currentUser state is resolved
        fetchPosts();
    }
  }, [currentUser, toast]);

  const handleLikePost = async (postId: string) => {
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to like a post.", variant: "destructive" });
      return;
    }

    const db = getFirestore(app, "poker");
    const originalPosts = communityPosts.map(p => ({...p, fetchedComments: p.fetchedComments ? [...p.fetchedComments] : [] })); // Deep copy comments if they exist
    let isCurrentlyLikedOptimistic = false;

    setCommunityPosts(prevPosts =>
      prevPosts.map(p => {
        if (p.id === postId) {
          isCurrentlyLikedOptimistic = !!p.likedByCurrentUser;
          const newLikedByCurrentUser = !isCurrentlyLikedOptimistic;
          let newLikesCount = p.likes || 0;

          if (newLikedByCurrentUser) { 
            newLikesCount = (p.likes || 0) + 1;
          } else { 
            newLikesCount = Math.max(0, (p.likes || 0) - 1);
          }
          return { ...p, likes: newLikesCount, likedByCurrentUser: newLikedByCurrentUser };
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

      if (likeSnapshot.empty) { // User is liking
        const newLikeRef = doc(likesCollectionRef); // Auto-generate ID
        batch.set(newLikeRef, { postId: postId, userId: currentUser.uid, createdAt: serverTimestamp() });
        batch.update(postRef, { likes: increment(1) });
        await batch.commit();
        toast({ title: "Post Liked!", description: "Your like has been recorded." });
      } else { // User is unliking
        likeSnapshot.forEach(doc => batch.delete(doc.ref));
        batch.update(postRef, { likes: increment(-1) });
        await batch.commit();
        toast({ title: "Like Removed", description: "Your like has been removed." });
      }
    } catch (error) {
      console.error("Error updating likes in Firestore:", error);
      setCommunityPosts(originalPosts); 
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
    if (!loggedInUserString) {
        toast({ title: "Profile Error", description: "Could not retrieve your profile details to comment.", variant: "destructive" });
        return;
    }
    const loggedInUserDetails = JSON.parse(loggedInUserString);


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

      // Optimistic UI update
      const newCommentForUI: PostComment = {
        ...newCommentData,
        id: commentDocRef.id,
        createdAt: new Date() // For immediate display, serverTimestamp will be accurate in DB
      };

      setCommunityPosts(prevPosts => prevPosts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            comments: (p.comments || 0) + 1,
            fetchedComments: [...(p.fetchedComments || []), newCommentForUI]
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
            See what everyone in the PokerConnect community is talking about! (Posts & Comments from Firestore)
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
