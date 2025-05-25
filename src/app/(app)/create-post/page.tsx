
"use client";

import { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ImagePlus, Send, Edit, Loader2, X } from "lucide-react"; // Added X
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";

const createPostSchema = z.object({
  postContent: z.string().min(1, "Post content cannot be empty.").max(1000, "Post content is too long."),
  mediaFile: z.any().optional(),
});

type CreatePostFormValues = z.infer<typeof createPostSchema>;

export default function CreatePostPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const editPostId = searchParams.get("editPostId");
  const editContent = searchParams.get("editContent");
  const editImage = searchParams.get("editImage"); 
  const isEditMode = !!editPostId;

  const form = useForm<CreatePostFormValues>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      postContent: "",
    },
  });

  useEffect(() => {
    if (isEditMode && editContent) {
      form.setValue("postContent", decodeURIComponent(editContent));
    }
    if (isEditMode && editImage) {
        setPreviewUrl(decodeURIComponent(editImage));
    }
  }, [isEditMode, editContent, editImage, form]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  const onSubmit: SubmitHandler<CreatePostFormValues> = async (data) => {
    setIsLoading(true);
    console.log(isEditMode ? "Updating post with data:" : "Creating post with data:", data);
    console.log("Selected file:", selectedFile);
    console.log("Post ID (if editing):", editPostId);

    await new Promise(resolve => setTimeout(resolve, 1500));

    toast({
      title: isEditMode ? "Post Updated!" : "Post Created!",
      description: isEditMode ? "Your changes have been saved." : "Your thoughts have been shared with the community.",
    });
    
    form.reset();
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsLoading(false);
    
    router.push(isEditMode ? "/my-posts" : "/home"); 
  };

  return (
    <div className="container mx-auto max-w-xl">
      <Card className="shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl">{isEditMode ? "Edit Your Post" : "Share Your Poker Story"}</CardTitle>
          <CardDescription>
            {isEditMode ? "Make changes to your post below." : "Post updates, ask questions, or share your experiences with the PokerConnect community."}
          </CardDescription>
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
              <Label htmlFor="mediaFile">Add Image or Video (Optional)</Label>
              <div className="mt-2 flex flex-col items-center justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md hover:border-primary transition-colors">
                {!previewUrl && (
                  <div className="space-y-1 text-center">
                    <ImagePlus className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div className="flex text-sm text-muted-foreground">
                      <label
                        htmlFor="mediaFile-upload"
                        className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                      >
                        <span>Upload a file</span>
                        <Input 
                          id="mediaFile-upload" 
                          type="file" 
                          className="sr-only"
                          accept="image/*,video/*"
                          onChange={handleFileChange} 
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-muted-foreground">PNG, JPG, GIF, MP4, MOV up to 50MB</p>
                  </div>
                )}
                {previewUrl && (
                  <div className="mt-2 w-full flex justify-center">
                    <div className="relative inline-block"> {/* Wrapper for preview and X button */}
                      {selectedFile?.type.startsWith("image/") || (previewUrl && !selectedFile && editImage?.match(/\.(jpeg|jpg|gif|png)$/) != null) ? (
                        <img src={previewUrl} alt="Preview" className="max-h-60 rounded-md" data-ai-hint="image preview" />
                      ) : selectedFile?.type.startsWith("video/") || (previewUrl && !selectedFile && editImage?.match(/\.(mp4|mov|avi)$/) != null) ? (
                        <video src={previewUrl} controls className="max-h-60 rounded-md" data-ai-hint="video preview" />
                      ) : selectedFile ? (
                         <div className="p-4 bg-muted rounded-md text-sm max-h-60 w-full text-left">
                           <p>Cannot preview this file type.</p>
                           <p className="truncate">{selectedFile.name}</p>
                         </div>
                      ) : ( // If previewUrl exists but not selectedFile (i.e. from editImage) and not image/video
                          <div className="p-4 bg-muted rounded-md text-sm max-h-60 w-full text-left">
                           <p>Preview for existing media (if any).</p>
                           <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View media</a>
                         </div>
                      )}

                      {/* X button to remove media */}
                      {(selectedFile || (isEditMode && editImage && previewUrl)) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                              setSelectedFile(null);
                              setPreviewUrl(null);
                              (document.getElementById('mediaFile-upload') as HTMLInputElement).value = '';
                              if (isEditMode && editImage) {
                                  router.replace(`/create-post?editPostId=${editPostId}&editContent=${encodeURIComponent(form.getValues("postContent"))}`);
                              }
                          }}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 p-1 rounded-full h-6 w-6 z-10"
                          aria-label="Remove media"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
