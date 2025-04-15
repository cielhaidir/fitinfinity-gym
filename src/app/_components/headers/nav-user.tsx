"use client"

import {
    LogOut,
    User,
    Settings,
    Dumbbell,
    Bell,
    LayoutDashboard
} from "lucide-react"

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut } from "next-auth/react"
import Link from "next/link"

export function NavUser({
    user,
}: {
    user: {
        name: string
        email: string
        image: string
    }
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="outline-none">
                <Avatar className="h-10 w-10 border-2 border-[#BFFF00] hover:border-[#9FDF00] transition-colors">
                    <AvatarImage src={user?.image} alt={user?.name} />
                    <AvatarFallback className="bg-[#BFFF00] text-black font-semibold">
                        {user?.name?.charAt(0)}
                    </AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-64 bg-black border border-[#BFFF00] text-white"
                side="bottom"
                align="end"
                sideOffset={8}
            >
                <DropdownMenuLabel className="p-0">
                    <div className="flex items-center gap-3 p-4">
                        <Avatar className="h-10 w-10 border-2 border-[#BFFF00]">
                            <AvatarImage src={user?.image} alt={user?.name} />
                            <AvatarFallback className="bg-[#BFFF00] text-black font-semibold">
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
                    <DropdownMenuItem asChild>
                        <Link 
                            href="/member/dashboard"
                            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-800 cursor-pointer text-[#BFFF00] hover:text-[#9FDF00] w-full"
                        >
                            <LayoutDashboard size={18} />
                            Dashboard
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link 
                            href="/profile"
                            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-800 cursor-pointer text-gray-200 hover:text-[#BFFF00] w-full"
                        >
                            <User size={18} />
                            Profile
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link 
                            href="/workouts"
                            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-800 cursor-pointer text-gray-200 hover:text-[#BFFF00] w-full"
                        >
                            <Dumbbell size={18} />
                            My Workouts
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link 
                            href="/notifications"
                            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-800 cursor-pointer text-gray-200 hover:text-[#BFFF00] w-full"
                        >
                            <Bell size={18} />
                            Notifications
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link 
                            href="/settings"
                            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-800 cursor-pointer text-gray-200 hover:text-[#BFFF00] w-full"
                        >
                            <Settings size={18} />
                            Settings
                        </Link>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-gray-800" />
                <div className="p-1">
                    <DropdownMenuItem 
                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-800 cursor-pointer text-red-500 hover:text-red-400"
                        onClick={() => signOut()}
                    >
                        <LogOut size={18} />
                        Log out
                    </DropdownMenuItem>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
