"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function ProtocolsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const handleAgree = () => {
    router.push("/signup");
  };

  const handleDisagree = () => {
    toast({
      title: "Agreement Required",
      description: "You must agree to the protocols to sign up for PokerConnect.",
      variant: "destructive",
    });
    router.push("/quiz");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/50 p-4">
      <Card className="w-full max-w-md shadow-2xl rounded-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">PokerConnect Community Protocols</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-md">
            Welcome to PokerConnect! Before you sign up, please read and agree to the following protocols to ensure a great experience for all users:
          </p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              <strong>Purpose of PokerConnect</strong>: This app is exclusively for poker players—beginners to professionals—to connect, network, and find nearby players for games and events. It is <em>not</em> a social dating site.
            </li>
            <li>
              <strong>Respect All Players</strong>: Treat every player with respect, regardless of skill level. Be kind, encouraging, and professional in your interactions.
            </li>
            <li>
              <strong>Build a Positive Community</strong>: Contribute to a supportive poker community by sharing knowledge, organizing games, and networking with others. Avoid negative behavior like harassment, bullying, or spamming.
            </li>
            <li>
              <strong>Use Location Features Responsibly</strong>: The app helps you find nearby poker players. Only use this feature to connect for poker-related activities, not for unrelated purposes.
            </li>
            <li>
              <strong>Follow App Guidelines</strong>: Adhere to PokerConnect’s terms of service and community standards. Misuse of the app (e.g., for dating or inappropriate behavior) may result in account suspension or termination.
            </li>
          </ol>
          <p className="text-md">
            By proceeding to sign up, you agree to follow these protocols and help create a vibrant poker community.
          </p>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleDisagree}>
            Disagree
          </Button>
          <Button onClick={handleAgree}>
            Agree & Proceed
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}