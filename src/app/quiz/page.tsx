// src/app/quiz/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";

type GameType = "texas-holdem" | "omaha" | "pineapple";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
}

const quizData: Record<GameType, QuizQuestion[]> = {
  "texas-holdem": [
    {
      id: "th_q1",
      question: "How many hole cards are dealt to each player in Texas Hold'em?",
      options: ["1", "2", "4", "5"],
      correctAnswer: "2",
    },
    {
      id: "th_q2",
      question: "Which hand is stronger: A Flush or a Straight?",
      options: ["A Flush", "A Straight", "They are equal"],
      correctAnswer: "A Flush",
    },
    {
      id: "th_q3",
      question: "What is the term for the first three community cards dealt face up?",
      options: ["The Turn", "The River", "The Flop", "The Showdown"],
      correctAnswer: "The Flop",
    },
  ],
  omaha: [ // Placeholder questions for Omaha
    { id: "om_q1", question: "Omaha Question 1: (Placeholder)", options: ["A", "B", "C"], correctAnswer: "A" },
    { id: "om_q2", question: "Omaha Question 2: (Placeholder)", options: ["A", "B", "C"], correctAnswer: "B" },
    { id: "om_q3", question: "Omaha Question 3: (Placeholder)", options: ["A", "B", "C"], correctAnswer: "C" },
  ],
  pineapple: [ // Placeholder questions for Pineapple
    { id: "pi_q1", question: "Pineapple Question 1: (Placeholder)", options: ["X", "Y", "Z"], correctAnswer: "X" },
    { id: "pi_q2", question: "Pineapple Question 2: (Placeholder)", options: ["X", "Y", "Z"], correctAnswer: "Y" },
    { id: "pi_q3", question: "Pineapple Question 3: (Placeholder)", options: ["X", "Y", "Z"], correctAnswer: "Z" },
  ],
};

export default function QuizPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedGame, setSelectedGame] = useState<GameType>("texas-holdem");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [allCorrect, setAllCorrect] = useState(false);

  const handleGameChange = (value: string) => {
    setSelectedGame(value as GameType);
    setAnswers({}); // Reset answers when game changes
    setQuizSubmitted(false);
    setAllCorrect(false);
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setQuizSubmitted(false); // Allow re-submission if an answer changes
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const currentQuestions = quizData[selectedGame];
    if (Object.keys(answers).length !== currentQuestions.length) {
      toast({
        title: "Incomplete Quiz",
        description: "Please answer all questions before submitting.",
        variant: "destructive",
      });
      return;
    }

    let correctCount = 0;
    currentQuestions.forEach((q) => {
      if (answers[q.id] === q.correctAnswer) {
        correctCount++;
      }
    });

    setQuizSubmitted(true);
    if (correctCount === currentQuestions.length) {
      setAllCorrect(true);
      toast({
        title: "Quiz Passed!",
        description: "Great job! Redirecting you to signup...",
        className: "bg-green-500 text-white",
      });
      setTimeout(() => {
        router.push("/signup");
      }, 2000);
    } else {
      setAllCorrect(false);
      toast({
        title: "Quiz Failed",
        description: `You got ${correctCount} out of ${currentQuestions.length} correct. Please review your answers and try again.`,
        variant: "destructive",
      });
    }
  };

  const currentQuestions = quizData[selectedGame];
  const gameNotImplemented = selectedGame === "omaha" || selectedGame === "pineapple";


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/50 p-4">
      <Card className="w-full max-w-lg shadow-2xl rounded-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Poker IQ Test</CardTitle>
          <CardDescription className="text-md">
            Select your game and answer a few questions to proceed.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="gameType" className="text-lg font-medium">Choose Your Game:</Label>
              <Select onValueChange={handleGameChange} defaultValue={selectedGame}>
                <SelectTrigger id="gameType" className="mt-2 text-base">
                  <SelectValue placeholder="Select a game" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="texas-holdem">Texas Hold'em</SelectItem>
                  <SelectItem value="omaha">Omaha (Coming Soon)</SelectItem>
                  <SelectItem value="pineapple">Pineapple (Coming Soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {gameNotImplemented ? (
                 <Alert variant="default" className="bg-amber-100 dark:bg-amber-900/30 border-amber-500">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <AlertTitle className="font-semibold text-amber-700 dark:text-amber-300">Coming Soon!</AlertTitle>
                    <AlertDescription className="text-amber-700 dark:text-amber-400">
                        Quiz questions for {selectedGame.charAt(0).toUpperCase() + selectedGame.slice(1)} are under development.
                        For now, you can explore the Texas Hold'em quiz or check back later!
                    </AlertDescription>
                </Alert>
            ) : (
              currentQuestions.map((q, index) => (
                <div key={q.id} className="space-y-2 p-4 border rounded-lg shadow-sm bg-card/80">
                  <Label htmlFor={q.id} className="text-md font-semibold">
                    {index + 1}. {q.question}
                  </Label>
                  <RadioGroup
                    id={q.id}
                    onValueChange={(value) => handleAnswerChange(q.id, value)}
                    value={answers[q.id]}
                    className="space-y-1"
                  >
                    {q.options.map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`${q.id}-${option}`} />
                        <Label htmlFor={`${q.id}-${option}`} className="font-normal">{option}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))
            )}
            
            {quizSubmitted && !gameNotImplemented && (
              <Alert variant={allCorrect ? "default" : "destructive"} className={allCorrect ? "bg-green-100 dark:bg-green-900/30 border-green-500" : ""}>
                {allCorrect ? <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" /> : <AlertCircle className="h-5 w-5" />}
                <AlertTitle className={allCorrect ? "text-green-700 dark:text-green-300" : ""}>{allCorrect ? "All Correct!" : "Incorrect"}</AlertTitle>
                <AlertDescription className={allCorrect ? "text-green-700 dark:text-green-400" : ""}>
                  {allCorrect
                    ? "Well done! You'll be redirected shortly."
                    : "Some answers are incorrect. Please review and try again."}
                </AlertDescription>
              </Alert>
            )}

          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full text-lg py-6" disabled={gameNotImplemented || (quizSubmitted && allCorrect)}>
              {quizSubmitted && allCorrect ? "Redirecting..." : "Submit Answers"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
