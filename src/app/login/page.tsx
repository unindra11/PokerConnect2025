'use client';

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useUser } from "@/context/UserContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const { loggedInUserDetails, isLoadingUserDetails } = useUser();

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "fetch-timeout") {
      toast({
        title: "Error",
        description: "Failed to load user data. Please check your connection and try again.",
        variant: "destructive",
      });
    }
  }, [searchParams, toast]);

  useEffect(() => {
    // Redirect to the home page after login details are fetched
    if (loggedInUserDetails && !isLoadingUserDetails) {
      console.log('LoginPage: User details fetched, redirecting to home page (/home)');
      router.push("/home");
    }
  }, [loggedInUserDetails, isLoadingUserDetails, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login attempt submitted.');
    console.log('Entered Email:', email);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Firebase Auth login successful for UID:', userCredential.user.uid);
      toast({ title: "Success", description: "Logged in successfully!" });
      // Note: The redirect is now handled by the useEffect above, after loggedInUserDetails is fetched
    } catch (error) {
      console.error('LoginPage: Error during login:', error);
      setError(error.message || "Invalid email or password. Please try again.");
      toast({
        title: "Error",
        description: "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Enter your credentials to access your account.</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button type="submit" className="w-full">Login</Button>
            <p className="text-sm text-muted-foreground">
              Don’t have an account?{" "}
              <Link href="/quiz" className="text-blue-500 hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}