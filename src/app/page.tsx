
// src/app/page.tsx
import Link from 'next/link';

export default function RootPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <h1 className="text-3xl font-bold text-primary mb-4">Root Page Test</h1>
      <p className="text-lg mb-2">If you see this, the root path (/) is loading correctly.</p>
      <p className="text-md text-muted-foreground mb-4">
        Normally, this page should redirect you to the quiz.
      </p>
      <Link href="/quiz" className="text-accent hover:underline text-lg">
        Click here to manually go to the Quiz Page
      </Link>
      <div className="mt-8 p-4 border rounded-md bg-card text-card-foreground">
        <h2 className="text-xl font-semibold mb-2">Current Configuration:</h2>
        <p>Root (/) should redirect to: /quiz</p>
        <p>Quiz page is at: /quiz/page.tsx</p>
        <p>Home page is at: /home (within (app) group)</p>
      </div>
    </div>
  );
}
