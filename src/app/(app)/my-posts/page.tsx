
"use client"; 

import { useState, useEffect } from "react"; 
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle, CardContent, CardHeader } from "@/components/ui/card";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { PostCard } from "@/components/post-card";
import type { Post } from "@/types/post";
import { useToast } from "@/hooks/use-toast";

const USER_POSTS_STORAGE_KEY = "pokerConnectUserPosts";

export default function MyPostsPage() {
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    try {
      const storedPostsString = localStorage.getItem(USER_POSTS_STORAGE_KEY);
      if (storedPostsString) {
        const storedPosts: Post[] = JSON.parse(storedPostsString);
        const loggedInUserString = localStorage.getItem("loggedInUser");
        let currentUsername = "playerone"; 
        if (loggedInUserString) {
            try {
                const loggedInUser = JSON.parse(loggedInUserString);
                currentUsername = loggedInUser.username || currentUsername;
            } catch (e) { console.error("Error parsing loggedInUser for MyPosts", e); }
        }
        
        const filteredPosts = storedPosts.filter(post => post.user.handle === `@${currentUsername}`);
        setUserPosts(filteredPosts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

      } else {
        setUserPosts([]);
      }
    } catch (error) {
      console.error("Error loading posts from localStorage:", error);
      toast({
        title: "Error Loading Posts",
        description: "Could not retrieve your posts from local storage.",
        variant: "destructive",
      });
      setUserPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleDeletePost = (postId: string) => {
    try {
      const updatedPosts = userPosts.filter(post => post.id !== postId);
      setUserPosts(updatedPosts);
      
      const allStoredPostsString = localStorage.getItem(USER_POSTS_STORAGE_KEY);
      if (allStoredPostsString) {
          let allStoredPosts: Post[] = JSON.parse(allStoredPostsString);
          allStoredPosts = allStoredPosts.filter(p => p.id !== postId);
          localStorage.setItem(USER_POSTS_STORAGE_KEY, JSON.stringify(allStoredPosts));
      }
       toast({
        title: "Post Deleted",
        description: `The post has been removed.`,
        variant: "destructive",
      });
    } catch (error) {
      console.error("Error deleting post from localStorage:", error);
      toast({
        title: "Error Deleting Post",
        description: "Could not remove the post from local storage.",
        variant: "destructive",
      });
    }
  };

  const handleLikePost = (postId: string) => {
    setUserPosts(prevPosts =>
      prevPosts.map(p =>
        p.id === postId ? { ...p, likes: p.likes + 1 } : p
      )
    );

    try {
      const allStoredPostsString = localStorage.getItem(USER_POSTS_STORAGE_KEY);
      if (allStoredPostsString) {
        let allStoredPosts: Post[] = JSON.parse(allStoredPostsString);
        allStoredPosts = allStoredPosts.map(p =>
          p.id === postId ? { ...p, likes: p.likes + 1 } : p
        );
        localStorage.setItem(USER_POSTS_STORAGE_KEY, JSON.stringify(allStoredPosts));
      }
    } catch (error) {
      console.error("Error updating likes in localStorage:", error);
      // Optionally revert state update or show error toast
    }
  };

  if (isLoading) {
    return (
        <div className="container mx-auto max-w-2xl text-center py-10">
            <p>Loading your posts...</p>
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
        {userPosts.map((post) => (
          <PostCard 
            key={post.id} 
            post={post} 
            showManagementControls={true} 
            onDeletePost={handleDeletePost}
            onLikePost={handleLikePost}
          />
        ))}
      </div>
    </div>
  );
}
