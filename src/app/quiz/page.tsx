
// src/app/quiz/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

type GameType = "texas_holdem" | "omaha" | "pineapple";

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
}

const quizQuestions: Record<GameType, Question[]> = {
  texas_holdem: [
    {
      id: "th_q1",
      text: "In Texas Hold'em, how many hole cards does each player receive?",
      options: ["1", "2", "3", "4"],
      correctAnswer: "2",
    },
    {
      id: "th_q2",
      text: "What is the best possible starting hand in Texas Hold'em?",
      options: ["Pair of Kings", "Ace-King suited", "Pair of Aces", "Two suited connectors"],
      correctAnswer: "Pair of Aces",
    },
    {
      id: "th_q3",
      text: "Which of these is NOT a round of betting in Texas Hold'em?",
      options: ["Pre-flop", "Flop", "Turn", "Sixth Street"],
      correctAnswer: "Sixth Street",
    },
  ],
  omaha: [ // Placeholder questions for Omaha
    {
      id: "om_q1",
      text: "Omaha Question 1: How many hole cards?",
      options: ["2", "3", "4", "5"],
      correctAnswer: "4",
    },
    {
      id: "om_q2",
      text: "Omaha Question 2: How many hole cards MUST you use?",
      options: ["1", "2", "3", "Any"],
      correctAnswer: "2",
    },
    {
      id: "om_q3",
      text: "Omaha Question 3: True or False: You can play the board.",
      options: ["True", "False"],
      correctAnswer: "False",
    },
  ],
  pineapple: [ // Placeholder questions for Pineapple
    {
      id: "pa_q1",
      text: "Pineapple Question 1: How many cards initially dealt?",
      options: ["2", "3", "4", "5"],
      correctAnswer: "3",
    },
    {
      id: "pa_q2",
      text: "Pineapple Question 2: How many cards do you discard pre-flop?",
      options: ["0", "1", "2", "3"],
      correctAnswer: "1",
    },
    {
      id: "pa_q3",
      text: "Pineapple Question 3: Is 'Crazy Pineapple' the same as 'Pineapple'?",
      options: ["Yes", "No"],
      correctAnswer: "No",
    },
  ],
};

export default function QuizPage() {
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizPassed, setQuizPassed] = useState<boolean | null>(null);
  const router = useRouter();

  const handleGameSelect = (game: GameType) => {
    setSelectedGame(game);
    setAnswers({}); // Reset answers when game changes
    setQuizPassed(null);
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmitQuiz = () => {
    if (!selectedGame) return;

    const questions = quizQuestions[selectedGame];
    let correctCount = 0;
    for (const question of questions) {
      if (answers[question.id] === question.correctAnswer) {
        correctCount++;
      }
    }

    if (correctCount === questions.length) {
      setQuizPassed(true);
      router.push("/signup");
    } else {
      setQuizPassed(false);
    }
  };
  
  const getButtonText = () => {
    if (selectedGame === "omaha" || selectedGame === "pineapple") {
      return "Game Not Yet Available";
    }
    return "Submit Answers";
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/50 p-4">
      <Card className="w-full max-w-2xl shadow-2xl rounded-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Poker Quiz!</CardTitle>
          <CardDescription className="text-md">
            Select your game and answer a few questions to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!selectedGame ? (
            <div>
              <h3 className="text-xl font-semibold mb-3 text-center">Choose Your Game:</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button onClick={() => handleGameSelect("texas_holdem")} variant="outline" size="lg" className="py-8 text-lg">Texas Hold'em</Button>
                <Button onClick={() => handleGameSelect("omaha")} variant="outline" size="lg" className="py-8 text-lg">Omaha</Button>
                <Button onClick={() => handleGameSelect("pineapple")} variant="outline" size="lg" className="py-8 text-lg">Pineapple</Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">
                  {selectedGame === "texas_holdem" && "Texas Hold'em Quiz"}
                  {selectedGame === "omaha" && "Omaha Quiz (Coming Soon)"}
                  {selectedGame === "pineapple" && "Pineapple Quiz (Coming Soon)"}
                </h3>
                <Button variant="link" onClick={() => setSelectedGame(null)}>Change Game</Button>
              </div>

              {(selectedGame === "omaha" || selectedGame === "pineapple") && (
                 <Alert className="mb-6">
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>Coming Soon!</AlertTitle>
                  <AlertDescription>
                    Quizzes for Omaha and Pineapple are under development. Please select Texas Hold'em to proceed for now.
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={(e) => { e.preventDefault(); handleSubmitQuiz(); }}>
                <div className="space-y-6">
                  {quizQuestions[selectedGame].map((q) => (
                    <div key={q.id}>
                      <Label className="text-md font-medium">{q.text}</Label>
                      <RadioGroup
                        onValueChange={(value) => handleAnswerChange(q.id, value)}
                        value={answers[q.id]}
                        className="mt-2 space-y-1"
                        disabled={selectedGame === "omaha" || selectedGame === "pineapple"}
                      >
                        {q.options.map((opt) => (
                          <div key={opt} className="flex items-center space-x-2">
                            <RadioGroupItem value={opt} id={`${q.id}_${opt}`} />
                            <Label htmlFor={`${q.id}_${opt}`} className="font-normal">{opt}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  ))}
                </div>
                {quizPassed === false && (
                  <Alert variant="destructive" className="mt-6">
                    <AlertTitle>Incorrect Answers</AlertTitle>
                    <AlertDescription>
                      Please review your answers and try again.
                    </AlertDescription>
                  </Alert>
                )}
                <Button 
                    type="submit" 
                    className="w-full mt-8 text-lg py-3"
                    disabled={
                        selectedGame === "omaha" || 
                        selectedGame === "pineapple" ||
                        (selectedGame === "texas_holdem" && Object.keys(answers).length !== quizQuestions.texas_holdem.length)
                    }
                >
                 {getButtonText()}
                </Button>
              </form>
            </div>
          )}
        </CardContent>
         {selectedGame && (selectedGame === "omaha" || selectedGame === "pineapple") && (
             <CardFooter>
                <p className="text-sm text-muted-foreground text-center w-full">
                    Currently, only the Texas Hold'em quiz is active. Please select it to sign up.
                </p>
             </CardFooter>
         )}
      </Card>
    </div>
  );
}
