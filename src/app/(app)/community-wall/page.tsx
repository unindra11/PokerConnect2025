"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, Loader2 } from "lucide-react";
import { PostCard } from "@/components/post-card";
import type { Post, Comment as PostComment } from "@/types/post";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getFirestore, collection, query, orderBy, getDocs, Timestamp, where } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { useUser } from "@/context/UserContext";
import { handleLikePost } from "@/utils/handleLikePost";
import { handleCommentOnPost } from "@/utils/handleCommentOnPost";

export default function CommunityWallPage() {
  const { currentUserAuth, loggedInUserDetails, isLoadingAuth } = useUser();
  const [communityPosts, setCommunityPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

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

    if (typeof currentUserAuth !== 'undefined') {
      fetchPosts();
    }
  }, [currentUserAuth, toast]);

  const onLikePost = async (postId: string) => {
    const result = await handleLikePost({ postId, currentUser: currentUserAuth, posts: communityPosts });
    if (result.updatedPosts) {
      setCommunityPosts(result.updatedPosts);
    }
    if (result.error) {
      toast({ title: "Error Liking Post", description: result.error, variant: "destructive" });
    } else {
      const post = communityPosts.find(p => p.id === postId);
      if (post && post.likedByCurrentUser) {
        toast({ title: "Like Removed", description: "Your like has been removed." });
      } else {
        toast({ title: "Post Liked!", description: "Your like has been recorded." });
      }
    }
  };

  const onCommentPost = async (postId: string, commentText: string) => {
    const result = await handleCommentOnPost({ postId, commentText, currentUser: currentUserAuth, loggedInUserDetails, posts: communityPosts });
    if (result.updatedPosts) {
      setCommunityPosts(result.updatedPosts);
    }
    if (result.error) {
      toast({ title: "Error Posting Comment", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Comment Posted!", description: "Your comment has been added to Firestore." });
    }
  };

  if (isLoadingAuth || (isLoading && typeof currentUserAuth === 'undefined')) {
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
        <Link href="/create-post?redirect=/community-wall" passHref>
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
              <Link href="/create-post?redirect=/community-wall" passHref>
                <Button>Create a Post</Button>
              </Link>
            </CardContent>
          </Card>
        )}
        {communityPosts.map((post, index) => (
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