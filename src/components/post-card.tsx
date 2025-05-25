
"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle, Heart, Repeat, Edit3, Trash2 } from "lucide-react";
import type { Post } from "@/types/post";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface PostCardProps {
  post: Post;
  showManagementControls?: boolean;
  onDeletePost?: (postId: string) => void;
  onLikePost?: (postId: string) => void;
  onCommentPost?: (postId: string, commentText: string) => void;
}

export function PostCard({
  post,
  showManagementControls = false,
  onDeletePost,
  onLikePost,
  onCommentPost
}: PostCardProps) {
  const { toast } = useToast();
  const router = useRouter();

  const handleShare = () => {
    toast({
      title: "Post Shared!",
      description: "This post has been shared to your feed (simulated).",
    });
  };

  const handleLike = () => {
    if (onLikePost) {
      onLikePost(post.id);
    } else {
      // Fallback toast if onLikePost is not provided (e.g., on Home feed)
      toast({
        title: "Action Simulated",
        description: `Like action for "${post.content.substring(0,20)}...".`,
      });
    }
  };

  const handleComment = () => {
    const commentText = window.prompt("Enter your comment:");
    if (commentText === null) { // User cancelled
      console.log("User cancelled comment input.");
      return;
    }
    if (commentText.trim() !== "") {
      if (onCommentPost) {
        onCommentPost(post.id, commentText);
      } else {
         toast({
          title: "Comment Simulated",
          description: "Your comment would be added here.",
        });
      }
    } else { 
      toast({
        title: "Empty Comment",
        description: "Comment cannot be empty.",
        variant: "destructive"
      });
    }
  };

  const handleEdit = () => {
    router.push(`/create-post?editPostId=${post.id}`);
  };

  const handleDelete = () => {
    if (onDeletePost) {
      onDeletePost(post.id);
    } else {
      toast({
        title: "Delete Simulated",
        description: `Post "${post.content.substring(0,20)}..." would be removed.`,
      });
    }
  };


  return (
    <Card key={post.id} className="overflow-hidden shadow-lg rounded-xl">
      <CardHeader className="flex flex-row items-start space-x-4 p-4">
        <Avatar>
          <AvatarImage src={post.user.avatar} alt={post.user.name} data-ai-hint="profile picture" />
          <AvatarFallback>{post.user.name.substring(0, 1)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Link href={`/profile/${post.user.handle.replace("@", "")}`}>
              <CardTitle className="text-lg hover:underline">{post.user.name}</CardTitle>
            </Link>
            <span className="text-sm text-muted-foreground">{post.user.handle}</span>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            {post.timestamp}
          </CardDescription>
        </div>
        {showManagementControls && (
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleEdit}>
              <Edit3 className="h-4 w-4" />
              <span className="sr-only">Edit Post</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onDeletePost ? handleDelete : undefined} // Only attach if onDeletePost is provided
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete Post</span>
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-2">
        <p className="text-foreground mb-3">{post.content}</p>
        {post.image && (
          <div className="rounded-lg overflow-hidden border">
            <Image
              src={post.image}
              alt="Post image"
              width={600}
              height={400}
              className="w-full h-auto object-cover"
              data-ai-hint={post.imageAiHint || "post image"}
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-around p-2 border-t">
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" onClick={handleComment}>
          <MessageCircle className="mr-1 h-4 w-4" /> {post.comments}
        </Button>
        <Button variant="ghost" size="sm" className={`${post.likedByCurrentUser ? 'text-primary' : 'text-muted-foreground'} hover:text-primary`} onClick={handleLike}>
          <Heart className={`mr-1 h-4 w-4 ${post.likedByCurrentUser ? 'fill-primary' : ''}`} /> {post.likes}
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" onClick={handleShare}>
          <Repeat className="mr-1 h-4 w-4" /> {post.shares}
        </Button>
      </CardFooter>
    </Card>
  );
}
