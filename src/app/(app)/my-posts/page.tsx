
"use client"; 

import { useState, useEffect } from "react"; 
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle, CardContent } from "@/components/ui/card"; // Added CardContent
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { PostCard } from "@/components/post-card";
import type { Post } from "@/types/post";
import { useToast } from "@/hooks/use-toast"; // Import useToast

const USER_POSTS_STORAGE_KEY = "pokerConnectUserPosts";

export default function MyPostsPage() {
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true); // For loading state
  const { toast } = useToast(); // Initialize toast

  useEffect(() => {
    setIsLoading(true);
    try {
      const storedPostsString = localStorage.getItem(USER_POSTS_STORAGE_KEY);
      if (storedPostsString) {
        const storedPosts: Post[] = JSON.parse(storedPostsString);
        // Filter posts to show only those by the "logged-in" user (mocked for now)
        // In a real app, you'd compare against the actual logged-in user's ID/username
        const loggedInUserString = localStorage.getItem("loggedInUser");
        let currentUsername = "playerone"; // Default mock username
        if (loggedInUserString) {
            try {
                const loggedInUser = JSON.parse(loggedInUserString);
                currentUsername = loggedInUser.username || currentUsername;
            } catch (e) { console.error("Error parsing loggedInUser for MyPosts", e); }
        }
        
        // Assuming post.user.handle is like "@username"
        const filteredPosts = storedPosts.filter(post => post.user.handle === `@${currentUsername}`);
        setUserPosts(filteredPosts);

      } else {
        setUserPosts([]); // No posts stored yet
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
  }, [toast]); // Add toast to dependency array if used in effect (though not directly here, good practice)

  const handleDeletePost = (postId: string) => {
    try {
      const updatedPosts = userPosts.filter(post => post.id !== postId);
      setUserPosts(updatedPosts);
      
      // Update localStorage by re-fetching all posts and removing the specific one
      // This is safer than just saving 'updatedPosts' if other users' posts are stored globally.
      // However, for 'pokerConnectUserPosts', it's expected to be only the current user's posts if filtered on creation.
      // For simplicity, we'll update based on the current `userPosts` state, assuming it's correctly loaded/filtered.
      
      const allStoredPostsString = localStorage.getItem(USER_POSTS_STORAGE_KEY);
      if (allStoredPostsString) {
          let allStoredPosts: Post[] = JSON.parse(allStoredPostsString);
          allStoredPosts = allStoredPosts.filter(p => p.id !== postId);
          localStorage.setItem(USER_POSTS_STORAGE_KEY, JSON.stringify(allStoredPosts));
      }

      // Toast notification is handled by PostCard, but we could add another one here if needed.
    } catch (error) {
      console.error("Error deleting post from localStorage:", error);
      toast({
        title: "Error Deleting Post",
        description: "Could not remove the post from local storage.",
        variant: "destructive",
      });
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
            <CardHeader> {/* Wrap title and description in CardHeader */}
              <CardTitle className="text-xl mb-2">No Posts Yet!</CardTitle>
              <CardDescription className="mb-4">Start sharing your poker journey with the community.</CardDescription>
            </CardHeader>
            <CardContent> {/* Wrap button in CardContent for consistency or CardFooter */}
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
          />
        ))}
      </div>
    </div>
  );
}

    