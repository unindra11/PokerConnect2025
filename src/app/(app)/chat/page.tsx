
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquareText } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="container mx-auto">
      <Card className="shadow-xl rounded-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center mb-4">
            <MessageSquareText className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Chat Central</CardTitle>
          <CardDescription className="text-md text-muted-foreground">
            Connect and chat with your friends. This feature is coming soon!
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-lg text-muted-foreground">
            Imagine your conversations happening right here...
          </p>
          <div className="mt-6">
            <div className="animate-pulse flex space-x-4 justify-center">
              <div className="rounded-full bg-muted h-10 w-10"></div>
              <div className="flex-1 space-y-3 py-1 max-w-xs">
                <div className="h-2 bg-muted rounded"></div>
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="h-2 bg-muted rounded col-span-2"></div>
                    <div className="h-2 bg-muted rounded col-span-1"></div>
                  </div>
                  <div className="h-2 bg-muted rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
