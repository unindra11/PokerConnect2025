
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
import { storage, firestore, app } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { addDoc, collection, serverTimestamp, doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const createPostSchema = z.object({
  postContent: z.string().min(1, "Post content cannot be empty.").max(1000, "Post content is too long."),
});

type CreatePostFormValues = z.infer<typeof createPostSchema>;

const USER_POSTS_STORAGE_KEY = "pokerConnectUserPosts"; // We'll still update this temporarily

export default function CreatePostPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageToSaveUrl, setImageToSaveUrl] = useState<string | null>(null); // For existing image URL in edit mode
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const auth = getAuth(app);

  const editPostId = searchParams.get("editPostId"); // Firestore document ID
  const isEditMode = !!editPostId;

  const form = useForm<CreatePostFormValues>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      postContent: "",
    },
  });

  useEffect(() => {
    const loadPostForEdit = async () => {
      if (isEditMode && editPostId) {
        setIsLoading(true);
        try {
          // Try fetching from Firestore first for edit mode
          const db = getFirestore(app, "poker");
          const postDocRef = doc(db, "posts", editPostId);
          const postDocSnap = await getDoc(postDocRef);

          if (postDocSnap.exists()) {
            const postToEdit = postDocSnap.data() as Post;
            form.setValue("postContent", postToEdit.content);
            if (postToEdit.image) {
              setPreviewUrl(postToEdit.image);
              setImageToSaveUrl(postToEdit.image);
            }
          } else {
            // Fallback to localStorage if not in Firestore (for older posts)
            const storedPostsString = localStorage.getItem(USER_POSTS_STORAGE_KEY);
            if (storedPostsString) {
              const storedPosts: Post[] = JSON.parse(storedPostsString);
              const postToEdit = storedPosts.find(p => p.id === editPostId);
              if (postToEdit) {
                form.setValue("postContent", postToEdit.content);
                if (postToEdit.image) {
                  setPreviewUrl(postToEdit.image);
                  setImageToSaveUrl(postToEdit.image);
                }
              } else {
                toast({ title: "Error", description: "Post not found for editing.", variant: "destructive" });
                router.push("/my-posts");
              }
            }
          }
        } catch (error) {
          console.error("Error loading post for editing:", error);
          toast({ title: "Error", description: "Could not load post data for editing.", variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadPostForEdit();
  }, [isEditMode, editPostId, form, toast, router]);

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
        setPreviewUrl(imageToSaveUrl); // Revert to original image if edit mode, or null
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Unsupported File Type",
          description: "Only image uploads are supported.",
          variant: "destructive",
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
        setSelectedFile(null);
        setPreviewUrl(imageToSaveUrl);
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      setImageToSaveUrl(null); // Clear existing image URL if a new file is selected
    }
  };

  const clearMedia = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setImageToSaveUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit: SubmitHandler<CreatePostFormValues> = async (data) => {
    setIsLoading(true);
    const currentUser = auth.currentUser;
    let loggedInUserForPost: User | null = null;

    if (currentUser) {
        const loggedInUserString = localStorage.getItem("loggedInUser");
        if (loggedInUserString) {
            const parsedUser = JSON.parse(loggedInUserString);
            loggedInUserForPost = {
                name: parsedUser.fullName || parsedUser.username || "Anonymous",
                avatar: parsedUser.avatar || `https://placehold.co/100x100.png?text=${(parsedUser.fullName || parsedUser.username || "A").substring(0,1)}`,
                handle: `@${parsedUser.username || 'anonymous'}`
            };
        }
    }

    if (!currentUser || !loggedInUserForPost) {
      toast({ title: "Error", description: "You must be logged in to create or edit a post.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    let finalImageUrl: string | undefined = imageToSaveUrl || undefined;

    if (selectedFile) {
      const storageRefPath = `posts/${currentUser.uid}/${Date.now()}_${selectedFile.name}`;
      const fileStorageRef = ref(storage, storageRefPath);
      const uploadTask = uploadBytesResumable(fileStorageRef, selectedFile);
      try {
        await uploadTask;
        finalImageUrl = await getDownloadURL(uploadTask.snapshot.ref);
      } catch (error: any) {
        console.error("Firebase Storage upload error:", error);
        toast({ title: "Upload Failed", description: `Could not upload image: ${error.message}. Post will be saved without image.`, variant: "destructive" });
        // Don't return, allow saving post without image if upload fails
      }
    }
    
    const db = getFirestore(app, "poker");

    try {
      if (isEditMode && editPostId) {
        // Update existing post in Firestore
        const postDocRef = doc(db, "posts", editPostId);
        await updateDoc(postDocRef, {
          content: data.postContent,
          image: finalImageUrl, // If finalImageUrl is undefined, it keeps the old one or sets to undefined
          // userId, username, user object, createdAt should generally not be updated here
        });
        toast({ title: "Post Updated!", description: "Your changes have been saved to Firestore." });

        // Also update localStorage for now
        const storedPostsString = localStorage.getItem(USER_POSTS_STORAGE_KEY);
        let posts: Post[] = storedPostsString ? JSON.parse(storedPostsString) : [];
        posts = posts.map(p => p.id === editPostId ? { ...p, content: data.postContent, image: finalImageUrl || p.image, timestamp: new Date().toLocaleString() } : p);
        localStorage.setItem(USER_POSTS_STORAGE_KEY, JSON.stringify(posts));

      } else {
        // Create new post in Firestore
        const postDataForFirestore = {
          userId: currentUser.uid,
          user: loggedInUserForPost, // User object for display convenience
          content: data.postContent,
          image: finalImageUrl || null,
          imageAiHint: selectedFile ? "user uploaded image" : undefined,
          likes: 0,
          comments: 0,
          commentTexts: [],
          shares: 0,
          createdAt: serverTimestamp(),
        };
        const docRef = await addDoc(collection(db, "posts"), postDataForFirestore);
        toast({ title: "Post Created!", description: "Your thoughts have been shared on Firestore." });
        
        // Also save to localStorage for now (with client-side timestamp)
        const storedPostsString = localStorage.getItem(USER_POSTS_STORAGE_KEY);
        let posts: Post[] = storedPostsString ? JSON.parse(storedPostsString) : [];
        const newPostForLocalStorage: Post = {
            id: docRef.id, // Use Firestore ID
            userId: currentUser.uid,
            user: loggedInUserForPost,
            content: data.postContent,
            image: finalImageUrl,
            imageAiHint: selectedFile ? "user uploaded image" : undefined,
            likes: 0,
            comments: 0,
            commentTexts: [],
            shares: 0,
            timestamp: new Date().toLocaleString(), // Client-side timestamp for localStorage
            createdAt: new Date(), // Client-side timestamp for localStorage
        };
        posts = [newPostForLocalStorage, ...posts];
        localStorage.setItem(USER_POSTS_STORAGE_KEY, JSON.stringify(posts));
      }

      form.reset();
      setSelectedFile(null);
      setPreviewUrl(null);
      setImageToSaveUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.push(isEditMode ? "/my-posts" : "/community-wall");

    } catch (error: any) {
      console.error("Error saving post to Firestore:", error);
      toast({ title: "Firestore Error", description: `Could not save post: ${error.message}`, variant: "destructive" });
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
