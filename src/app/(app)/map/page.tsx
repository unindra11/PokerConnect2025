
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
  lat: 22.9734, // Centered more broadly on India
  lng: 78.6569,
};

interface MockUserPin {
  id: string;
  username: string;
  name: string;
  avatar: string;
  position: { lat: number; lng: number };
  aiHint?: string;
}

const indianCities = [
  { name: "Delhi", lat: 28.6139, lng: 77.2090 },
  { name: "Mumbai", lat: 19.0760, lng: 72.8777 },
  { name: "Bangalore", lat: 12.9716, lng: 77.5946 },
  { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
  { name: "Chennai", lat: 13.0827, lng: 80.2707 },
  { name: "Hyderabad", lat: 17.3850, lng: 78.4867 },
  { name: "Pune", lat: 18.5204, lng: 73.8567 },
  { name: "Ahmedabad", lat: 23.0225, lng: 72.5714 },
  { name: "Jaipur", lat: 26.9124, lng: 75.7873 },
  { name: "Lucknow", lat: 26.8467, lng: 80.9462 },
  { name: "Chandigarh", lat: 30.7333, lng: 76.7794 },
  { name: "Bhopal", lat: 23.2599, lng: 77.4126 },
  { name: "Kochi", lat: 9.9312, lng: 76.2673 },
  { name: "Guwahati", lat: 26.1445, lng: 91.7362 },
  { name: "Bhubaneswar", lat: 20.2961, lng: 85.8245 },
  { name: "Patna", lat: 25.5941, lng: 85.1376 },
  { name: "Indore", lat: 22.7196, lng: 75.8577 },
  { name: "Nagpur", lat: 21.1458, lng: 79.0882 },
  { name: "Srinagar", lat: 34.0837, lng: 74.7973 },
  { name: "Visakhapatnam", lat: 17.6868, lng: 83.2185 }
];

const firstNames = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Krishna", "Ishaan", "Ananya", "Diya", "Saanvi", "Aanya", "Myra", "Aarohi", "Pari", "Khushi", "Riya"];
const lastNames = ["Sharma", "Verma", "Gupta", "Singh", "Kumar", "Patel", "Reddy", "Shah", "Das", "Jain", "Mehta", "Rao", "Iyer", "Menon", "Nair"];


const mockUsersData: MockUserPin[] = [];
let userCounter = 1;
for (let i = 0; i < 100; i++) {
  const city = indianCities[i % indianCities.length];
  const randomOffsetLat = (Math.random() - 0.5) * 0.1; // Small offset for variety
  const randomOffsetLng = (Math.random() - 0.5) * 0.1;
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const name = `${firstName} ${lastName}`;
  const username = `${firstName.toLowerCase()}${city.name.substring(0,3).toLowerCase()}${userCounter}`;

  mockUsersData.push({
    id: `mapuser${userCounter}`,
    username: username,
    name: name,
    avatar: `https://placehold.co/40x40.png?text=${firstName.substring(0,1)}${lastName.substring(0,1)}&c=${i}`,
    position: { 
      lat: city.lat + randomOffsetLat, 
      lng: city.lng + randomOffsetLng 
    },
    aiHint: "profile picture",
  });
  userCounter++;
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

  // Enhanced console logging
  useEffect(() => {
    console.log(
      `%cMapPage Mount/Update: mapReady=${mapReady}, selectedUser=${selectedUser?.id || 'null'}`,
      'color: blue; font-weight: bold;'
    );
  }, [mapReady, selectedUser]);


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
                zoom={5} // Adjusted zoom level for a broader view of India
                onLoad={() => console.log("%cGoogleMap: component mounted (onLoad event).", 'color: purple;')}
                onUnmount={() => console.log("%cGoogleMap: component unmounted (onUnmount event).", 'color: red;')}
                options={{ zoomControl: true }} // Explicitly enable zoom controls
              >
                {mockUsersData.map((user) => {
                  // console.log(`%cGoogleMap Child Loop: Rendering default marker for ${user.id}.`, 'color: teal');
                  return (
                    <Marker
                      key={user.id}
                      position={user.position}
                      onClick={() => {
                        // console.log(`%cMarker Click: User ${user.id} clicked. Setting selectedUser.`, 'color: brown');
                        setSelectedUser(user);
                      }}
                      // Using default Google Maps red pin marker for simplicity and reliability
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
            This map shows approximate locations of 100 PokerConnect users across India. Click on a marker to see more details.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

