"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  MapPinned,
  UserSquare,
  Users,
  Bell,
  Lightbulb,
  LayoutGrid,
  MessageSquarePlus,
  Spades,
} from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const menuItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/map", label: "Player Map", icon: MapPinned },
  { href: "/my-posts", label: "My Posts", icon: UserSquare },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/poker-tips", label: "Poker Tips", icon: Lightbulb },
  { href: "/community-wall", label: "Community Wall", icon: LayoutGrid },
  { href: "/create-post", label: "Create Post", icon: MessageSquarePlus },
];

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {menuItems.map((item) => {
        const Icon = item.icon;
        return (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} legacyBehavior passHref>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href || (item.href !== "/home" && pathname.startsWith(item.href))}
                tooltip={item.label}
                className={cn(
                  "flex items-center justify-start gap-2"
                )}
              >
                <a>
                  <Icon size={20} />
                  <span className="group-data-[collapsible=icon]:hidden delay-300 whitespace-nowrap">
                    {item.label}
                  </span>
                </a>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
