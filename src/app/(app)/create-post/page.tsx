// Using a server component for the page structure, form itself would be client for interactivity
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, Send } from "lucide-react";

// This would ideally be a client component for form handling
// For simplicity in this scaffold, it's a server component with static structure.
// To make it functional, convert to client component and use react-hook-form.

export default function CreatePostPage() {
  return (
    <div className="container mx-auto max-w-xl">
      <h1 className="text-3xl font-bold mb-6 text-center">Create New Post</h1>
      <Card className="shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle>Share Your Poker Story</CardTitle>
          <CardDescription>
            Post updates, ask questions, or share your experiences with the PokerConnect community.
          </CardDescription>
        </CardHeader>
        <form onSubmit={(e) => e.preventDefault()}> {/* Prevent default for demo */}
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="postContent">Your Thoughts</Label>
              <Textarea
                id="postContent"
                placeholder="What's on your mind? Share a hand, a strategy, or a recent win..."
                className="mt-1 min-h-[150px]"
              />
            </div>
            
            <div>
              <Label htmlFor="postImage">Add an Image (Optional)</Label>
              <div className="mt-1 flex items-center justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <ImagePlus className="mx-auto h-12 w-12 text-muted-foreground" />
                  <div className="flex text-sm text-muted-foreground">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                    >
                      <span>Upload a file</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
                </div>
              </div>
            </div>
            
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full">
              <Send className="mr-2 h-4 w-4" /> Post to Wall
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
