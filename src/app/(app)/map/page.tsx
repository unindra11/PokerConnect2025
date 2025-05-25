
"use client";

import { useState, useEffect, useMemo } from "react";
import { GoogleMap, LoadScript, Marker, InfoWindow } from "@react-google-maps/api";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const containerStyle = {
  width: "100%",
  height: "600px",
};

const initialCenter = {
  lat: 22.9734, // Centered more broadly on India
  lng: 78.6569,
};

export interface MockUserPin { // Exporting for use in signup page
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
  const [mapReady, setMapReady] = useState(false);
  const [mapMarkersData, setMapMarkersData] = useState<MockUserPin[]>([]); // Initialize with empty array

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
          setMapMarkersData([]); // Ensure it's an empty array
        }
      } else {
        console.log("MapPage: No users in localStorage. Displaying an empty map.");
        setMapMarkersData([]); // Ensure it's an empty array
      }
    } catch (error) {
      console.error("MapPage: Error reading map users from localStorage. Displaying an empty map.", error);
      setMapMarkersData([]); // Ensure it's an empty array on error
    }
  }, []);

  // Enhanced console logging
  useEffect(() => {
    console.log(
      `%cMapPage Update: mapReady=${mapReady}, selectedUser=${selectedUser?.id || 'null'}, markerCount=${mapMarkersData.length}`,
      'color: blue; font-weight: bold;'
    );
  }, [mapReady, selectedUser, mapMarkersData]);


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

  console.log("MapPage: Rendering LoadScript component.");
  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6">Player Map</h1>
      <Card className="shadow-lg rounded-xl overflow-hidden">
        <CardHeader>
          <CardTitle>Interactive Player Map - India</CardTitle>
        </CardHeader>
        <CardContent>
          <LoadScript 
            googleMapsApiKey={googleMapsApiKey}
            onLoad={() => {
              console.log("%cLoadScript: Google Maps API script loaded successfully. Setting mapReady=true", 'color: green; font-weight: bold;');
              setMapReady(true);
            }}
            onError={(error) => {
                console.error("%cLoadScript: Error loading Google Maps script:", 'color: red; font-weight: bold;', error);
                console.log("%cLoadScript: Setting mapReady=false due to error.", 'color: red;');
                setMapReady(false); 
            }}
            loadingElement={<div style={{ height: "100%" }}>Loading map...</div>}
          >
            {mapReady && (
              <GoogleMap
                mapContainerStyle={containerStyle}
                center={initialCenter}
                zoom={5} 
                onLoad={(map) => console.log("%cGoogleMap: component mounted (onLoad event). Map instance:", 'color: purple;', map)}
                onUnmount={() => console.log("%cGoogleMap: component unmounted (onUnmount event).", 'color: red;')}
                options={{ zoomControl: true, mapId: "POKER_CONNECT_MAP_ID" }} // Added mapId for potential advanced styling later
              >
                {mapMarkersData.map((user) => {
                  // console.log(`%cGoogleMap Child Loop: Rendering default marker for ${user.id} at ${user.position.lat},${user.position.lng}.`, 'color: teal');
                  return (
                    <Marker
                      key={user.id}
                      position={user.position}
                      onClick={() => {
                        // console.log(`%cMarker Click: User ${user.id} clicked. Setting selectedUser.`, 'color: brown');
                        setSelectedUser(user);
                      }}
                    />
                  );
                })}

                {selectedUser && (
                  <InfoWindow
                    position={selectedUser.position}
                    onCloseClick={() => {
                      // console.log('%cInfoWindow: Close button clicked. Setting selectedUser to null.', 'color: brown');
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
          </LoadScript>
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
