import { UserProvider } from "@/context/UserContext";
import "@/app/globals.css"; // Import global styles

export const metadata = {
  title: "PokerConnect",
  description: "Connect with poker players, share tips, and join the community.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}