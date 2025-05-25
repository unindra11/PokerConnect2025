import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/quiz'); // Redirect to the quiz page
  return null; 
}
