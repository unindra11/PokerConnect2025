"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  omaha: [
    {
      id: "om_q1",
      text: "In Omaha poker, how many hole cards does each player receive?",
      options: ["2", "3", "4", "5"],
      correctAnswer: "4",
    },
    {
      id: "om_q2",
      text: "In Omaha, how many hole cards must you use to make your final hand?",
      options: ["1", "2", "3", "4"],
      correctAnswer: "2",
    },
    {
      id: "om_q3",
      text: "What is the maximum number of community cards you can use in Omaha to make your hand?",
      options: ["2", "3", "4", "5"],
      correctAnswer: "3",
    },
  ],
  pineapple: [
    {
      id: "pa_q1",
      text: "In Pineapple poker, how many hole cards are initially dealt to each player?",
      options: ["2", "3", "4", "5"],
      correctAnswer: "3",
    },
    {
      id: "pa_q2",
      text: "In standard Pineapple poker, when do you discard one of your hole cards?",
      options: ["Before the flop", "After the flop", "After the turn", "After the river"],
      correctAnswer: "Before the flop",
    },
    {
      id: "pa_q3",
      text: "In Crazy Pineapple, when do you discard one of your hole cards?",
      options: ["Before the flop", "After the flop", "After the turn", "After the river"],
      correctAnswer: "After the flop",
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
      localStorage.setItem("quizPassed", "true"); // Set quizPassed flag
      router.push("/protocols");
    } else {
      setQuizPassed(false);
      localStorage.setItem("quizPassed", "false"); // Set quizPassed flag to false
    }
  };

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
                  {selectedGame === "omaha" && "Omaha Quiz"}
                  {selectedGame === "pineapple" && "Pineapple Quiz"}
                </h3>
                <Button variant="link" onClick={() => setSelectedGame(null)}>Change Game</Button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSubmitQuiz(); }}>
                <div className="space-y-6">
                  {quizQuestions[selectedGame].map((q) => (
                    <div key={q.id}>
                      <Label className="text-md font-medium">{q.text}</Label>
                      <RadioGroup
                        onValueChange={(value) => handleAnswerChange(q.id, value)}
                        value={answers[q.id]}
                        className="mt-2 space-y-1"
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
                    disabled={Object.keys(answers).length !== quizQuestions[selectedGame].length}
                >
                  Submit Answers
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}