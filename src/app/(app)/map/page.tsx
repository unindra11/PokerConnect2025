
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MapPage() {
  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6">Player Map</h1>
      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>Interactive Player Map Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-[16/9] w-full bg-muted rounded-lg overflow-hidden border">
            <Image
              src="https://placehold.co/1200x675.png" // Placeholder for map
              alt="World map showing approximate player locations"
              width={1200}
              height={675}
              className="w-full h-full object-cover"
              data-ai-hint="world map connections"
              priority
            />
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Welcome to the Player Map! This feature shows the approximate locations of PokerConnect users who have chosen to share their presence.
            To protect privacy, exact locations are never displayed. Future versions will allow you to zoom and interact to discover players globally and in your vicinity.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
