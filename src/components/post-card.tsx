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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MessageCircle, Heart, Repeat, Edit3, Trash2, CornerDownRight, Send, Loader2 } from "lucide-react";
import type { Post, Comment as PostComment } from "@/types/post";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from 'date-fns';

interface PostCardProps {
  post: Post;
  currentUserId?: string | null;
  showManagementControls?: boolean;
  onDeletePost?: (postId: string) => void;
  onLikePost?: (postId: string) => void;
  onCommentPost?: (postId: string, commentText: string) => Promise<void>;
  onSharePost?: (postId: string, caption: string) => Promise<void>;
  isLCPItem?: boolean;
}

export function PostCard({
  post,
  currentUserId,
  showManagementControls = false,
  onDeletePost,
  onLikePost,
  onCommentPost,
  onSharePost,
  isLCPItem = false,
}: PostCardProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [shareCaption, setShareCaption] = useState("");
  const [isSharePopoverOpen, setIsSharePopoverOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (!currentUserId) {
      toast({
        title: "Authentication Required",
        description: "Please log in to share this post.",
        variant: "destructive",
      });
      return;
    }
    if (!shareCaption.trim()) {
      toast({
        title: "Empty Caption",
        description: "Please add a caption to share this post.",
        variant: "destructive",
      });
      return;
    }
    if (onSharePost) {
      setIsSharing(true);
      try {
        await onSharePost(post.id, shareCaption.trim());
        setShareCaption("");
        setIsSharePopoverOpen(false);
      } catch (error) {
        console.error("PostCard: Error during onSharePost call:", error);
        // Error toast is handled by the parent component
      } finally {
        setIsSharing(false);
      }
    } else {
      toast({
        title: "Post Shared!",
        description: "This post has been shared to your feed (simulated).",
      });
    }
  };

  const handleLike = () => {
    if (!currentUserId) {
      toast({
        title: "Authentication Required",
        description: "Please log in to like this post.",
        variant: "destructive",
      });
      return;
    }
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
    if (!currentUserId) {
      toast({
        title: "Authentication Required",
        description: "Please log in to comment on this post.",
        variant: "destructive",
      });
      return;
    }
    if (!newComment.trim()) {
      toast({ title: "Empty Comment", description: "Comment cannot be empty.", variant: "destructive" });
      return;
    }
    if (onCommentPost) {
      setIsSubmittingComment(true);
      try {
        await onCommentPost(post.id, newComment.trim());
        setNewComment("");
      } catch (error) {
        console.error("PostCard: Error during onCommentPost call:", error);
      } finally {
        setIsSubmittingComment(false);
      }
    } else {
      toast({
        title: "Comment Simulated",
        description: `Comment: "${newComment}" for post ID ${post.id}. Firestore interaction needed.`,
      });
      setNewComment("");
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
    let date: Date | null = null;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
    } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      const parsedDate = new Date(timestamp);
      if (!isNaN(parsedDate.getTime())) {
        date = parsedDate;
      }
    }

    if (date) {
      try {
        return formatDistanceToNow(date, { addSuffix: true });
      } catch (e) {
        console.warn("Error formatting date:", e, "Timestamp was:", timestamp);
        return new Date(timestamp).toLocaleString();
      }
    }
    return new Date().toLocaleString();
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
        {post.originalPost && (
          <div className="mb-4 p-4 border-l-4 border-primary bg-muted rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={post.originalPost.user.avatar || `https://placehold.co/100x100.png?text=${post.originalPost.user.name?.substring(0,1)?.toUpperCase() || 'P'}`} alt={post.originalPost.user.name} data-ai-hint="original poster avatar" />
                <AvatarFallback>{post.originalPost.user.name?.substring(0,1)?.toUpperCase() || 'P'}</AvatarFallback>
              </Avatar>
              <div>
                <Link href={`/profile/${post.originalPost.user.handle?.replace("@", "") || post.originalPost.userId}`}>
                  <span className="text-sm font-semibold hover:underline">{post.originalPost.user.name || "Unknown User"}</span>
                </Link>
                <span className="text-xs text-muted-foreground ml-2">{post.originalPost.user.handle || `@${post.originalPost.username || 'unknown'}`}</span>
              </div>
            </div>
            <p className="text-sm mb-2 whitespace-pre-wrap">{post.originalPost.content}</p>
            {post.originalPost.image && (
              <div className="rounded-lg overflow-hidden border relative aspect-[3/2]">
                <Image
                  src={post.originalPost.image}
                  alt="Original post image"
                  fill
                  style={{objectFit: "cover"}}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  data-ai-hint={post.originalPost.imageAiHint || "original post image"}
                  priority={false}
                />
              </div>
            )}
          </div>
        )}
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
            <Heart className={`mr-1 h-4 w-4 ${post.likedByCurrentUser ? 'fill-primary' : ''}`} /> {Math.max(0, post.likes || 0)}
          </Button>
          <Popover open={isSharePopoverOpen} onOpenChange={setIsSharePopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                <Repeat className="mr-1 h-4 w-4" /> {post.shares || 0}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <h4 className="font-medium">Share this post</h4>
                <Input
                  placeholder="Add a caption to your share..."
                  value={shareCaption}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setShareCaption(e.target.value)}
                  className="h-9 text-sm"
                  disabled={isSharing}
                />
                <Button onClick={handleShare} className="w-full" disabled={isSharing}>
                  {isSharing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Repeat className="h-4 w-4 mr-2" />}
                  Share
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {(post.fetchedComments && post.fetchedComments.length > 0) && (
          <div className="w-full px-4 pt-3 mt-2 border-t border-dashed space-y-3">
            <h4 className="text-sm font-semibold text-foreground/80">Comments:</h4>
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {post.fetchedComments.slice().reverse().map((comment) => (
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