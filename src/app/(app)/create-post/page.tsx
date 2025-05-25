
"use client";

import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input"; // Added for file input styling
import { ImagePlus, Send, VideoIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

const createPostSchema = z.object({
  postContent: z.string().min(1, "Post content cannot be empty.").max(1000, "Post content is too long."),
  mediaFile: z.any().optional(), // Handle file validation separately if needed
});

type CreatePostFormValues = z.infer<typeof createPostSchema>;

export default function CreatePostPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<CreatePostFormValues>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      postContent: "",
    },
  });

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
    console.log("Creating post with data:", data);
    console.log("Selected file:", selectedFile);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    toast({
      title: "Post Created!",
      description: "Your thoughts have been shared with the community.",
    });
    
    // Reset form and state
    form.reset();
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsLoading(false);
    
    // For now, redirect to home page after posting
    router.push("/home"); 
  };

  return (
    <div className="container mx-auto max-w-xl">
      <Card className="shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Share Your Poker Story</CardTitle>
          <CardDescription>
            Post updates, ask questions, or share your experiences with the PokerConnect community.
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
                          accept="image/*,video/*" // Accept images and videos
                          onChange={handleFileChange} 
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-muted-foreground">PNG, JPG, GIF, MP4, MOV up to 50MB</p>
                  </div>
                )}
                {previewUrl && selectedFile && (
                  <div className="mt-2 text-center">
                    {selectedFile.type.startsWith("image/") ? (
                      <img src={previewUrl} alt="Preview" className="max-h-60 rounded-md mx-auto" />
                    ) : selectedFile.type.startsWith("video/") ? (
                      <video src={previewUrl} controls className="max-h-60 rounded-md mx-auto" />
                    ) : (
                       <div className="p-4 bg-muted rounded-md text-sm">
                         <p>Cannot preview this file type.</p>
                         <p>{selectedFile.name}</p>
                       </div>
                    )}
                    <Button variant="link" size="sm" onClick={() => {setSelectedFile(null); setPreviewUrl(null); (document.getElementById('mediaFile-upload') as HTMLInputElement).value = '';}} className="mt-2 text-destructive">
                      Remove file
                    </Button>
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
                  Posting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" /> Post to Wall
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
