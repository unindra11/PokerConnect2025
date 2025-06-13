"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { UserPlus, Loader2, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import type { MockUserPin } from "@/app/(app)/map/page";
import { app, auth, firestore as db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, type UserCredential } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Country, State, City } from "country-state-city";

// Fetch countries, states, and cities using country-state-city
const countries = Country.getAllCountries().map((country) => ({
  name: country.name,
  code: country.isoCode,
})).sort((a, b) => a.name.localeCompare(b.name));

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedLocationCoords, setSelectedLocationCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Derived states and cities based on selections
  const states = selectedCountry
    ? State.getStatesOfCountry(
        countries.find((c) => c.name === selectedCountry)?.code || ""
      ).map((state) => state.name).sort((a, b) => a.localeCompare(b))
    : [];

  const cities = selectedCountry && selectedState
    ? City.getCitiesOfState(
        countries.find((c) => c.name === selectedCountry)?.code || "",
        State.getStatesOfCountry(countries.find((c) => c.name === selectedCountry)?.code || "")
          .find((s) => s.name === selectedState)?.isoCode || ""
      ).map((city) => city.name).sort((a, b) => a.localeCompare(b))
    : [];

  useEffect(() => {
    const firestoreInstance = getFirestore(app, "poker");
    console.log("SignupPage: Firestore object on mount:", firestoreInstance);
  }, []);

  const handleGetDeviceLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation Not Supported",
        description: "Your browser does not support geolocation.",
        variant: "destructive",
      });
      return;
    }

    setIsFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setSelectedLocationCoords(coords);
        toast({
          title: "Location Retrieved",
          description: "Your current coordinates have been set.",
        });
        setIsFetchingLocation(false);
        console.log("SignupPage: Fetched device location:", coords);
      },
      (error) => {
        console.error("Error getting geolocation:", error);
        let description = "Could not retrieve your location.";
        if (error.code === error.PERMISSION_DENIED) {
          description = "Permission denied. Please enable location services for this site.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          description = "Location information is unavailable.";
        } else if (error.code === error.TIMEOUT) {
          description = "The request to get user location timed out.";
        }
        toast({
          title: "Geolocation Error",
          description,
          variant: "destructive",
        });
        setIsFetchingLocation(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    console.log("SignupPage: Attempting Firebase Auth signup for email:", email);

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

    if (!selectedCountry || !selectedState || !selectedCity) {
      toast({ title: "Signup Error", description: "Please select your country, state, and city.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    try {
      const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("SignupPage: Firebase Auth signup successful. UID:", user.uid);

      const userProfile = {
        uid: user.uid,
        fullName: fullName,
        email: user.email,
        username: username,
        location: { country: selectedCountry, state: selectedState, city: selectedCity },
        locationCoords: selectedLocationCoords,
        bio: "",
        avatar: "",
        coverImage: "",
        createdAt: serverTimestamp(),
      };

      console.log("SignupPage: Preparing to write to Firestore. UserProfile object:", userProfile);

      const firestoreDb = getFirestore(app, "poker");
      console.log("SignupPage: Firestore instance being used for setDoc:", firestoreDb);
      console.log("SignupPage: Firestore database ID for 'poker' DB:", firestoreDb.app.options.projectId, firestoreDb.app.name === "[DEFAULT]" ? "(default)" : firestoreDb.app.name);

      const userDocRefPath = `users/${user.uid}`;
      console.log("SignupPage: Attempting to write to Firestore path:", userDocRefPath);
      await setDoc(doc(firestoreDb, "users", user.uid), userProfile);
      console.log(`SignupPage: User profile successfully written to Firestore for UID: ${user.uid}`);

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
        mapUsers = mapUsers.filter(u => u.id !== mapUser.id);
        mapUsers.push(mapUser);
        localStorage.setItem("pokerConnectMapUsers", JSON.stringify(mapUsers));
        console.log("SignupPage: Added/Updated user in pokerConnectMapUsers localStorage:", mapUser);
      } else {
        toast({
          title: "Location Notice",
          description: "Location coordinates not available for map. User profile saved without precise map location.",
          variant: "default",
        });
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
            <div className="space-y-4">
              <div>
                <Label htmlFor="country">Country</Label>
                <Select onValueChange={(value) => {
                  setSelectedCountry(value);
                  setSelectedState(""); // Reset state and city when country changes
                  setSelectedCity("");
                }}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.code} value={country.name}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Select
                  onValueChange={(value) => {
                    setSelectedState(value);
                    setSelectedCity(""); // Reset city when state changes
                  }}
                  disabled={!selectedCountry}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={selectedCountry ? "Select a state" : "Select a country first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Select
                  onValueChange={setSelectedCity}
                  disabled={!selectedState}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={selectedState ? "Select a city" : "Select a state first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGetDeviceLocation}
                disabled={isFetchingLocation}
              >
                {isFetchingLocation ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="mr-2 h-4 w-4" />
                )}
                {isFetchingLocation ? "Fetching Coordinates..." : "Get My Coordinates"}
              </Button>
              {selectedLocationCoords && (
                <p className="text-xs text-muted-foreground">
                  Coordinates: Lat: {selectedLocationCoords.lat.toFixed(4)}, Lng: {selectedLocationCoords.lng.toFixed(4)}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full text-lg py-3" disabled={isLoading || isFetchingLocation}>
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