
// src/app/signup/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { UserPlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useJsApiLoader, Autocomplete } from "@react-google-maps/api";
import type { MockUserPin } from "@/app/(app)/map/page";
import { app, auth, firestore } from "@/lib/firebase";
import { createUserWithEmailAndPassword, type UserCredential, type AuthError } from "firebase/auth";
import { getFirestore, doc, setDoc, Timestamp, serverTimestamp } from "firebase/firestore";

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const libraries: ("places")[] = ['places'];

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [location, setLocation] = useState("");
  const [selectedLocationCoords, setSelectedLocationCoords] = useState<{ lat: number; lng: number } | null>(null);

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const locationInputRef = useRef<HTMLInputElement | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-signup-autocomplete-script', // Unique ID
    googleMapsApiKey: googleMapsApiKey || "",
    libraries,
  });

  useEffect(() => {
    if (!googleMapsApiKey) {
      console.warn("SignupPage: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set. Location autocomplete will be disabled.");
    }
    if (loadError) {
      console.error("SignupPage: Error loading Google Maps for Autocomplete", loadError);
      toast({
        title: "Location API Error",
        description: "Could not load location suggestions. Please enter manually.",
        variant: "default",
      });
    }
  }, [loadError, toast]);


  const onLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocompleteInstance;
    console.log("SignupPage: Google Maps Autocomplete instance loaded.");
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
          console.log("SignupPage: Selected location via Autocomplete:", place.formatted_address, "Coords:", coords);
        } else {
          setSelectedLocationCoords(null);
          console.warn("SignupPage: Autocomplete place selected, but no geometry/location data found.");
        }
      } else if (locationInputRef.current) {
        setLocation(locationInputRef.current.value);
        setSelectedLocationCoords(null);
        console.log("SignupPage: Location input changed manually:", locationInputRef.current.value);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (password !== confirmPassword) {
      toast({ title: "Signup Error", description: "Passwords do not match.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    if (!fullName || !email || !username || !password) {
      toast({ title: "Signup Error", description: "Please fill in all required fields.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    console.log("SignupPage: Attempting Firebase Auth signup for email:", email);
    try {
      const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("SignupPage: Firebase Auth signup successful. UID:", user.uid);

      const db = getFirestore(app, "poker"); // Explicitly get 'poker' DB instance
      console.log("SignupPage: Firestore instance for 'poker' DB:", db._databaseId.projectId, db._databaseId.database);


      const userProfile = {
        uid: user.uid,
        fullName: fullName,
        email: user.email,
        username: username,
        location: location,
        locationCoords: selectedLocationCoords,
        bio: "",
        avatar: "",
        coverImage: "",
        createdAt: serverTimestamp(),
      };

      console.log("SignupPage: Preparing to write to Firestore. UserProfile object:", userProfile);
      console.log("SignupPage: Firestore instance being used for setDoc:", db);
      if (db && db._databaseId && db._databaseId.database) {
        console.log("SignupPage: Firestore database ID for 'poker' DB:", db._databaseId.projectId, db._databaseId.database);
      } else {
        console.warn("SignupPage: Firestore instance _databaseId or its 'database' property is undefined.");
      }
      
      const userDocRef = doc(db, "users", user.uid);
      console.log("SignupPage: Attempting to write to Firestore path:", userDocRef.path);
      await setDoc(userDocRef, userProfile);
      console.log("SignupPage: User profile successfully written to Firestore for UID:", user.uid);

      const loggedInUserDetailsForStorage = {
        uid: user.uid,
        email: user.email,
        displayName: fullName,
        username: username,
        fullName: fullName,
        bio: userProfile.bio,
        avatar: userProfile.avatar,
        coverImage: userProfile.coverImage,
        location: userProfile.location,
        locationCoords: userProfile.locationCoords,
      };
      localStorage.setItem("loggedInUser", JSON.stringify(loggedInUserDetailsForStorage));

      if (selectedLocationCoords) {
        const initials = fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || username.substring(0,1).toUpperCase() || 'P';
        const mapUser: MockUserPin = {
          id: user.uid,
          username: username,
          name: fullName,
          avatar: `https://placehold.co/40x40.png?text=${initials}&c=${Math.random().toString(36).substring(7)}`,
          position: selectedLocationCoords,
          bio: userProfile.bio,
          coverImage: userProfile.coverImage,
        };

        const existingMapUsersString = localStorage.getItem("pokerConnectMapUsers");
        let mapUsers: MockUserPin[] = [];
        if (existingMapUsersString) {
          try { mapUsers = JSON.parse(existingMapUsersString); if (!Array.isArray(mapUsers)) mapUsers = []; }
          catch (parseError) { console.error("SignupPage: Error parsing pokerConnectMapUsers from localStorage:", parseError); mapUsers = []; }
        }
        mapUsers = mapUsers.filter(u => u.id !== mapUser.id); // Remove if already exists
        mapUsers.push(mapUser);
        localStorage.setItem("pokerConnectMapUsers", JSON.stringify(mapUsers));
        console.log("SignupPage: Added/Updated user in pokerConnectMapUsers localStorage:", mapUser);
      } else {
         toast({
          title: "Location Notice",
          description: "Location coordinates not available for map. User profile saved without precise map location.",
          variant: "default"
        })
      }

      toast({ title: "Signup Successful!", description: `Welcome, ${fullName}! Please log in.`, });
      router.push("/login");

    } catch (error: any) {
      console.error("SignupPage: Error during signup process:", error);
      let errorMessage = "Could not sign up. Please try again.";
      if (error.code) {
        switch (error.code) {
          case "auth/email-already-in-use":
            errorMessage = "This email is already in use. Please use a different email or log in.";
            break;
          case "auth/weak-password":
            errorMessage = "Password is too weak. Please choose a stronger password (min. 6 characters).";
            break;
          case "auth/invalid-email":
            errorMessage = "The email address is not valid.";
            break;
          default:
             if (error.message && (error.message.includes("firestore") || error.message.includes("Firestore") || error.message.includes("RPC") || (typeof error.code === 'string' && error.code.startsWith("permission-denied")) || error.code === 'unavailable' || error.code === 'unimplemented' || error.code === 'internal')) {
              errorMessage = `Failed to save profile. Please ensure Firestore database ('poker') is correctly created, API enabled, and security rules are published in Firebase Console. Details: ${error.message}`;
            } else {
              errorMessage = `An unexpected error occurred. Code: ${error.code || 'N/A'}, Message: ${error.message || 'Unknown error'}`;
            }
        }
      } else if (error.message) {
          errorMessage = `An unexpected error occurred: ${error.message}`;
      }
      toast({ title: "Signup Error", description: errorMessage, variant: "destructive", duration: 15000 });
    } finally {
      setIsLoading(false);
    }
  };

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
                placeholder="e.g., johnwick (no spaces)"
                className="mt-1"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="•••••••• (min. 6 characters)"
                className="mt-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
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
              <Label htmlFor="location">Location (Optional, select from suggestions for map)</Label>
              {(!googleMapsApiKey || loadError || !isLoaded) ? (
                <Input
                  id="location"
                  placeholder={!googleMapsApiKey ? "Location suggestions unavailable - API Key missing" : (loadError ? "Error loading suggestions, enter manually" : "Loading location suggestions...")}
                  className="mt-1"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setSelectedLocationCoords(null); // Clear coords if typing manually
                  }}
                  disabled={!googleMapsApiKey ? false : !isLoaded} // Only disable if API key is present but not loaded/errored
                />
              ) : (
                <Autocomplete
                  onLoad={onLoad}
                  onPlaceChanged={onPlaceChanged}
                  restrictions={{ country: "in" }} // Restrict to India
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
                      // If user types and doesn't select, clear coordinates
                      if (autocompleteRef.current && autocompleteRef.current.getPlace()?.formatted_address !== e.target.value) {
                          setSelectedLocationCoords(null);
                      }
                    }}
                    ref={locationInputRef}
                  />
                </Autocomplete>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full text-lg py-3" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-5 w-5" />}
              {isLoading ? "Signing Up..." : "Sign Up"}
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
