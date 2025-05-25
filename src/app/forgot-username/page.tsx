
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Search, KeyRound, UserCheck, Loader2 } from "lucide-react";

interface StoredUser {
  fullName: string;
  email: string;
  username: string;
  password?: string; // Assuming password might be there
  location?: string;
  bio?: string;
  avatar?: string;
  coverImage?: string;
}

export default function ForgotUsernamePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verifiedUserEmail, setVerifiedUserEmail] = useState<string | null>(null);


  const handleEmailVerification = (e: React.FormEvent<HTMLFormElement>) => {
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
        const storedUser: StoredUser = JSON.parse(storedUserString);
        if (storedUser.email === email) {
          setEmailVerified(true);
          setVerifiedUserEmail(storedUser.email); // Store the email of the user being modified
          toast({
            title: "Email Verified",
            description: "Please enter your new desired username below.",
          });
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
          description: "No user data found in local storage. Please sign up first.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error during email verification:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsernameChange = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!newUsername.trim()) {
      toast({
        title: "New Username Required",
        description: "Please enter your new username.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (!verifiedUserEmail) {
        toast({
            title: "Verification Error",
            description: "Email not verified. Please verify your email first.",
            variant: "destructive",
        });
        setIsLoading(false);
        return;
    }
    
    try {
      const storedUserString = localStorage.getItem("pokerConnectUser");
      if (storedUserString) {
        let storedUser: StoredUser = JSON.parse(storedUserString);
        // Ensure we are updating the correct user, although with current single-user storage, it's less critical
        if (storedUser.email === verifiedUserEmail) {
          const oldUsername = storedUser.username;
          storedUser.username = newUsername;
          localStorage.setItem("pokerConnectUser", JSON.stringify(storedUser));

          // Also update loggedInUser if it matches
          const loggedInUserString = localStorage.getItem("loggedInUser");
          if (loggedInUserString) {
            let loggedInUser: StoredUser = JSON.parse(loggedInUserString);
            if (loggedInUser.email === verifiedUserEmail) {
              loggedInUser.username = newUsername;
              localStorage.setItem("loggedInUser", JSON.stringify(loggedInUser));
            }
          }
          
          toast({
            title: "Username Changed Successfully!",
            description: `Your username has been changed from "${oldUsername}" to "${newUsername}". Please log in with your new username.`,
            duration: 7000,
          });
           toast({
            title: "Note on Data Associations",
            description: "Existing posts or map markers associated with your old username will not automatically update in this prototype.",
            variant: "default",
            duration: 10000,
          });
          router.push("/login");
        } else {
             toast({
                title: "Error",
                description: "Mismatch in verified user data. Please try the email verification again.",
                variant: "destructive",
            });
            setEmailVerified(false); // Reset verification
        }
      }
    } catch (error) {
      console.error("Error changing username:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while changing username. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/50 p-4">
      <Card className="w-full max-w-md shadow-2xl rounded-xl">
        {!emailVerified ? (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-primary">Forgot Username</CardTitle>
              <CardDescription className="text-md">
                Enter your email address to verify your account.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleEmailVerification}>
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
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-5 w-5" /> Verify Email
                    </>
                  )}
                </Button>
                <Link href="/login" className="text-sm text-muted-foreground hover:text-primary hover:underline">
                  Back to Login
                </Link>
              </CardFooter>
            </form>
          </>
        ) : (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-primary">Change Username</CardTitle>
              <CardDescription className="text-md">
                Email verified for {verifiedUserEmail}. Enter your new username.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleUsernameChange}>
              <CardContent className="space-y-5">
                <div>
                  <Label htmlFor="newUsername">New Username</Label>
                  <Input
                    id="newUsername"
                    type="text"
                    placeholder="Enter new username"
                    className="mt-1"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full text-lg py-3" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    <>
                      <UserCheck className="mr-2 h-5 w-5" /> Change Username
                    </>
                  )}
                </Button>
                 <Button variant="link" onClick={() => { setEmailVerified(false); setEmail(""); setVerifiedUserEmail(null); }} className="text-sm">
                    Use a different email?
                 </Button>
                <Link href="/login" className="text-sm text-muted-foreground hover:text-primary hover:underline">
                  Back to Login
                </Link>
              </CardFooter>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}

