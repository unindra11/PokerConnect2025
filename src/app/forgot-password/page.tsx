
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
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

    // Simulate checking for user and sending email
    // In a real app, you wouldn't confirm if the email exists here for security.
    // You'd just say "If an account exists..." for any entered email.
    // We check localStorage for the prototype.
    try {
      const storedUserString = localStorage.getItem("pokerConnectUser");
      let userExists = false;
      if (storedUserString) {
        const storedUser = JSON.parse(storedUserString);
        if (storedUser.email === email) {
          userExists = true;
        }
      }
      
      // For prototype, we can be more direct. For production, always use the same message.
      if (userExists) {
         toast({
            title: "Password Reset Link Sent (Simulated)",
            description: `If an account exists for ${email}, a password reset link has been sent. Please check your inbox.`,
            duration: 7000,
          });
      } else {
         toast({
            title: "User Not Found (Simulated)",
            description: `No account found for ${email}. If you believe this is an error, please contact support. (For production, this message would be the same as above for security).`,
            variant: "destructive",
            duration: 7000,
          });
      }
      router.push("/login"); // Redirect to login after "sending"
    } catch (error) {
      console.error("Error during password reset simulation:", error);
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
          <CardTitle className="text-3xl font-bold text-primary">Forgot Password</CardTitle>
          <CardDescription className="text-md">
            Enter your email address and we'll send you a link to reset your password (simulated).
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
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-5 w-5" /> Send Reset Link
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
