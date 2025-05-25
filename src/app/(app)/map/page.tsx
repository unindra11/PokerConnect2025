
"use client";

import { useState, useEffect, useMemo } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api"; // Updated import
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react"; // For loading state

const containerStyle = {
  width: "100%",
  height: "600px",
};

const initialCenter = {
  lat: 22.9734, // Centered more broadly on India
  lng: 78.6569,
};

export interface MockUserPin {
  id: string;
  username: string;
  name: string;
  avatar: string;
  position: { lat: number; lng: number };
  aiHint?: string;
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

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script', // Optional: A specific ID for the script
    googleMapsApiKey: googleMapsApiKey || "", // Ensure API key is a string
    // libraries: ['places'], // Add any other libraries you need, e.g. 'places'
  });

  useEffect(() => {
    console.log("MapPage Mount: Initializing map data source determination.");
    try {
      const storedMapUsersString = localStorage.getItem("pokerConnectMapUsers");
      if (storedMapUsersString) {
        const storedMapUsers: MockUserPin[] = JSON.parse(storedMapUsersString);
        if (Array.isArray(storedMapUsers) && storedMapUsers.length > 0) {
          console.log("MapPage: Found users in localStorage. Using them for markers.", storedMapUsers);
          setMapMarkersData(storedMapUsers);
        } else {
          console.log("MapPage: localStorage users empty or invalid. Displaying an empty map.");
          setMapMarkersData([]);
        }
      } else {
        console.log("MapPage: No users in localStorage. Displaying an empty map.");
        setMapMarkersData([]);
      }
    } catch (error) {
      console.error("MapPage: Error reading map users from localStorage. Displaying an empty map.", error);
      setMapMarkersData([]);
    }
  }, []);

  useEffect(() => {
    console.log(
      `%cMapPage Update: isLoaded=${isLoaded}, selectedUser=${selectedUser?.id || 'null'}, markerCount=${mapMarkersData.length}`,
      'color: blue; font-weight: bold;'
    );
     if (loadError) {
      console.error("%cMapPage: Error loading Google Maps script via useJsApiLoader:", 'color: red; font-weight: bold;', loadError);
    }
  }, [isLoaded, selectedUser, mapMarkersData, loadError]);


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
              For now, this map feature cannot be displayed.
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
          <CardTitle>Interactive Player Map - India</CardTitle>
        </CardHeader>
        <CardContent>
          {!isLoaded ? (
            <div className="flex items-center justify-center h-[600px]">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="ml-4 text-lg">Loading Map...</p>
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
                    setSelectedUser(user);
                  }}
                  // Custom icons can be re-added here if stable
                />
              ))}

              {selectedUser && (
                <InfoWindow
                  position={selectedUser.position}
                  onCloseClick={() => {
                    setSelectedUser(null);
                  }}
                >
                  <div className="p-2 flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedUser.avatar} alt={selectedUser.name} data-ai-hint={selectedUser.aiHint || "profile picture"} />
                      <AvatarFallback>{selectedUser.name.substring(0,1)}</AvatarFallback>
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
          <p className="text-sm text-muted-foreground mt-4">
            {mapMarkersData.length > 0
              ? `This map shows approximate locations of ${mapMarkersData.length} PokerConnect user(s) across India. Click on a marker to see more details.`
              : "No signed-up users with location data to display on the map yet. Sign up to appear!"
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
