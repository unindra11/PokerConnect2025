
"use client";

import { useEffect, useState, useRef } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ImagePlus, Send, Edit, Loader2, X, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import type { Post, User } from "@/types/post";
import { storage } from "@/lib/firebase"; // Import Firebase storage
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const MAX_FILE_SIZE_MB = 5; 
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const createPostSchema = z.object({
  postContent: z.string().min(1, "Post content cannot be empty.").max(1000, "Post content is too long."),
});

type CreatePostFormValues = z.infer<typeof createPostSchema>;

const USER_POSTS_STORAGE_KEY = "pokerConnectUserPosts";

export default function CreatePostPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // This will hold Data URI for local preview
  const [imageToSaveUrl, setImageToSaveUrl] = useState<string | null>(null); // This will hold Firebase URL or existing image URL for saving
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editPostId = searchParams.get("editPostId");
  const isEditMode = !!editPostId;

  const form = useForm<CreatePostFormValues>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      postContent: "",
    },
  });

  useEffect(() => {
    if (isEditMode && editPostId) {
      try {
        const storedPostsString = localStorage.getItem(USER_POSTS_STORAGE_KEY);
        if (storedPostsString) {
          const storedPosts: Post[] = JSON.parse(storedPostsString);
          const postToEdit = storedPosts.find(p => p.id === editPostId);
          if (postToEdit) {
            form.setValue("postContent", postToEdit.content);
            if (postToEdit.image) {
              setPreviewUrl(postToEdit.image); // For preview
              setImageToSaveUrl(postToEdit.image); // For saving if not changed
            }
          } else {
            toast({ title: "Warning", description: "Could not find the original post in storage.", variant: "default" });
          }
        }
      } catch (error) {
        console.error("Error loading post for editing from localStorage:", error);
        toast({ title: "Error", description: "Could not load post data for editing.", variant: "destructive" });
      }
    }
  }, [isEditMode, editPostId, form, toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          title: "File Too Large",
          description: `Please select a file smaller than ${MAX_FILE_SIZE_MB}MB.`,
          variant: "destructive",
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
        setSelectedFile(null);
        setPreviewUrl(null);
        setImageToSaveUrl(isEditMode && imageToSaveUrl ? imageToSaveUrl : null); // Keep existing if in edit mode
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast({
          title: "Unsupported File Type",
          description: "Only image uploads are currently supported for Firebase Storage in this prototype.",
          variant: "destructive",
        });
         if (fileInputRef.current) fileInputRef.current.value = "";
        setSelectedFile(null);
        setPreviewUrl(null);
        setImageToSaveUrl(isEditMode && imageToSaveUrl ? imageToSaveUrl : null);
        return;
      }
      
      setSelectedFile(file); // Store the file object for upload
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string); // Set Data URI for local preview
      };
      reader.onerror = () => {
        toast({ title: "Error", description: "Could not read the selected file for preview.", variant: "destructive"});
        setSelectedFile(null);
        setPreviewUrl(null);
      }
      reader.readAsDataURL(file);
      setImageToSaveUrl(null); // New file selected, so Firebase URL will be generated
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
      setImageToSaveUrl(isEditMode && imageToSaveUrl ? imageToSaveUrl : null);
    }
  };

  const clearMedia = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setImageToSaveUrl(null); // Also clear the URL to be saved for new posts
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit: SubmitHandler<CreatePostFormValues> = async (data) => {
    setIsLoading(true);

    let loggedInUser: User | null = null;
    let currentUsername = "anonymous";
    try {
        const loggedInUserString = localStorage.getItem("loggedInUser");
        if (loggedInUserString) {
            const parsedUser = JSON.parse(loggedInUserString);
            currentUsername = parsedUser.username || 'anonymous';
            loggedInUser = {
                name: parsedUser.fullName || parsedUser.username || "Anonymous",
                avatar: parsedUser.avatar || `https://placehold.co/100x100.png?text=${(parsedUser.fullName || parsedUser.username || "A").substring(0,1)}`,
                handle: `@${currentUsername}`
            };
        } else {
             loggedInUser = { name: "Player One", avatar: "https://placehold.co/100x100.png", handle: "@playerone" };
        }
    } catch (e) {
        console.error("Error getting logged in user for post:", e);
        loggedInUser = { name: "Player One", avatar: "https://placehold.co/100x100.png", handle: "@playerone" };
    }

    let finalImageUrl: string | undefined = imageToSaveUrl || undefined; // Use existing if not changed, or undefined

    if (selectedFile) {
      // Upload to Firebase Storage
      // IMPORTANT: For production, ensure Firebase Storage rules are set up for security.
      // e.g., allow write only for authenticated users to paths like `posts/${userID}/${filename}`
      const storageRef = ref(storage, `posts/${currentUsername}/${Date.now()}_${selectedFile.name}`);
      const uploadTask = uploadBytesResumable(storageRef, selectedFile);

      try {
        await uploadTask;
        finalImageUrl = await getDownloadURL(uploadTask.snapshot.ref);
        toast({ title: "Image Uploaded", description: "Image successfully uploaded to Firebase Storage." });
      } catch (error: any) {
        console.error("Firebase Storage upload error:", error);
        toast({
          title: "Upload Failed",
          description: `Could not upload image: ${error.message}. Post will be saved without image.`,
          variant: "destructive",
        });
        setIsLoading(false);
        return; // Or proceed to save post without image
      }
    }


    try {
      const storedPostsString = localStorage.getItem(USER_POSTS_STORAGE_KEY);
      let posts: Post[] = storedPostsString ? JSON.parse(storedPostsString) : [];

      if (isEditMode && editPostId) {
        posts = posts.map(p => {
          if (p.id === editPostId) {
            return {
              ...p,
              content: data.postContent,
              image: finalImageUrl || p.image, // Use new URL, or keep old if no new upload
              timestamp: new Date().toLocaleString(), 
            };
          }
          return p;
        });
      } else {
        const newPost: Post = {
          id: `post_${Date.now()}_${Math.random().toString(36).substring(2,9)}`,
          user: loggedInUser!,
          content: data.postContent,
          image: finalImageUrl, 
          imageAiHint: selectedFile ? "user uploaded image" : undefined,
          likes: 0,
          likedByCurrentUser: false,
          comments: 0,
          commentTexts: [],
          shares: 0,
          timestamp: new Date().toLocaleString(),
        };
        posts = [newPost, ...posts]; 
      }
      
      localStorage.setItem(USER_POSTS_STORAGE_KEY, JSON.stringify(posts));
      
      toast({
        title: isEditMode ? "Post Updated!" : "Post Created!",
        description: isEditMode ? "Your changes have been saved." : "Your thoughts have been shared.",
      });
      
      form.reset();
      setSelectedFile(null);
      setPreviewUrl(null);
      setImageToSaveUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.push(isEditMode ? "/my-posts" : "/community-wall");

    } catch (error) {
      console.error("Error saving post to localStorage:", error);
      toast({
        title: "Storage Error",
        description: "Could not save your post details to local storage.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-xl">
      <Card className="shadow-xl rounded-xl">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">{isEditMode ? "Edit Your Post" : "Share Your Poker Story"}</CardTitle>
              <CardDescription>
                {isEditMode ? "Make changes to your post below." : "Post updates, ask questions, or share experiences. Images are uploaded to Firebase Storage."}
              </CardDescription>
            </div>
            {isEditMode && (
              <Button variant="outline" size="sm" onClick={() => router.push('/my-posts')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Cancel Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="postContent">Your Thoughts</Label>
              <Textarea
                id="postContent"
                placeholder="What's on your mind? Share a hand, a strategy, or a recent win..."
                className="mt-1 min-h-[120px]"
                {...form.register("postContent")}
              />
              {form.formState.errors.postContent && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.postContent.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="mediaFile">Add Image (Optional, max {MAX_FILE_SIZE_MB}MB)</Label>
              <div className="mt-2 flex flex-col items-center justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md hover:border-primary transition-colors">
                {!previewUrl && (
                  <div className="space-y-1 text-center">
                    <ImagePlus className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div className="flex text-sm text-muted-foreground">
                      <label
                        htmlFor="mediaFile-upload"
                        className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                      >
                        <span>Upload an image</span>
                        <Input 
                          id="mediaFile-upload" 
                          type="file" 
                          className="sr-only"
                          accept="image/*" 
                          onChange={handleFileChange}
                          ref={fileInputRef}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to {MAX_FILE_SIZE_MB}MB</p>
                  </div>
                )}
                {previewUrl && (
                  <div className="mt-2 w-full flex justify-center">
                    <div className="relative inline-block">
                        <img src={previewUrl} alt="Preview" className="max-h-60 rounded-md object-contain" data-ai-hint="image preview" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={clearMedia}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 p-1 rounded-full h-6 w-6 z-10"
                        aria-label="Remove media"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
               <p className="text-xs text-muted-foreground mt-2 text-center">
                Images will be uploaded to Firebase Cloud Storage. Ensure your Firebase project and Storage rules are configured.
              </p>
            </div>
            
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? "Updating..." : "Posting..."}
                </>
              ) : (
                <>
                  {isEditMode ? <Edit className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                  {isEditMode ? "Update Post" : "Post to Wall"}
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
