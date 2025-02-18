"use client"
import { type ReactNode, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import AppNavbar from "../headers/app-navbar"
import { AppSidebar } from "../headers/app-sidebar"
import { SidebarProvider, SidebarInset } from "../ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { Toaster } from 'sonner'

interface AuthenticatedLayoutProps {
  children: ReactNode
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  const isLoading = status === "loading"

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppNavbar />
      <Toaster position="top-center" richColors expand={false} />
        <main className="flex flex-1 flex-col gap-4 p-4 bg-muted/5">
          {isLoading ? <LoadingSkeleton /> : children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function LoadingSkeleton() {
  return (
    <>
      <Skeleton className="h-8 w-full" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </>
  )
}

