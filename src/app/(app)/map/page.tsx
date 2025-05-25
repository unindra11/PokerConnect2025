
"use client";

import { useState, useEffect } from "react";
import { GoogleMap, LoadScript, Marker, InfoWindow } from "@react-google-maps/api";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const containerStyle = {
  width: "100%",
  height: "600px",
};

const initialCenter = {
  lat: 28.6139, // New Delhi
  lng: 77.2090,
};

interface MockUserPin {
  id: string;
  username: string;
  name: string;
  avatar: string;
  position: { lat: number; lng: number };
  aiHint?: string;
}

const mockUsersData: MockUserPin[] = [
  {
    id: "mapuser1",
    username: "delhipokerstar",
    name: "Delhi Poker Star",
    avatar: "https://placehold.co/40x40.png?m=1&text=DP",
    position: { lat: 28.6139, lng: 77.2090 }, // Delhi
    aiHint: "poker player avatar",
  },
  {
    id: "mapuser2",
    username: "mumbaigambler",
    name: "Mumbai Gambler",
    avatar: "https://placehold.co/40x40.png?m=2&text=MG",
    position: { lat: 19.0760, lng: 72.8777 }, // Mumbai
    aiHint: "card player avatar",
  },
  {
    id: "mapuser3",
    username: "bangalorebluffer",
    name: "Bangalore Bluffer",
    avatar: "https://placehold.co/40x40.png?m=3&text=BB",
    position: { lat: 12.9716, lng: 77.5946 }, // Bangalore
    aiHint: "strategy gamer avatar",
  },
];

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

  console.log(
    `%cMapPage render: mapReady=${mapReady}, selectedUser=${selectedUser?.id || 'null'}`,
    'color: blue; font-weight: bold;'
  );


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
                onLoad={() => console.log("%cGoogleMap: component mounted (onLoad event).", 'color: purple;')}
                onUnmount={() => console.log("%cGoogleMap: component unmounted (onUnmount event).", 'color: red;')}
              >
                {mockUsersData.map((user) => {
                  console.log(`%cGoogleMap Child Loop: Rendering default marker for ${user.id}.`, 'color: teal');
                  return (
                    <Marker
                      key={user.id}
                      position={user.position}
                      onClick={() => {
                        console.log(`%cMarker Click: User ${user.id} clicked. Setting selectedUser.`, 'color: brown');
                        setSelectedUser(user);
                      }}
                      // No custom icon prop, so Google Maps uses its default red pin
                    />
                  );
                })}

                {selectedUser && (
                  <InfoWindow
                    position={selectedUser.position}
                    onCloseClick={() => {
                      console.log('%cInfoWindow: Close button clicked. Setting selectedUser to null.', 'color: brown');
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
            This map shows approximate locations of PokerConnect users in India. Click on a marker to see more details.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
