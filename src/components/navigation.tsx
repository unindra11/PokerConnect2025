'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/context/UserContext";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Home,
  MapPinned,
  UserSquare,
  Users,
  Bell,
  LayoutGrid,
  MessageCircleMore,
} from "lucide-react";
import { Loader2 } from "lucide-react";

const menuItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/map", label: "Player Map", icon: MapPinned },
  { href: "/my-posts", label: "My Posts", icon: UserSquare },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/chat", label: "Chat", icon: MessageCircleMore },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/community-wall", label: "Community Wall", icon: LayoutGrid },
];

export function AppNavigation() {
  const { loggedInUserDetails, isLoadingUserDetails, unreadNotificationsCount } = useUser();
  const pathname = usePathname();

  if (isLoadingUserDetails) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!loggedInUserDetails) {
    return null; // Let UserContext handle redirects
  }

  return (
    <SidebarMenu>
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isNotifications = item.href === "/notifications";
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href || (item.href !== "/home" && pathname.startsWith(item.href))}
              tooltip={item.label}
              className={isNotifications ? "relative" : ""}
            >
              <Link href={item.href}>
                <span className="flex items-center justify-start gap-2 w-full">
                  <Icon size={20} />
                  <span className="group-data-[collapsible=icon]:hidden delay-300 whitespace-nowrap truncate">
                    {item.label}
                  </span>
                  {isNotifications && unreadNotificationsCount > 0 && (
                    <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center group-data-[collapsible=icon]:top-1 group-data-[collapsible=icon]:right-1">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}