
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { AppNavigation } from "@/components/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Settings, LogOut } from "lucide-react";
import Link from "next/link";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen collapsible="icon" variant="sidebar">
      <Sidebar side="left" className="border-r">
        <SidebarHeader className="p-4 border-b">
           <div className="flex items-center justify-between">
            <Logo className="group-data-[collapsible=icon]:hidden delay-300"/>
            <SidebarTrigger className="md:hidden"/> {/* Mobile trigger */}
          </div>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <AppNavigation />
        </SidebarContent>
        <SidebarFooter className="p-4 border-t">
          <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
            <Avatar className="h-9 w-9">
              <AvatarImage src="https://placehold.co/100x100.png" alt="User Avatar" data-ai-hint="user avatar" />
              <AvatarFallback>P</AvatarFallback>
            </Avatar>
            <div className="group-data-[collapsible=icon]:hidden delay-300 flex flex-col">
              <span className="text-sm font-medium">Player One</span>
              <span className="text-xs text-muted-foreground">unindra111@gmail.com</span>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-1">
             <SidebarMenuButton asChild tooltip="Settings" size="sm">
                <Link href="#">
                    <Settings size={18} />
                    <span className="group-data-[collapsible=icon]:hidden delay-300">Settings</span>
                </Link>
             </SidebarMenuButton>
             <SidebarMenuButton asChild tooltip="Logout" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive data-[active=true]:text-destructive data-[active=true]:bg-destructive/10">
                <Link href="/login"> {/* Updated logout to go to login page */}
                    <LogOut size={18} />
                    <span className="group-data-[collapsible=icon]:hidden delay-300">Logout</span>
                </Link>
             </SidebarMenuButton>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
            <Logo size={20} />
            <SidebarTrigger />
        </header>
        <main className="flex-1 overflow-y-auto p-6">
         {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
