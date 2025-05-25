"use client";

import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { generatePokerTips, type GeneratePokerTipsInput, type GeneratePokerTipsOutput } from "@/ai/flows/generate-poker-tips";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wand2 } from "lucide-react";

const pokerTipsSchema = z.object({
  recentActivity: z.string().min(10, "Please describe your recent activity in at least 10 characters."),
  skillLevel: z.enum(["beginner", "intermediate", "advanced"]),
  interests: z.string().min(5, "Please mention at least one interest."),
});

type PokerTipsFormValues = z.infer<typeof pokerTipsSchema>;

export function PokerTipsForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [tips, setTips] = useState<string[]>([]);
  const { toast } = useToast();

  const form = useForm<PokerTipsFormValues>({
    resolver: zodResolver(pokerTipsSchema),
    defaultValues: {
      recentActivity: "",
      skillLevel: "beginner",
      interests: "",
    },
  });

  const onSubmit: SubmitHandler<PokerTipsFormValues> = async (data) => {
    setIsLoading(true);
    setTips([]);
    try {
      const result: GeneratePokerTipsOutput = await generatePokerTips(data);
      setTips(result.tips);
      toast({
        title: "Poker Tips Generated!",
        description: "Check out your personalized poker advice below.",
      });
    } catch (error) {
      console.error("Error generating poker tips:", error);
      toast({
        title: "Error",
        description: "Failed to generate poker tips. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card className="max-w-2xl mx-auto shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2"><Wand2 className="text-primary"/> Get AI Poker Tips</CardTitle>
          <CardDescription>
            Fill in your details below to receive personalized poker tips from our AI coach.
          </CardDescription>
        </CardHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="recentActivity">Recent Poker Activity</Label>
              <Textarea
                id="recentActivity"
                placeholder="e.g., Played a few SNGs, focused on tight-aggressive play, struggled with river decisions."
                {...form.register("recentActivity")}
                className="mt-1 min-h-[100px]"
              />
              {form.formState.errors.recentActivity && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.recentActivity.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="skillLevel">Skill Level</Label>
              <Select
                defaultValue="beginner"
                onValueChange={(value) => form.setValue("skillLevel", value as "beginner" | "intermediate" | "advanced")}
              >
                <SelectTrigger id="skillLevel" className="mt-1">
                  <SelectValue placeholder="Select your skill level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="interests">Specific Interests</Label>
              <Input
                id="interests"
                placeholder="e.g., Tournament strategy, GTO, bankroll management, tells."
                {...form.register("interests")}
                className="mt-1"
              />
              {form.formState.errors.interests && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.interests.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Tips...
                </>
              ) : (
                "Get Tips"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {tips.length > 0 && (
        <Card className="max-w-2xl mx-auto shadow-xl rounded-xl">
          <CardHeader>
            <CardTitle className="text-xl">Your Personalized Poker Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 list-decimal list-inside">
              {tips.map((tip, index) => (
                <li key={index} className="text-foreground/90">{tip}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
