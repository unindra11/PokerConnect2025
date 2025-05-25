
// src/app/signup/page.tsx
"use client"; 

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { LoadScript, Autocomplete } from "@react-google-maps/api";
import type { MockUserPin } from "@/app/(app)/map/page";
import { auth, firestore } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const libraries: ("places")[] = ['places'];

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [location, setLocation] = useState("");
  const [selectedLocationCoords, setSelectedLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const locationInputRef = useRef<HTMLInputElement | null>(null);

  const onLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocompleteInstance;
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place && place.formatted_address) {
        setLocation(place.formatted_address);
        if (place.geometry?.location) {
          const coords = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };
          setSelectedLocationCoords(coords);
          console.log("Selected location coordinates:", coords);
        } else {
          setSelectedLocationCoords(null);
          console.warn("Autocomplete place selected, but no geometry/location data found.");
        }
      } else if (locationInputRef.current) {
        setLocation(locationInputRef.current.value);
        setSelectedLocationCoords(null); 
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Signup Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (!fullName || !email || !username || !password || !location) {
      toast({
        title: "Signup Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Store additional user info in Firestore
      const userProfile = {
        uid: user.uid,
        fullName,
        email, // Firebase Auth already stores email, but good to have in profile doc
        username,
        location, // Text location
        locationCoords: selectedLocationCoords, // Geocoded location if available
        bio: "", 
        avatar: "", // Placeholder, to be updated via Firebase Storage URL later
        coverImage: "", // Placeholder
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(firestore, "users", user.uid), userProfile);

      // Add to pokerConnectMapUsers in localStorage if coordinates exist
      if (selectedLocationCoords) {
        const initials = fullName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() || 'P';
        const mapUser: MockUserPin = { 
          id: user.uid, // Use Firebase UID for map user ID
          username: username,
          name: fullName,
          avatar: userProfile.avatar || `https://placehold.co/40x40.png?text=${initials}&c=${Math.random().toString(36).substring(7)}`,
          position: selectedLocationCoords,
          aiHint: "profile picture",
          bio: userProfile.bio,
          coverImage: userProfile.coverImage,
        };

        const existingMapUsersString = localStorage.getItem("pokerConnectMapUsers");
        let mapUsers: MockUserPin[] = [];
        if (existingMapUsersString) {
          try { mapUsers = JSON.parse(existingMapUsersString); if (!Array.isArray(mapUsers)) mapUsers = []; } 
          catch (parseError) { console.error("Error parsing map users:", parseError); mapUsers = []; }
        }
        mapUsers = mapUsers.filter(u => u.id !== mapUser.id);
        mapUsers.push(mapUser);
        localStorage.setItem("pokerConnectMapUsers", JSON.stringify(mapUsers));
        toast({
          title: "Signup Successful!",
          description: `Welcome, ${fullName}! Your location will be on the map. Please log in.`,
        });
      } else {
         toast({
          title: "Signup Successful (Location Note)",
          description: `Welcome, ${fullName}! Location coordinates not found, you might not appear on map. Please log in.`,
          duration: 7000, 
        });
      }
      router.push("/login");
    } catch (error: any) {
      console.error("Error signing up:", error);
      let errorMessage = "Could not sign up. Please try again.";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email is already in use. Please use a different email or log in.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please choose a stronger password.";
      }
      toast({
        title: "Signup Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!googleMapsApiKey) {
      console.warn("SignupPage: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set. Location autocomplete will be disabled.");
    }
  }, []);


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/50 p-4">
      <Card className="w-full max-w-md shadow-2xl rounded-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Create Your Account</CardTitle>
          <CardDescription className="text-md">
            Welcome to PokerConnect! Let's get you set up.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} className="p-2">
          <CardContent className="space-y-5">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input 
                id="fullName" 
                placeholder="e.g., John Wick" 
                className="mt-1"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
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
            <div>
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username" 
                placeholder="e.g., johnwick" 
                className="mt-1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                className="mt-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
             <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input 
                id="confirmPassword" 
                type="password" 
                placeholder="••••••••" 
                className="mt-1"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="location">Location (Select from suggestions for map)</Label>
              {googleMapsApiKey ? (
                <LoadScript
                  googleMapsApiKey={googleMapsApiKey}
                  libraries={libraries}
                  loadingElement={<Input placeholder="Loading location..." disabled className="mt-1" />}
                  onError={(error) => {
                    console.error("Error loading Google Maps for Autocomplete", error);
                    toast({
                      title: "Location Error",
                      description: "Could not load location suggestions. Please enter manually.",
                      variant: "destructive",
                    });
                  }}
                >
                  <Autocomplete
                    onLoad={onLoad}
                    onPlaceChanged={onPlaceChanged}
                    restrictions={{ country: "in" }} 
                    fields={["formatted_address", "geometry.location", "name"]}
                  >
                    <Input
                      id="location"
                      type="text"
                      placeholder="e.g., Mumbai, India"
                      className="mt-1"
                      value={location} 
                      onChange={(e) => {
                        setLocation(e.target.value);
                        setSelectedLocationCoords(null); 
                      }} 
                      ref={locationInputRef} 
                      required
                    />
                  </Autocomplete>
                </LoadScript>
              ) : (
                <Input 
                  id="location" 
                  placeholder="e.g., Mumbai, India (Location suggestions unavailable)" 
                  className="mt-1"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                />
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full text-lg py-3">
              <UserPlus className="mr-2 h-5 w-5" /> Sign Up
            </Button>
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Log In
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
