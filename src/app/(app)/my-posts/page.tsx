"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle, CardContent, CardHeader } from "@/components/ui/card";
import Link from "next/link";
import { PlusCircle, Loader2 } from "lucide-react";
import { PostCard } from "@/components/post-card";
import type { Post, Comment as PostComment } from "@/types/post";
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
  addDoc,
  getDoc,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { app } from "@/lib/firebase";
import { useUser } from "@/context/UserContext";

export default function MyPostsPage() {
  const { currentUserAuth, loggedInUserDetails, isLoadingAuth } = useUser();
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
      const db = getFirestore(app, "poker");
      console.log("MyPostsPage: Fetching posts for user UID:", currentUser.uid);
      try {
        const postsCollectionRef = collection(db, "posts");
        const q = query(
          postsCollectionRef,
          where("userId", "==", currentUser.uid),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);

        const postsPromises: Promise<Post>[] = querySnapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const postUser = data.user || { name: "Unknown User", avatar: `https://placehold.co/100x100.png?text=U`, handle: "@unknown" };

          let likedByCurrentUser = false;
          if (currentUser) {
            const likesCollectionRef = collection(db, "likes");
            const likeQuery = query(likesCollectionRef, where("postId", "==", docSnap.id), where("userId", "==", currentUser.uid));
            const likeSnapshot = await getDocs(likeQuery);
            likedByCurrentUser = !likeSnapshot.empty;
          }

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
              handle: postUser.handle || `@${data.username || 'unknown'}`,
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
              : (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000).toLocaleString() : new Date().toLocaleString()),
          } as Post;
        });
        const posts = await Promise.all(postsPromises);
        setUserPosts(posts);
        console.log(`MyPostsPage: Fetched ${posts.length} posts from Firestore.`);
        if (posts.length === 0 && !isLoading) {
          toast({
            title: "No Posts Yet",
            description: "You haven't created any posts. Share your thoughts!",
          });
        }
      } catch (error: any) {
        console.error("MyPostsPage: Error fetching user posts from Firestore:", error);
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
      const batch = writeBatch(db);

      const postRef = doc(db, "posts", postId);
      batch.delete(postRef);

      const likesQuery = query(collection(db, "likes"), where("postId", "==", postId));
      const likesSnapshot = await getDocs(likesQuery);
      if (!likesSnapshot.empty) {
        likesSnapshot.forEach(likeDoc => batch.delete(likeDoc.ref));
        console.log(`MyPostsPage: Deleting ${likesSnapshot.size} likes for post ${postId}`);
      }

      const commentsRef = collection(db, "posts", postId, "comments");
      const commentsSnapshot = await getDocs(commentsRef);
      if (!commentsSnapshot.empty) {
        commentsSnapshot.forEach(commentDoc => batch.delete(commentDoc.ref));
        console.log(`MyPostsPage: Deleting ${commentsSnapshot.size} comments for post ${postId}`);
      }

      await batch.commit();
      console.log(`MyPostsPage: Successfully deleted post ${postId} and its associated likes/comments from Firestore.`);
      toast({
        title: "Post Deleted",
        description: "Your post and its associated data have been successfully removed from Firestore.",
      });
    } catch (error) {
      console.error("MyPostsPage: Error deleting post from Firestore:", error);
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
    const originalPosts = userPosts.map(p => ({...p, fetchedComments: p.fetchedComments ? [...p.fetchedComments] : [] }));

    console.log(`MyPostsPage: Liking post ${postId}. Current state:`, userPosts.find(p => p.id === postId));

    setUserPosts(prevPosts => {
      const updatedPosts = prevPosts.map(p => {
        if (p.id === postId) {
          const isCurrentlyLiked = !!p.likedByCurrentUser;
          const newLikedByCurrentUser = !isCurrentlyLiked;

          let newLikesCount = p.likes || 0;
          if (newLikedByCurrentUser) {
            newLikesCount = Math.max(0, (p.likes || 0)) + 1;
          } else {
            newLikesCount = Math.max(0, (p.likes || 0) - 1);
          }

          console.log(`MyPostsPage: Post ${postId} - Optimistic update: likes=${newLikesCount}, likedByCurrentUser=${newLikedByCurrentUser}`);
          return {
            ...p,
            likes: newLikesCount,
            likedByCurrentUser: newLikedByCurrentUser
          };
        }
        return p;
      });
      const postAfterUpdate = updatedPosts.find(p => p.id === postId);
      console.log(`MyPostsPage: Post ${postId} - After optimistic update attempt (inside map):`, postAfterUpdate);
      return updatedPosts;
    });

    try {
      const likesCollectionRef = collection(db, "likes");
      const postDocRef = doc(db, "posts", postId);
      const likeQuery = query(likesCollectionRef, where("postId", "==", postId), where("userId", "==", currentUser.uid));
      const likeSnapshot = await getDocs(likeQuery);
      const batch = writeBatch(db);

      if (likeSnapshot.empty) {
        console.log(`MyPostsPage: User ${currentUser.uid} is LIKING post ${postId}.`);
        const newLikeRef = doc(likesCollectionRef);
        batch.set(newLikeRef, { postId: postId, userId: currentUser.uid, createdAt: serverTimestamp() });
        batch.update(postDocRef, { likes: increment(1) });
        await batch.commit();
        toast({ title: "Post Liked!", description: "Your like has been recorded." });
      } else {
        console.log(`MyPostsPage: User ${currentUser.uid} is UNLIKING post ${postId}.`);
        likeSnapshot.forEach(doc => batch.delete(doc.ref));
        batch.update(postDocRef, { likes: increment(-1) });
        await batch.commit();
        toast({ title: "Like Removed", description: "Your like has been removed." });
      }
    } catch (error) {
      console.error("MyPostsPage: Error updating likes in Firestore:", error);
      setUserPosts(originalPosts);
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

    console.log(`MyPostsPage: Adding comment to post ${postId}:`, newCommentData);

    try {
      // Step 1: Fetch the post to get the owner's UID
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) {
        throw new Error("Post not found");
      }
      const postData = postSnap.data();
      const postOwnerId = postData.uid;

      // Step 2: Add the comment
      const commentDocRef = await addDoc(commentsCollectionRef, newCommentData);
      await updateDoc(postRef, { comments: increment(1) });

      // Step 3: Create a notification for the post owner (if the commenter is not the post owner)
      if (currentUser.uid !== postOwnerId) {
        const notificationRef = collection(db, "users", postOwnerId, "notifications");
        const notificationData = {
          type: "comment_post",
          senderId: currentUser.uid,
          senderUsername: loggedInUserDetails.username || "Anonymous",
          senderAvatar: loggedInUserDetails.avatar || `https://placehold.co/40x40.png?text=${(loggedInUserDetails.username || "A").substring(0,1)}`,
          postId: postId,
          commentText: commentText,
          createdAt: serverTimestamp(),
          read: false,
        };
        await addDoc(notificationRef, notificationData);
        console.log(`MyPostsPage: Created notification for user ${postOwnerId} about comment on post ${postId}`);
      }

      // Step 4: Update the UI
      const newCommentForUI: PostComment = {
        ...newCommentData,
        id: commentDocRef.id,
        createdAt: new Date(),
      };

      setUserPosts(prevPosts =>
        prevPosts.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              comments: (p.comments || 0) + 1,
              fetchedComments: [...(p.fetchedComments || []), newCommentForUI].sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              ),
            };
          }
          return p;
        })
      );

      toast({ title: "Comment Posted!", description: "Your comment has been added to Firestore." });
    } catch (error) {
      console.error("MyPostsPage: Error adding comment to Firestore:", error);
      toast({
        title: "Error Posting Comment",
        description: "Could not save your comment. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoadingAuth || (isLoading && !currentUser)) {
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
        <Link href="/create-post?redirect=/my-posts" passHref>
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
              <Link href="/create-post?redirect=/my-posts" passHref>
                <Button>Create Your First Post</Button>
              </Link>
            </CardContent>
          </Card>
        )}
        {userPosts.map((post, index) => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={currentUser?.uid}
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