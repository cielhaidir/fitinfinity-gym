"use client";

import {
  LogOut,
  User,
  Settings,
  Dumbbell,
  Bell,
  LayoutDashboard,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { api } from "@/trpc/react";

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    image: string;
  };
}) {
  const { data: profile } = api.profile.get.useQuery(undefined, {
    enabled: !!user,
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-none">
        <Avatar className="h-10 w-10 border-2 border-[#BFFF00] transition-colors hover:border-[#9FDF00]">
          <AvatarImage src={profile?.image || user?.image} alt={user?.name} />
          <AvatarFallback className="bg-[#BFFF00] font-semibold text-black">
            {user?.name?.charAt(0)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-64 border border-[#BFFF00] bg-black text-white"
        side="bottom"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuLabel className="p-0">
          <div className="flex items-center gap-3 p-4">
            <Avatar className="h-10 w-10 border-2 border-[#BFFF00]">
              <AvatarImage
                src={profile?.image || user?.image}
                alt={user?.name}
              />
              <AvatarFallback className="bg-[#BFFF00] font-semibold text-black">
                {user?.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-semibold text-[#BFFF00]">{user?.name}</span>
              <span className="text-xs text-gray-400">{user?.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-800" />
        <DropdownMenuGroup className="p-1">
          {/* <DropdownMenuItem asChild>
            <Link
              href="/member/dashboard"
              className="flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-[#BFFF00] hover:bg-gray-800 hover:text-[#9FDF00]"
            >
              <LayoutDashboard size={18} />
              Dashboard
            </Link>
          </DropdownMenuItem> */}
          <DropdownMenuItem asChild>
            <Link
              href="/member/profile"
              className="flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-gray-200 hover:bg-gray-800 hover:text-[#BFFF00]"
            >
              <User size={18} />
              Profile
            </Link>
          </DropdownMenuItem>
          {/* <DropdownMenuItem asChild>
            <Link
              href="/workouts"
              className="flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-gray-200 hover:bg-gray-800 hover:text-[#BFFF00]"
            >
              <Dumbbell size={18} />
              My Workouts
            </Link>
          </DropdownMenuItem> */}
          <DropdownMenuItem asChild>
            <Link
              href="/notifications"
              className="flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-gray-200 hover:bg-gray-800 hover:text-[#BFFF00]"
            >
              <Bell size={18} />
              Notifications
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href="/settings"
              className="flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-gray-200 hover:bg-gray-800 hover:text-[#BFFF00]"
            >
              <Settings size={18} />
              Settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-gray-800" />
        <div className="p-1">
          <DropdownMenuItem
            className="flex cursor-pointer items-center gap-3 px-4 py-2 text-red-500 hover:bg-gray-800 hover:text-red-400"
            onClick={() => signOut()}
          >
            <LogOut size={18} />
            Log out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
