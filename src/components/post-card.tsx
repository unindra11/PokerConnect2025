
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
import { MessageCircle, Heart, Repeat, Edit3, Trash2, CornerDownRight } from "lucide-react";
import type { Post } from "@/types/post";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface PostCardProps {
  post: Post;
  showManagementControls?: boolean;
  onDeletePost?: (postId: string) => void;
  onLikePost?: (postId: string) => void;
  onCommentPost?: (postId: string, commentText: string) => void;
  isLCPItem?: boolean; // New prop to indicate if this post might be the LCP
}

export function PostCard({
  post,
  showManagementControls = false,
  onDeletePost,
  onLikePost,
  onCommentPost,
  isLCPItem = false, // Default to false
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
      toast({
        title: "Action Simulated",
        description: `Like action for "${post.content.substring(0,20)}...".`,
      });
    }
  };

  const handleComment = () => {
    const commentText = window.prompt("Enter your comment:");
    if (commentText === null) { // User clicked cancel
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
    // Pass existing image URL if available to prefill in edit mode
    const queryParams = new URLSearchParams({ editPostId: post.id, editContent: post.content });
    if (post.image) {
      queryParams.append("editImage", post.image);
    }
    router.push(`/create-post?${queryParams.toString()}`);
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
              onClick={onDeletePost ? handleDelete : undefined}
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
          <div className="rounded-lg overflow-hidden border relative aspect-[3/2]">
            <Image
              src={post.image}
              alt="Post image"
              fill
              style={{objectFit: "cover"}}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              data-ai-hint={post.imageAiHint || "post image"}
              priority={isLCPItem} // Add priority prop
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-start p-2 border-t">
        <div className="flex justify-around w-full px-2 py-1">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" onClick={handleComment}>
            <MessageCircle className="mr-1 h-4 w-4" /> {post.comments || 0}
            </Button>
            <Button variant="ghost" size="sm" className={`${post.likedByCurrentUser ? 'text-primary' : 'text-muted-foreground'} hover:text-primary`} onClick={handleLike}>
            <Heart className={`mr-1 h-4 w-4 ${post.likedByCurrentUser ? 'fill-primary' : ''}`} /> {post.likes || 0}
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" onClick={handleShare}>
            <Repeat className="mr-1 h-4 w-4" /> {post.shares || 0}
            </Button>
        </div>
        {post.commentTexts && post.commentTexts.length > 0 && (
          <div className="w-full px-4 pt-2 mt-2 border-t border-dashed">
            <h4 className="text-sm font-semibold mb-2 text-foreground/80">Comments:</h4>
            <ul className="space-y-2 max-h-40 overflow-y-auto">
              {post.commentTexts.slice(0).reverse().map((comment, index) => (
                <li key={index} className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md flex items-start">
                  <CornerDownRight className="h-3 w-3 mr-2 mt-0.5 flex-shrink-0 text-primary" />
                  <span>{comment}</span>
                </li>
              ))}
            </ul>
            {post.commentTexts.length > 3 && (
                 <p className="text-xs text-center text-muted-foreground mt-2 italic">Scroll for more comments</p>
            )}
          </div>
        )}
         {(!post.commentTexts || post.commentTexts.length === 0) && post.comments > 0 && (
            <div className="w-full px-4 pt-2 mt-2 border-t border-dashed">
                 <p className="text-xs text-muted-foreground italic">This post has {post.comments} {post.comments === 1 ? "comment" : "comments"}, but text is not available.</p>
            </div>
        )}
      </CardFooter>
    </Card>
  );
}
