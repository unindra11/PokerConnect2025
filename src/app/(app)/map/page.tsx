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

// Custom map style for a professional look
const mapStyles = [
  {
    featureType: "all",
    elementType: "geometry",
    stylers: [{ color: "#e8ecef" }],
  },
  {
    featureType: "all",
    elementType: "labels.text.fill",
    stylers: [{ color: "#5c6b73" }],
  },
  {
    featureType: "all",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "all",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#d1d5d8" }],
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#f5f7fa" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#e8ecef" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#e4e8eb" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#d1d5d8" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#e8ecef" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#c9d7e0" }],
  },
];

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
  const [markerIcons, setMarkerIcons] = useState<{ [key: string]: string }>({});

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

  // Function to create a custom marker icon with avatar and pin
  const createCustomMarkerIcon = async (avatarUrl: string, userId: string) => {
    try {
      // Create a canvas to draw the custom marker
      const canvas = document.createElement("canvas");
      const size = 64; // Size of the marker
      canvas.width = size;
      canvas.height = size + 16; // Extra height for the pin
      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      // Draw the circular avatar
      const img = new Image();
      img.crossOrigin = "Anonymous";
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = avatarUrl;
      });

      // Create a circular clip path for the avatar
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // Draw the avatar image inside the circle
      ctx.drawImage(img, 0, 0, size, size);
      ctx.restore();

      // Draw a white border around the avatar
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.stroke();

      // Draw a small pin (triangle) below the avatar
      ctx.fillStyle = "#ff0000"; // Red pin
      ctx.beginPath();
      ctx.moveTo(size / 2, size); // Bottom center of avatar
      ctx.lineTo(size / 2 - 8, size + 16); // Left bottom of triangle
      ctx.lineTo(size / 2 + 8, size + 16); // Right bottom of triangle
      ctx.closePath();
      ctx.fill();

      // Convert canvas to data URL and store it
      const dataUrl = canvas.toDataURL("image/png");
      setMarkerIcons(prev => ({ ...prev, [userId]: dataUrl }));
    } catch (error) {
      console.error(`Error creating custom marker for user ${userId}:`, error);
    }
  };

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
            const userPin: MockUserPin = {
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
            };
            usersForMap.push(userPin);
            // Create custom marker icon for this user
            createCustomMarkerIcon(userPin.avatar, userPin.id);
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
              options={{
                zoomControl: true,
                mapId: "POKER_CONNECT_MAP_ID",
                styles: mapStyles, // Apply custom map styles
              }}
            >
              {mapMarkersData.map((user) => (
                <Marker
                  key={user.id}
                  position={user.position}
                  icon={{
                    url: markerIcons[user.id] || user.avatar,
                    scaledSize: new window.google.maps.Size(64, 80), // Size including the pin
                    anchor: new window.google.maps.Point(32, 80), // Anchor at the bottom center (tip of the pin)
                  }}
                  onClick={() => setSelectedUser(user)}
                />
              ))}

              {selectedUser && (
                <InfoWindow
                  position={selectedUser.position}
                  onCloseClick={() => setSelectedUser(null)}
                >
                  <div className="p-3 flex items-center space-x-4 bg-white rounded-lg shadow-md max-w-xs">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={selectedUser.avatar} alt={selectedUser.name} />
                      <AvatarFallback>{selectedUser.name.substring(0,1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold text-lg text-gray-800">{selectedUser.name}</p>
                      <p className="text-sm text-gray-500">{selectedUser.bio || "No bio available"}</p>
                      <Link
                        href={`/profile/${selectedUser.username}`}
                        className="text-sm text-primary font-medium hover:underline hover:text-primary-dark transition-colors"
                      >
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