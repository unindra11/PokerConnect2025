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
import { storage, app } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { addDoc, collection, serverTimestamp, doc, getDoc, updateDoc, Timestamp, getFirestore } from "firebase/firestore";
import { useUser } from "@/context/UserContext";

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const createPostSchema = z.object({
  postContent: z.string().min(1, "Post content cannot be empty.").max(1000, "Post content is too long."),
});

type CreatePostFormValues = z.infer<typeof createPostSchema>;

export default function CreatePostPage() {
  const { currentUserAuth, loggedInUserDetails, isLoadingAuth } = useUser();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editPostId = searchParams.get("editPostId");
  const isEditMode = !!editPostId;
  const redirectTo = searchParams.get("redirect") || "/community-wall";

  const [postToEdit, setPostToEdit] = useState<Post | null>(null);

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
        const firestore = getFirestore(app, "poker");
        try {
          const postDocRef = doc(firestore, "posts", editPostId);
          const postDocSnap = await getDoc(postDocRef);

          if (postDocSnap.exists()) {
            const postData = postDocSnap.data() as Omit<Post, 'id' | 'timestamp'>;
            const fetchedPost: Post = {
              id: postDocSnap.id,
              userId: postData.userId,
              user: postData.user,
              username: postData.username,
              content: postData.content,
              image: postData.image,
              imageAiHint: postData.imageAiHint,
              likes: postData.likes || 0,
              likedByCurrentUser: postData.likedByCurrentUser || false,
              comments: postData.comments || 0,
              commentTexts: postData.commentTexts || [],
              shares: postData.shares || 0,
              createdAt: postData.createdAt,
            };
            setPostToEdit(fetchedPost);
            form.setValue("postContent", fetchedPost.content);
            if (fetchedPost.image) {
              setPreviewUrl(fetchedPost.image);
            }
          } else {
            toast({ title: "Error", description: "Post not found for editing in Firestore.", variant: "destructive" });
            router.push("/my-posts");
          }
        } catch (error) {
          console.error("CreatePostPage: Error loading post for editing from Firestore:", error);
          toast({ title: "Error", description: "Could not load post data for editing.", variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      }
    };
    if (isEditMode && editPostId) {
      loadPostForEdit();
    }
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
        setPreviewUrl(postToEdit?.image || null);
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
        setPreviewUrl(postToEdit?.image || null);
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearMedia = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (postToEdit) {
      setPostToEdit(prev => prev ? { ...prev, image: undefined, imageAiHint: undefined } : null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit: SubmitHandler<CreatePostFormValues> = async (data) => {
    if (isLoadingAuth) {
      toast({ title: "Error", description: "Authentication is still loading. Please wait.", variant: "destructive" });
      return;
    }
    if (!currentUserAuth) {
      console.log('CreatePostPage: No authenticated user');
      toast({ title: "Authentication Error", description: "You must be logged in to create or edit a post.", variant: "destructive" });
      router.push("/login");
      return;
    }
    if (!loggedInUserDetails) {
      console.log('CreatePostPage: No user details available');
      toast({ title: "Error", description: "User details not loaded. Please try again.", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    const loggedInUserForPost: User = {
      name: loggedInUserDetails.fullName || loggedInUserDetails.username || "Anonymous",
      avatar: loggedInUserDetails.avatar || `https://placehold.co/100x100.png?text=${(loggedInUserDetails.username || "A").substring(0,1)}`,
      handle: loggedInUserDetails.username ? `@${loggedInUserDetails.username}` : `@${currentUserAuth.uid}`
    };

    let finalImageUrl: string | null = null;
    let finalImageAiHint: string | null = null;

    if (isEditMode && postToEdit && !selectedFile && previewUrl === null) {
      finalImageUrl = null;
      finalImageAiHint = null;
    } else if (isEditMode && postToEdit && !selectedFile && postToEdit.image) {
      finalImageUrl = postToEdit.image;
      finalImageAiHint = postToEdit.imageAiHint || null;
    }

    if (selectedFile) {
      const storageRefPath = `posts/${currentUserAuth.uid}/${Date.now()}_${selectedFile.name}`;
      const fileStorageRef = ref(storage, storageRefPath);
      const uploadTask = uploadBytesResumable(fileStorageRef, selectedFile);

      try {
        console.log(`CreatePostPage: Attempting to upload to Firebase Storage path: ${storageRefPath}`);
        await uploadTask;
        finalImageUrl = await getDownloadURL(uploadTask.snapshot.ref);
        finalImageAiHint = "user uploaded image";
        console.log("CreatePostPage: Firebase Storage upload successful. Download URL:", finalImageUrl);
      } catch (error: any) {
        console.error("CreatePostPage: Firebase Storage upload error:", error);
        toast({ title: "Upload Failed", description: `Could not upload image: ${error.message}. Post will proceed with previous or no image.`, variant: "destructive", duration: 9000 });
        if (isEditMode && postToEdit) {
          finalImageUrl = postToEdit.image || null;
          finalImageAiHint = postToEdit.imageAiHint || null;
        } else {
          finalImageUrl = null;
          finalImageAiHint = null;
        }
      }
    } else if (!isEditMode) {
      finalImageUrl = null;
      finalImageAiHint = null;
    }

    const firestore = getFirestore(app, "poker");

    const postDataForFirestore: Partial<Post> = {
      uid: currentUserAuth.uid, // Required by security rules
      userId: currentUserAuth.uid, // For consistency with HomePage and MyPostsPage
      user: loggedInUserForPost,
      username: loggedInUserDetails.username || "anonymous",
      content: data.postContent,
      image: finalImageUrl,
      imageAiHint: finalImageAiHint,
      likes: isEditMode && postToEdit ? postToEdit.likes : 0,
      likedByCurrentUser: isEditMode && postToEdit ? postToEdit.likedByCurrentUser : false,
      comments: isEditMode && postToEdit ? postToEdit.comments : 0,
      commentTexts: isEditMode && postToEdit ? postToEdit.commentTexts || [] : [],
      shares: isEditMode && postToEdit ? postToEdit.shares : 0,
    };

    console.log("CreatePostPage: Attempting to save to Firestore. Is Edit Mode:", isEditMode);
    console.log("CreatePostPage: Data for Firestore:", JSON.stringify(postDataForFirestore, null, 2));

    try {
      if (isEditMode && editPostId && postToEdit) {
        const postDocRef = doc(firestore, "posts", editPostId);
        const dataToUpdate: Partial<Post> = {
          ...postDataForFirestore,
          updatedAt: serverTimestamp(),
          createdAt: postToEdit.createdAt,
        };
        await updateDoc(postDocRef, dataToUpdate);
        console.log("CreatePostPage: Firestore post UPDATE successful for ID:", editPostId);
        toast({ title: "Post Updated!", description: "Your changes have been saved to Firestore." });
      } else {
        const docRef = await addDoc(collection(firestore, "posts"), {
          ...postDataForFirestore,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        console.log("CreatePostPage: Firestore post ADD successful. New Post ID:", docRef.id);
        toast({ title: "Post Created!", description: "Your thoughts have been shared on Firestore." });
      }

      form.reset();
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.push(redirectTo);
    } catch (error: any) {
      console.error("CreatePostPage: Error saving post to Firestore:", error);
      let firestoreErrorMessage = `Could not save post: ${error.message}`;
      if (error.message && (error.message.includes("firestore") || error.message.includes("Firestore") || error.message.includes("RPC") || (typeof error.code === 'string' && error.code.startsWith("permission-denied")) || error.code === 'unavailable' || error.code === 'unimplemented' || error.code === 'internal')) {
        firestoreErrorMessage = `Failed to save post to Firestore. Ensure Firestore is correctly set up (database instance created in 'poker', API enabled, and security rules published in Firebase Console for the 'posts' collection) and check console for details. Error: ${error.message}`;
      } else if (error.message && error.message.includes("Unsupported field value: undefined")) {
        firestoreErrorMessage = `Could not save post: One of the fields has an 'undefined' value which Firestore doesn't support. Please check all fields being saved. Details: ${error.message}`;
      }
      toast({ title: "Firestore Error", description: firestoreErrorMessage, variant: "destructive", duration: 15000 });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="container mx-auto max-w-xl text-center py-10">
        <p>Authenticating...</p>
      </div>
    );
  }

  if (!currentUserAuth) {
    return (
      <div className="container mx-auto max-w-xl text-center py-10">
        <Card className="shadow-lg rounded-xl p-6">
          <CardHeader>
            <CardTitle>Please Log In</CardTitle>
            <CardDescription>You need to be logged in to create a post.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/login")}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-h-60 rounded-md object-contain"
                        data-ai-hint={selectedFile ? "image preview" : (postToEdit?.imageAiHint || "image preview")}
                      />
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
                Images will be uploaded to Firebase Cloud Storage in your project '{process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'Not Set'}'.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading || isLoadingAuth}>
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