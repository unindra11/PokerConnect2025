"use client";

import { useState, useEffect } from "react";
import { Inter } from "next/font/google";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFirestore, collection, getDocs, query } from "firebase/firestore";
import { app } from "@/lib/firebase";
import Link from "next/link";
console.log("Link component imported:", Link); // Debug log

// Install these dependencies: npm install chart.js react-chartjs-2
import { Bubble } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";

// Register Chart.js components
ChartJS.register(LinearScale, PointElement, Tooltip, Legend);

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

interface User {
  id: string;
  username: string;
  avatar: string;
  location: {
    country: string;
    state: string;
    city: string;
  };
}

interface BubbleData {
  label: string;
  value: number;
  color?: string;
}

export default function MapPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsersFromFirestore = async () => {
      setIsLoading(true);
      try {
        const db = getFirestore(app, "poker");
        const usersCollectionRef = collection(db, "users");
        const q = query(usersCollectionRef);
        const querySnapshot = await getDocs(q);

        const userData: User[] = [];
        querySnapshot.forEach((docSnap) => {
          const userDataDoc = docSnap.data();
          if (
            userDataDoc.location &&
            userDataDoc.location.country &&
            userDataDoc.location.state &&
            userDataDoc.location.city
          ) {
            userData.push({
              id: docSnap.id,
              username: userDataDoc.username || "unknown_user",
              avatar: userDataDoc.avatar || `https://placehold.co/40x40.png?text=${(userDataDoc.username || "U").charAt(0).toUpperCase()}`,
              location: {
                country: userDataDoc.location.country,
                state: userDataDoc.location.state,
                city: userDataDoc.location.city,
              },
            });
          }
        });
        setUsers(userData);
      } catch (error) {
        console.error("Error fetching users from Firestore:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsersFromFirestore();
  }, []);

  // Aggregate user counts by country
  const countryData = users.reduce((acc: { [key: string]: number }, user) => {
    acc[user.location.country] = (acc[user.location.country] || 0) + 1;
    return acc;
  }, {});

  const bubbleData = {
    datasets: [
      {
        label: "Countries",
        data: Object.entries(countryData).map(([label, value]) => ({
          x: Math.random() * 100, // Random x for visualization
          y: Math.random() * 100, // Random y for visualization
          r: value * 5, // Radius scaled by user count
        })),
        backgroundColor: Object.keys(countryData).map(() => getRandomColor()),
        borderColor: "rgba(255, 255, 255, 0.8)",
        borderWidth: 1,
      },
    ],
  };

  // Filter users by selected country and state
  const stateUsers = selectedCountry
    ? users.filter((user) => user.location.country === selectedCountry)
    : [];
  const stateCounts = stateUsers.reduce((acc: { [key: string]: number }, user) => {
    acc[user.location.state] = (acc[user.location.state] || 0) + 1;
    return acc;
  }, {});

  const cityUsers = selectedState
    ? stateUsers.filter((user) => user.location.state === selectedState)
    : [];

  function getRandomColor() {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  const options = {
    onClick: (event: any, elements: any[]) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const country = Object.keys(countryData)[index];
        setSelectedCountry(country);
      }
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        display: false,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (tooltipItem: any) => {
            const country = Object.keys(countryData)[tooltipItem.dataIndex];
            return `${country}: ${countryData[country]} user${countryData[country] !== 1 ? "s" : ""}`;
          },
        },
      },
    },
  };

  return (
    <div className={`${inter.className} container mx-auto p-4`}>
      <h1 className="text-3xl font-bold mb-6">Player Distribution</h1>
      <Card className="shadow-lg rounded-xl overflow-hidden">
        <CardHeader>
          <CardTitle>Interactive Player Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <span className="text-lg">Loading user data...</span>
            </div>
          ) : (
            <>
              {!selectedCountry && users.length > 0 && (
                <div className="relative w-full h-96">
                  <Bubble data={bubbleData} options={options} />
                </div>
              )}
              {selectedCountry && !selectedState && (
                <div className="mt-4">
                  <button
                    onClick={() => setSelectedCountry(null)}
                    className="mb-2 text-blue-600 hover:underline"
                  >
                    Back to Countries
                  </button>
                  <h2 className="text-xl font-semibold mb-2">{selectedCountry} States</h2>
                  <ul className="space-y-2 max-h-60 overflow-y-auto">
                    {Object.entries(stateCounts).map(([state, count]) => (
                      <li
                        key={state}
                        onClick={() => setSelectedState(state)}
                        className="cursor-pointer text-blue-600 hover:underline"
                      >
                        {state} ({count} user{count !== 1 ? "s" : ""})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedState && (
                <div className="mt-4">
                  <button
                    onClick={() => setSelectedState(null)}
                    className="mb-2 text-blue-600 hover:underline"
                  >
                    Back to {selectedCountry} States
                  </button>
                  <h2 className="text-xl font-semibold mb-2">{selectedState} Cities</h2>
                  <ul className="space-y-2 max-h-60 overflow-y-auto">
                    {Object.entries(
                      cityUsers.reduce((acc: { [key: string]: User[] }, user) => {
                        (acc[user.location.city] = acc[user.location.city] || []).push(user);
                        return acc;
                      }, {})
                    ).map(([city, usersInCity]) => (
                      <li key={city} className="mb-2">
                        <h3 className="font-medium">{city} ({usersInCity.length} user{usersInCity.length !== 1 ? "s" : ""})</h3>
                        <ul className="ml-4 space-y-1">
                          {usersInCity.map((user) => (
                            <li key={user.id} className="flex items-center space-x-2">
                              <Link href={`/profile/${user.username}`}>
                                <img
                                  src={user.avatar}
                                  alt={user.username}
                                  className="w-8 h-8 rounded-full hover:opacity-80 transition-opacity"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://placehold.co/40x40.png?text=${user.username.charAt(0).toUpperCase()}`;
                                  }}
                                />
                              </Link>
                              <Link href={`/profile/${user.username}`} className="hover:underline">
                                {user.username}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}