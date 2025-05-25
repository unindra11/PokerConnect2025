
// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { LogInIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  // const [error, setError] = useState(""); // Future: for login error messages

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // setError(""); // Future: reset error on new submit

    if (emailOrUsername === "unindra111@gmail.com" && password === "qwerty") {
      console.log("Login successful!");
      router.push("/home");
    } else {
      console.log("Login failed: Invalid credentials");
      // setError("Invalid email or password."); // Future: show error to user
      // For now, just log and don't redirect if credentials don't match
      alert("Invalid email or password. Please use unindra111@gmail.com and qwerty");
    }
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
                placeholder="unindra111@gmail.com" 
                className="mt-1"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)} 
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="qwerty" 
                className="mt-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>
            {/* Future: Display error message
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            */}
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
