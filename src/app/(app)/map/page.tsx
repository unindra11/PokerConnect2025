import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MapPage() {
  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6">Player Map</h1>
      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>Global Poker Player Locations (Approximate)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-[16/9] w-full bg-muted rounded-lg overflow-hidden border">
            <Image
              src="https://placehold.co/1200x675.png" // Placeholder for map
              alt="World map showing player locations"
              width={1200}
              height={675}
              className="w-full h-full object-cover"
              data-ai-hint="world map connections"
              priority
            />
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            This map shows approximate locations of PokerConnect users who have opted to share their location.
            Exact locations are never displayed to protect privacy. Zoom and interact to find players near you or around the world.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
