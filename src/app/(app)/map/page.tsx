
"use client";

import { useState, useEffect, useMemo } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import { app, auth } from "@/lib/firebase"; // Assuming 'auth' is exported for checking currentUser
import type { User as FirebaseUser } from "firebase/auth";

const containerStyle = {
  width: "100%",
  height: "600px",
};

// Centered broadly on India
const initialCenter = {
  lat: 22.9734,
  lng: 78.6569,
};

export interface MockUserPin {
  id: string; // UID
  username: string;
  name: string; // fullName
  avatar: string;
  position: { lat: number; lng: number };
  aiHint?: string;
  coverImage?: string;
  bio?: string;
}

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// COMMON ERROR: RefererNotAllowedMapError
// To fix this:
// 1. Go to Google Cloud Console > APIs & Services > Credentials.
// 2. Select your API key.
// 3. Under "Application restrictions", choose "HTTP referrers (web sites)".
// 4. Add the current development URL (e.g., https://YOUR_DEV_DOMAIN.cloudworkstations.dev/* or http://localhost:PORT/*)
// 5. Save changes. It might take a few minutes to propagate.

export default function MapPage() {
  const [selectedUser, setSelectedUser] = useState<MockUserPin | null>(null);
  const [mapMarkersData, setMapMarkersData] = useState<MockUserPin[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: googleMapsApiKey || "",
  });

  useEffect(() => {
    const fetchUsersFromFirestore = async () => {
      if (!currentUser) { // Only fetch if a user is logged in (due to security rules for reading users)
        setIsLoadingUsers(false);
        setMapMarkersData([]); // Clear markers if no user is logged in
        return;
      }
      setIsLoadingUsers(true);
      console.log("MapPage: Attempting to fetch users from Firestore.");
      try {
        const db = getFirestore(app, "poker");
        const usersCollectionRef = collection(db, "users");
        // Query all users. Ensure your Firestore rules allow this for authenticated users.
        const q = query(usersCollectionRef); 
        const querySnapshot = await getDocs(q);
        
        const usersForMap: MockUserPin[] = [];
        querySnapshot.forEach((doc) => {
          const userData = doc.data();
          // Check if user has locationCoords and they are valid
          if (userData.locationCoords && typeof userData.locationCoords.lat === 'number' && typeof userData.locationCoords.lng === 'number') {
            usersForMap.push({
              id: doc.id, // UID
              username: userData.username || "unknown_user",
              name: userData.fullName || userData.username || "Unknown User",
              avatar: userData.avatar || `https://placehold.co/40x40.png?text=${(userData.fullName || userData.username || "U").substring(0,1).toUpperCase()}`,
              position: {
                lat: userData.locationCoords.lat,
                lng: userData.locationCoords.lng,
              },
              bio: userData.bio,
              coverImage: userData.coverImage,
              aiHint: "map user profile",
            });
          }
        });
        setMapMarkersData(usersForMap);
        console.log(`MapPage: Fetched ${usersForMap.length} users from Firestore for map.`);
      } catch (error) {
        console.error("MapPage: Error fetching users from Firestore:", error);
        // Potentially a permissions error or Firestore not set up for 'poker' DB
        // For now, display an empty map on error
        setMapMarkersData([]);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    if (isLoaded && !loadError && googleMapsApiKey) {
        fetchUsersFromFirestore();
    } else if (!googleMapsApiKey || loadError) {
        setIsLoadingUsers(false); // Don't attempt to load users if map can't load
    }
  }, [isLoaded, loadError, googleMapsApiKey, currentUser]);


  useEffect(() => {
    console.log(
      `%cMapPage Update: isLoaded=${isLoaded}, selectedUser=${selectedUser?.id || 'null'}, markerCount=${mapMarkersData.length}, isLoadingUsers=${isLoadingUsers}`,
      'color: blue; font-weight: bold;'
    );
    if (loadError) {
      console.error("%cMapPage: Error loading Google Maps script via useJsApiLoader:", 'color: red; font-weight: bold;', loadError);
    }
  }, [isLoaded, selectedUser, mapMarkersData, loadError, isLoadingUsers]);


  if (!googleMapsApiKey) {
    console.error("MapPage: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set.");
    return (
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-6">Player Map</h1>
        <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle>Google Maps API Key Missing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">
              The Google Maps API key is not configured. Please set the{" "}
              <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> environment variable.
            </p>
            <p className="mt-2 text-muted-foreground">
              This map feature cannot be displayed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-6">Player Map</h1>
        <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle>Error Loading Map</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">
              Could not load the Google Maps script. Please check your API key, internet connection, and the browser console for more details.
            </p>
            <p className="text-xs text-muted-foreground mt-2">{loadError.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6">Player Map</h1>
      <Card className="shadow-lg rounded-xl overflow-hidden">
        <CardHeader>
          <CardTitle>Interactive Player Map - India (Users from Firestore)</CardTitle>
        </CardHeader>
        <CardContent>
          {!isLoaded || isLoadingUsers ? (
            <div className="flex items-center justify-center h-[600px]">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="ml-4 text-lg">{!isLoaded ? "Loading Map Script..." : "Loading Player Locations..."}</p>
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={initialCenter}
              zoom={5} 
              onLoad={(map) => console.log("%cGoogleMap: component mounted (onLoad event). Map instance:", 'color: purple;', map)}
              onUnmount={() => console.log("%cGoogleMap: component unmounted (onUnmount event).", 'color: red;')}
              options={{ zoomControl: true, mapId: "POKER_CONNECT_MAP_ID" }}
            >
              {mapMarkersData.map((user) => (
                <Marker
                  key={user.id}
                  position={user.position}
                  onClick={() => {
                    console.log(`Marker clicked: ${user.username}`);
                    setSelectedUser(user);
                  }}
                />
              ))}

              {selectedUser && (
                <InfoWindow
                  position={selectedUser.position}
                  onCloseClick={() => {
                    console.log("InfoWindow closed.");
                    setSelectedUser(null);
                  }}
                >
                  <div className="p-2 flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedUser.avatar} alt={selectedUser.name} data-ai-hint={selectedUser.aiHint || "profile picture"} />
                      <AvatarFallback>{selectedUser.name.substring(0,1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{selectedUser.name}</p>
                      <Link href={`/profile/${selectedUser.username}`} className="text-sm text-primary hover:underline">
                        View Profile
                      </Link>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          )}
          {!isLoadingUsers && (
            <p className="text-sm text-muted-foreground mt-4">
                {mapMarkersData.length > 0
                ? `This map shows approximate locations of ${mapMarkersData.length} PokerConnect user(s) across India who have shared their location (data from Firestore). Click on a marker to see more details.`
                : "No users with location data found in Firestore to display on the map. Sign up and select a location to appear!"
                }
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
