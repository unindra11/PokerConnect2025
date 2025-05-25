
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { PostCard } from "@/components/post-card";
import type { Post } from "@/types/post";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const USER_POSTS_STORAGE_KEY = "pokerConnectUserPosts";

export default function CommunityWallPage() {
  const [communityPosts, setCommunityPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    try {
      const storedPostsString = localStorage.getItem(USER_POSTS_STORAGE_KEY);
      if (storedPostsString) {
        const allPosts: Post[] = JSON.parse(storedPostsString);
        setCommunityPosts(allPosts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      } else {
        setCommunityPosts([]); 
      }
    } catch (error) {
      console.error("Error loading posts from localStorage for Community Wall:", error);
      toast({
        title: "Error Loading Posts",
        description: "Could not retrieve community posts from local storage.",
        variant: "destructive",
      });
      setCommunityPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleLikePost = (postId: string) => {
    let postContentForToast = "";
    setCommunityPosts(prevPosts =>
      prevPosts.map(p => {
        if (p.id === postId) {
          postContentForToast = p.content.substring(0, 20) + "...";
          const alreadyLiked = !!p.likedByCurrentUser;
          return { 
            ...p, 
            likes: p.likes + (alreadyLiked ? -1 : 1), 
            likedByCurrentUser: !alreadyLiked 
          };
        }
        return p;
      })
    );
    try {
      const allStoredPostsString = localStorage.getItem(USER_POSTS_STORAGE_KEY);
      if (allStoredPostsString) {
        let allStoredPosts: Post[] = JSON.parse(allStoredPostsString);
        allStoredPosts = allStoredPosts.map(p => {
          if (p.id === postId) {
            const alreadyLiked = !!p.likedByCurrentUser;
            return { 
              ...p, 
              likes: p.likes + (alreadyLiked ? -1 : 1), 
              likedByCurrentUser: !alreadyLiked 
            };
          }
          return p;
        });
        localStorage.setItem(USER_POSTS_STORAGE_KEY, JSON.stringify(allStoredPosts));
        toast({
          title: communityPosts.find(p=>p.id === postId)?.likedByCurrentUser ? "Post Liked!" : "Like Removed",
          description: `You reacted to "${postContentForToast}".`,
        });
      }
    } catch (error) {
      console.error("Error updating likes in localStorage:", error);
      toast({
        title: "Error Liking Post",
        description: "Could not save your like.",
        variant: "destructive",
      });
    }
  };

  const handleCommentOnPost = (postId: string, commentText: string) => {
    setCommunityPosts(prevPosts =>
      prevPosts.map(p =>
        p.id === postId ? { 
          ...p, 
          comments: (p.comments || 0) + 1,
          commentTexts: [...(p.commentTexts || []), commentText] 
        } : p
      )
    );
    try {
      const allStoredPostsString = localStorage.getItem(USER_POSTS_STORAGE_KEY);
      if (allStoredPostsString) {
        let allStoredPosts: Post[] = JSON.parse(allStoredPostsString);
        allStoredPosts = allStoredPosts.map(p =>
          p.id === postId ? { 
            ...p, 
            comments: (p.comments || 0) + 1,
            commentTexts: [...(p.commentTexts || []), commentText] 
          } : p
        );
        localStorage.setItem(USER_POSTS_STORAGE_KEY, JSON.stringify(allStoredPosts));
        toast({
            title: "Comment Added",
            description: "Your comment has been saved.",
        });
      }
    } catch (error) {
      console.error("Error saving comment to localStorage:", error);
      toast({
        title: "Error Commenting",
        description: "Could not save your comment.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-2xl text-center py-10">
        <p>Loading community posts...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Community Wall</h1>
          <p className="text-muted-foreground text-sm mt-1">
            See what everyone in the PokerConnect community is talking about!
          </p>
        </div>
        <Link href="/create-post" passHref>
          <Button>
            <PlusCircle className="mr-2 h-5 w-5" /> Share Your Thoughts
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        {communityPosts.length === 0 && (
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
