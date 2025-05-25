import { PokerTipsForm } from "./poker-tips-form";

export default function PokerTipsPage() {
  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center">AI Poker Coach</h1>
      <PokerTipsForm />
    </div>
  );
}
