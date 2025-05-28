
"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Heart, Repeat, Edit3, Trash2, CornerDownRight, Send } from "lucide-react";
import type { Post, Comment as PostComment } from "@/types/post"; // Use PostComment alias
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from 'date-fns';

interface PostCardProps {
  post: Post;
  currentUserId?: string | null; // To check if the logged-in user can delete their own comment (optional)
  showManagementControls?: boolean;
  onDeletePost?: (postId: string) => void;
  onLikePost?: (postId: string) => void;
  onCommentPost?: (postId: string, commentText: string) => Promise<void>; // Make it async
  isLCPItem?: boolean; 
}

export function PostCard({
  post,
  currentUserId,
  showManagementControls = false,
  onDeletePost,
  onLikePost,
  onCommentPost,
  isLCPItem = false,
}: PostCardProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

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
        title: "Like Action (Simulated)",
        description: `Like action for post ID ${post.id}. Firestore interaction needed.`,
      });
    }
  };

  const handleSubmitComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) {
      toast({ title: "Empty Comment", description: "Comment cannot be empty.", variant: "destructive" });
      return;
    }
    if (onCommentPost) {
      setIsSubmittingComment(true);
      try {
        await onCommentPost(post.id, newComment.trim());
        setNewComment(""); // Clear input on success
      } catch (error) {
        // Error toast is handled by the parent component
      } finally {
        setIsSubmittingComment(false);
      }
    } else {
       toast({
        title: "Comment Simulated",
        description: `Comment: "${newComment}" for post ID ${post.id}. Firestore interaction needed.`,
      });
    }
  };

  const handleEdit = () => {
    router.push(`/create-post?editPostId=${post.id}`);
  };

  const handleDelete = () => {
    const confirmDelete = window.confirm("Are you sure you want to delete this post? This action cannot be undone.");
    if (confirmDelete) {
      if (onDeletePost) {
        onDeletePost(post.id);
      } else {
        toast({
          title: "Delete Simulated",
          description: `Post ID ${post.id} would be removed. Firestore interaction needed.`,
        });
      }
    }
  };

  const displayedLikes = Math.max(0, post.likes || 0);
  const displayedCommentsCount = Math.max(0, post.comments || 0);
  
  const getTimestampString = (timestamp: any): string => {
    if (!timestamp) return 'Just now';
    if (timestamp.toDate) { // Firestore Timestamp
      return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
    }
    if (timestamp.seconds) { // Object with seconds and nanoseconds
      return formatDistanceToNow(new Date(timestamp.seconds * 1000), { addSuffix: true });
    }
    if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
             return formatDistanceToNow(date, { addSuffix: true });
        }
    }
    return 'A while ago';
  };


  return (
    <Card key={post.id} className="overflow-hidden shadow-lg rounded-xl">
      <CardHeader className="flex flex-row items-start space-x-4 p-4">
        <Avatar>
          <AvatarImage src={post.user.avatar || `https://placehold.co/100x100.png?text=${post.user.name?.substring(0,1)?.toUpperCase() || 'P'}`} alt={post.user.name} data-ai-hint="profile picture" />
          <AvatarFallback>{post.user.name?.substring(0, 1)?.toUpperCase() || 'P'}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Link href={`/profile/${post.user.handle?.replace("@", "") || post.userId}`}>
              <CardTitle className="text-lg hover:underline">{post.user.name || "Unknown User"}</CardTitle>
            </Link>
            <span className="text-sm text-muted-foreground">{post.user.handle || `@${post.username || 'unknown'}`}</span>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            {getTimestampString(post.createdAt)}
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
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete Post</span>
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-2">
        <p className="text-foreground mb-3 whitespace-pre-wrap">{post.content}</p>
        {post.image && (
          <div className="rounded-lg overflow-hidden border relative aspect-[3/2] my-2">
            <Image
              src={post.image}
              alt="Post image"
              fill
              style={{objectFit: "cover"}}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              data-ai-hint={post.imageAiHint || "post image"}
              priority={isLCPItem} 
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-start p-2 border-t">
        <div className="flex justify-around w-full px-2 py-1">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
              <MessageCircle className="mr-1 h-4 w-4" /> {displayedCommentsCount}
            </Button>
            <Button variant="ghost" size="sm" className={`${post.likedByCurrentUser ? 'text-primary' : 'text-muted-foreground'} hover:text-primary`} onClick={handleLike}>
              <Heart className={`mr-1 h-4 w-4 ${post.likedByCurrentUser ? 'fill-primary' : ''}`} /> {displayedLikes}
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" onClick={handleShare}>
              <Repeat className="mr-1 h-4 w-4" /> {post.shares || 0}
            </Button>
        </div>

        {/* Display Comments */}
        {(post.fetchedComments && post.fetchedComments.length > 0) && (
          <div className="w-full px-4 pt-3 mt-2 border-t border-dashed space-y-3">
            <h4 className="text-sm font-semibold text-foreground/80">Comments:</h4>
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {post.fetchedComments.slice().reverse().map((comment) => ( // Show newest first
                <li key={comment.id} className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-md flex items-start space-x-2">
                  <Avatar className="h-6 w-6 mt-0.5">
                    <AvatarImage src={comment.avatar || `https://placehold.co/40x40.png?text=${comment.username?.substring(0,1)?.toUpperCase() || 'U'}`} alt={comment.username} data-ai-hint="commenter avatar" />
                    <AvatarFallback>{comment.username?.substring(0,1)?.toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="font-semibold text-foreground/90 mr-1">{comment.username || "Anonymous"}</span>
                    <span>{comment.text}</span>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">{getTimestampString(comment.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Add Comment Form */}
        {onCommentPost && (
          <form onSubmit={handleSubmitComment} className="w-full px-4 pt-3 mt-2 border-t border-dashed flex items-center gap-2">
            <Input
              type="text"
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNewComment(e.target.value)}
              className="flex-grow h-9 text-sm"
              disabled={isSubmittingComment}
            />
            <Button type="submit" size="sm" disabled={isSubmittingComment || !newComment.trim()}>
              {isSubmittingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        )}
      </CardFooter>
    </Card>
  );
}
