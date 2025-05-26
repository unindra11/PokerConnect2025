
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
import { storage, app, auth } from "@/lib/firebase"; 
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { addDoc, collection, serverTimestamp, doc, getDoc, updateDoc, Timestamp, getFirestore } from "firebase/firestore";

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const createPostSchema = z.object({
  postContent: z.string().min(1, "Post content cannot be empty.").max(1000, "Post content is too long."),
});

type CreatePostFormValues = z.infer<typeof createPostSchema>;

const USER_POSTS_STORAGE_KEY = "pokerConnectUserPosts";

export default function CreatePostPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageToSaveUrl, setImageToSaveUrl] = useState<string | null>(null); // For existing image in edit mode
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
    const loadPostForEdit = async () => {
      if (isEditMode && editPostId) {
        setIsLoading(true);
        try {
          // First, try fetching from Firestore
          const db = getFirestore(app, "poker");
          const postDocRef = doc(db, "posts", editPostId);
          const postDocSnap = await getDoc(postDocRef);

          if (postDocSnap.exists()) {
            const postToEdit = postDocSnap.data() as Post;
            form.setValue("postContent", postToEdit.content);
            if (postToEdit.image) {
              setPreviewUrl(postToEdit.image); // This could be a Firebase Storage URL
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
                if (postToEdit.image) { // This might be a Data URI
                  setPreviewUrl(postToEdit.image);
                  setImageToSaveUrl(postToEdit.image); 
                }
              } else {
                toast({ title: "Error", description: "Post not found for editing.", variant: "destructive" });
                router.push("/my-posts");
              }
            } else {
                toast({ title: "Error", description: "Post not found in Firestore or localStorage.", variant: "destructive" });
                router.push("/my-posts");
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
        setPreviewUrl(imageToSaveUrl); // Revert to existing image if edit mode
        return;
      }
      if (!file.type.startsWith("image/")) { // Only allowing images for now
        toast({
          title: "Unsupported File Type",
          description: "Only image uploads are supported.",
          variant: "destructive",
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
        setSelectedFile(null);
        setPreviewUrl(imageToSaveUrl); // Revert to existing image
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string); // Local preview
      };
      reader.readAsDataURL(file);
      setImageToSaveUrl(null); // Clear if user is uploading new file
    }
  };

  const clearMedia = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setImageToSaveUrl(null); // Clear this too
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit: SubmitHandler<CreatePostFormValues> = async (data) => {
    setIsLoading(true);
    const currentUserAuth = auth.currentUser;
    let loggedInUserForPost: User | null = null;

    if (currentUserAuth) {
      // Try to get fuller details from localStorage if available
      const loggedInUserString = localStorage.getItem("loggedInUser");
      if (loggedInUserString) {
        const parsedUser = JSON.parse(loggedInUserString);
        loggedInUserForPost = {
          name: parsedUser.fullName || parsedUser.username || "Anonymous",
          avatar: parsedUser.avatar || `https://placehold.co/100x100.png?text=${(parsedUser.fullName || parsedUser.username || "A").substring(0,1)}`,
          handle: `@${parsedUser.username || 'anonymous'}`
        };
      } else { // Fallback if no full details in localStorage
        loggedInUserForPost = {
          name: currentUserAuth.displayName || currentUserAuth.email?.split('@')[0] || "Anonymous",
          avatar: currentUserAuth.photoURL || `https://placehold.co/100x100.png?text=${(currentUserAuth.displayName || currentUserAuth.email || "A").substring(0,1)}`,
          handle: `@${currentUserAuth.email?.split('@')[0] || 'anonymous'}`
        };
      }
    }
    
    console.log("CreatePostPage: currentUserAuth object before storage upload:", currentUserAuth);

    if (!currentUserAuth || !loggedInUserForPost) {
      toast({ title: "Authentication Error", description: "You must be logged in to create or edit a post.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    let finalImageUrl: string | undefined = imageToSaveUrl || undefined; // Keep existing image if no new file

    if (selectedFile) { // If a new file is selected, upload it
      const storageRefPath = `posts/${currentUserAuth.uid}/${Date.now()}_${selectedFile.name}`;
      const fileStorageRef = ref(storage, storageRefPath);
      const uploadTask = uploadBytesResumable(fileStorageRef, selectedFile);

      try {
        console.log(`CreatePostPage: Attempting to upload to Firebase Storage path: ${storageRefPath}`);
        await uploadTask;
        finalImageUrl = await getDownloadURL(uploadTask.snapshot.ref);
        console.log("CreatePostPage: Firebase Storage upload successful. Download URL:", finalImageUrl);
      } catch (error: any) {
        console.error("CreatePostPage: Firebase Storage upload error:", error);
        toast({ title: "Upload Failed", description: `Could not upload image: ${error.message}. Ensure Storage rules are correctly set. Post will be saved without image/with previous image.`, variant: "destructive", duration: 9000 });
        // finalImageUrl remains as imageToSaveUrl or undefined
      }
    }
    
    const db = getFirestore(app, "poker");
    console.log("CreatePostPage: Firestore instance for 'poker' DB:", db?._databaseId?.projectId, db?._databaseId?.database);

    try {
      if (isEditMode && editPostId) {
        // Firestore Update Logic
        const postDocRef = doc(db, "posts", editPostId);
        await updateDoc(postDocRef, {
          content: data.postContent,
          image: finalImageUrl, // This will be the new URL if uploaded, or the existing one, or null
        });
        toast({ title: "Post Updated!", description: "Your changes have been saved to Firestore." });

        // Also update localStorage (temporary)
        const storedPostsString = localStorage.getItem(USER_POSTS_STORAGE_KEY);
        let posts: Post[] = storedPostsString ? JSON.parse(storedPostsString) : [];
        posts = posts.map(p => 
          p.id === editPostId ? { 
            ...p, 
            content: data.postContent, 
            image: finalImageUrl, 
            timestamp: new Date().toLocaleString() // Using client-side string for localStorage mock
          } : p
        );
        localStorage.setItem(USER_POSTS_STORAGE_KEY, JSON.stringify(posts));

      } else {
        // Firestore Add Logic
        const postDataForFirestore = {
          userId: currentUserAuth.uid,
          user: loggedInUserForPost,
          content: data.postContent,
          image: finalImageUrl || null,
          imageAiHint: selectedFile ? "user uploaded image" : undefined,
          likes: 0,
          likedByCurrentUser: false,
          comments: 0,
          commentTexts: [],
          shares: 0,
          createdAt: serverTimestamp(),
        };
        const docRef = await addDoc(collection(db, "posts"), postDataForFirestore);
        toast({ title: "Post Created!", description: "Your thoughts have been shared on Firestore." });
        
        // Also save to localStorage (temporary)
        const storedPostsString = localStorage.getItem(USER_POSTS_STORAGE_KEY);
        let posts: Post[] = storedPostsString ? JSON.parse(storedPostsString) : [];
        const newPostForLocalStorage: Post = {
            id: docRef.id, 
            userId: currentUserAuth.uid,
            user: loggedInUserForPost,
            content: data.postContent,
            image: finalImageUrl,
            imageAiHint: selectedFile ? "user uploaded image" : undefined,
            likes: 0,
            likedByCurrentUser: false,
            comments: 0,
            commentTexts: [],
            shares: 0,
            timestamp: new Date().toLocaleString(), // Client-side string for localStorage mock
            createdAt: new Date(), // Firestore uses serverTimestamp, localStorage uses client Date
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
      let firestoreErrorMessage = `Could not save post: ${error.message}`;
       if (error.message && (error.message.includes("firestore") || error.message.includes("Firestore") || error.message.includes("RPC") || (typeof error.code === 'string' && error.code.startsWith("permission-denied")) || error.code === 'unavailable' || error.code === 'unimplemented' || error.code === 'internal')) {
        firestoreErrorMessage = `Failed to save post to Firestore. Please ensure Firestore database ('poker') is correctly created, API enabled, and security rules are published in Firebase Console. Details: ${error.message}`;
      }
      toast({ title: "Firestore Error", description: firestoreErrorMessage, variant: "destructive", duration: 9000 });
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
                Images will be uploaded to Firebase Cloud Storage. Ensure your Firebase project (ID: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'Not Set'}) and Storage rules are configured.
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

    