
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2 } from "lucide-react";

export default function ForgotUsernamePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const storedUserString = localStorage.getItem("pokerConnectUser");
      if (storedUserString) {
        const storedUser = JSON.parse(storedUserString);
        if (storedUser.email === email) {
          toast({
            title: "Username Found (Simulated)",
            description: `Your username is: ${storedUser.username}. You can now log in.`,
            duration: 10000, 
          });
          router.push("/login");
        } else {
          toast({
            title: "User Not Found",
            description: "No user found with that email address. Please check and try again.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "User Not Found",
          description: "No user data found. Please sign up first.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error during username lookup simulation:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/50 p-4">
      <Card className="w-full max-w-md shadow-2xl rounded-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Forgot Username</CardTitle>
          <CardDescription className="text-md">
            Enter your email address to retrieve your username (simulated).
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="mt-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full text-lg py-3" disabled={isLoading}>
               {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-5 w-5" /> Find Username
                </>
              )}
            </Button>
            <Link href="/login" className="text-sm text-muted-foreground hover:text-primary hover:underline">
              Back to Login
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
