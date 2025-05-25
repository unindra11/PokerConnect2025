// src/app/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { LogInIcon, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Login attempt submitted.");
    console.log("Entered Email/Username:", emailOrUsername);
    console.log("Entered Password:", password);

    let loginSuccess = false;
    let loggedInUser = null;

    // Try to get user from localStorage
    try {
      const storedUserString = localStorage.getItem("pokerConnectUser");
      if (storedUserString) {
        const storedUser = JSON.parse(storedUserString);
        if (
          (storedUser.email === emailOrUsername || storedUser.username === emailOrUsername) &&
          storedUser.password === password
        ) {
          loginSuccess = true;
          loggedInUser = storedUser;
          console.log("Login successful with localStorage user:", storedUser.username);
        }
      }
    } catch (error) {
      console.error("Error reading from localStorage:", error);
    }

    // Fallback to hardcoded admin user if localStorage login failed
    if (!loginSuccess) {
      if (emailOrUsername === "unindra111@gmail.com" && password === "qwerty") {
        loginSuccess = true;
        loggedInUser = { 
          fullName: "Player One", 
          email: "unindra111@gmail.com", 
          username: "playerone_admin" // or some admin username
        }; // Mock admin user object
        console.log("Login successful with hardcoded admin user.");
      }
    }

    if (loginSuccess && loggedInUser) {
      try {
        localStorage.setItem("loggedInUser", JSON.stringify(loggedInUser));
      } catch (error) {
        console.error("Error saving loggedInUser to localStorage:", error);
        // Non-critical error, proceed with login
      }
      toast({
        title: "Login Successful!",
        description: `Welcome back, ${loggedInUser.fullName || loggedInUser.username}!`,
      });
      router.push("/home");
    } else {
      console.log("Login failed: Invalid credentials entered.");
      toast({
        title: "Login Failed",
        description: "Invalid email/username or password. Please try again.",
        variant: "destructive",
      });
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
              <Label htmlFor="emailOrUsername">Email or Username</Label>
              <Input
                id="emailOrUsername"
                placeholder="Your email or username"
                className="mt-1"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
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
            <Button type="submit" className="w-full text-lg py-3">
              <LogInIcon className="mr-2 h-5 w-5" /> Log In
            </Button>
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                Sign Up
              </Link>
            </p>
             <Link href="#" className="text-sm text-muted-foreground hover:text-primary hover:underline">
                Forgot Password?
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
