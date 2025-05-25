
// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { LogInIcon, Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { auth, firestore } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [emailOrUsername, setEmailOrUsername] = useState(""); // For simplicity, we'll assume users log in with email
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    console.log("Login attempt submitted.");
    console.log("Entered Email:", emailOrUsername); // Assuming email for login

    try {
      const userCredential = await signInWithEmailAndPassword(auth, emailOrUsername, password);
      const user = userCredential.user;
      console.log("Firebase Auth login successful for UID:", user.uid);

      // Fetch user profile from Firestore
      const userDocRef = doc(firestore, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userProfileData = userDocSnap.data();
        const loggedInUserDetails = {
          uid: user.uid,
          email: user.email, // From Firebase Auth
          displayName: userProfileData.fullName || userProfileData.username, // Use fullName as displayName
          username: userProfileData.username,
          fullName: userProfileData.fullName,
          bio: userProfileData.bio,
          avatar: userProfileData.avatar,
          coverImage: userProfileData.coverImage,
          location: userProfileData.location,
          locationCoords: userProfileData.locationCoords,
        };
        localStorage.setItem("loggedInUser", JSON.stringify(loggedInUserDetails));
        console.log("User profile fetched from Firestore and saved to localStorage:", loggedInUserDetails);
        toast({
          title: "Login Successful!",
          description: `Welcome back, ${loggedInUserDetails.displayName}!`,
        });
        router.push("/home");
      } else {
        console.warn("User profile not found in Firestore for UID:", user.uid);
        // Handle case where user exists in Auth but not Firestore (e.g., incomplete signup)
        // For now, store basic auth info and proceed
        const basicUserDetails = {
          uid: user.uid,
          email: user.email,
          displayName: user.email, // Fallback
        };
        localStorage.setItem("loggedInUser", JSON.stringify(basicUserDetails));
        toast({
          title: "Login Successful (Profile Incomplete)",
          description: `Welcome back, ${user.email}! Your profile details are being set up.`,
        });
        router.push("/home");
      }
    } catch (error: any) {
      console.error("Error logging in with Firebase Auth:", error);
      let errorMessage = "Invalid email or password. Please try again.";
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        errorMessage = "Invalid email or password.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      }
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/50 p-4">
      <Card className="w-full max-w-md shadow-2xl rounded-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Welcome Back!</CardTitle>
          <CardDescription className="text-md">
            Log in to your PokerConnect account.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} className="p-2">
          <CardContent className="space-y-5">
            <div>
              <Label htmlFor="emailOrUsername">Email</Label>
              <Input
                id="emailOrUsername"
                type="email" // Assuming login with email
                placeholder="Your email"
                className="mt-1"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Your password"
                  className="pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute inset-y-0 right-0 h-full px-3 text-muted-foreground hover:text-primary"
                  onClick={togglePasswordVisibility}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full text-lg py-3" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging In...
                </>
              ) : (
                <>
                  <LogInIcon className="mr-2 h-5 w-5" /> Log In
                </>
              )}
            </Button>
            <div className="flex justify-between w-full text-sm">
              <Link href="/forgot-username" className="text-muted-foreground hover:text-primary hover:underline">
                Forgot Username?
              </Link>
              <Link href="/forgot-password" className="text-muted-foreground hover:text-primary hover:underline">
                Forgot Password?
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Don't have an account?{" "}
              <Link href="/quiz" className="text-primary hover:underline">
                Sign Up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
