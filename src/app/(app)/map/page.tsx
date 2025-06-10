"use client";

import { useState, useEffect, useMemo } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import Link from "next/link";
import { Inter } from '@next/font/google';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import { app, auth } from "@/lib/firebase";
import type { User as FirebaseUser } from "firebase/auth";

// Configure Inter font
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const containerStyle = {
  width: "100%",
  height: "600px",
};

// Centered on Chandigarh (near clerk123 and roma123)
const initialCenter = {
  lat: 30.73,
  lng: 76.779,
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
const libraries: ("places")[] = ['places'];

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
    libraries,
  });

  useEffect(() => {
    const fetchUsersFromFirestore = async () => {
      if (!currentUser) {
        setIsLoadingUsers(false);
        setMapMarkersData([]);
        return;
      }
      setIsLoadingUsers(true);
      try {
        const db = getFirestore(app, "poker");
        const usersCollectionRef = collection(db, "users");
        const q = query(usersCollectionRef);
        const querySnapshot = await getDocs(q);
        
        const usersForMap: MockUserPin[] = [];
        querySnapshot.forEach((docSnap) => {
          const userData = docSnap.data();
          const userId = docSnap.id;
          
          if (userData.locationCoords && typeof userData.locationCoords.lat === 'number' && typeof userData.locationCoords.lng === 'number') {
            usersForMap.push({
              id: docSnap.id,
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
      } catch (error) {
        console.error("Error fetching users from Firestore:", error);
        setMapMarkersData([]);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    if (isLoaded && !loadError && googleMapsApiKey && currentUser !== undefined) {
        fetchUsersFromFirestore();
    } else if (!googleMapsApiKey || loadError) {
        setIsLoadingUsers(false);
    }
  }, [isLoaded, loadError, googleMapsApiKey, currentUser]);

  if (!googleMapsApiKey) {
    return (
      <div className={`${inter.className} container mx-auto`}>
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
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`${inter.className} container mx-auto`}>
        <h1 className="text-3xl font-bold mb-6">Player Map</h1>
        <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle>Error Loading Map</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">
              Could not load the Google Maps script. Please check your API key.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`${inter.className} container mx-auto`}>
      <h1 className="text-3xl font-bold mb-6">Player Map</h1>
      <Card className="shadow-lg rounded-xl overflow-hidden">
        <CardHeader>
          <CardTitle>Interactive Player Map</CardTitle>
        </CardHeader>
        <CardContent>
          {!isLoaded || isLoadingUsers ? (
            <div className="flex items-center justify-center h-[600px]">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="ml-4 text-lg">
                {!isLoaded ? "Loading Map Script..." : "Loading Player Locations..."}
              </p>
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={initialCenter}
              zoom={14}
              options={{ zoomControl: true, mapId: "POKER_CONNECT_MAP_ID" }}
            >
              {mapMarkersData.map((user) => (
                <Marker
                  key={user.id}
                  position={user.position}
                  onClick={() => setSelectedUser(user)}
                />
              ))}

              {selectedUser && (
                <InfoWindow
                  position={selectedUser.position}
                  onCloseClick={() => setSelectedUser(null)}
                >
                  <div className="p-2 flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedUser.avatar} alt={selectedUser.name} />
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
                ? `Showing ${mapMarkersData.length} user(s)`
                : "No users with location data found"}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}