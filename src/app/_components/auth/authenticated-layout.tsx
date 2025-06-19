"use client";
import { type ReactNode, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import AppNavbar from "../headers/app-navbar";
import { AppSidebar } from "../headers/app-sidebar";
import { SidebarProvider, SidebarInset } from "../ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "sonner";
import { useRBAC } from "@/hooks/useRBAC";
import { Menu } from "@/lib/menu";

interface AuthenticatedLayoutProps {
  children: ReactNode;
}

export default function AuthenticatedLayout({
  children,
}: AuthenticatedLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { hasPermission, isLoading } = useRBAC();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated" && !isLoading && session?.user) {
      // Role-based dashboard redirect logic
      const isOnAuthRoot = pathname === "/" || pathname === "/auth";
      
      if (isOnAuthRoot) {
        // Determine dashboard route based on user permissions (priority order)
        if (hasPermission("menu:dashboard-admin")) {
          router.push("/admin");
          return;
        } else if (hasPermission("menu:dashboard-finance")) {
          router.push("/finance");
          return;
        } else if (hasPermission("menu:dashboard-fc")) {
          router.push("/fitness-consultants");
          return;
        } else if (hasPermission("menu:dashboard-pt")) {
          router.push("/personal-trainers");
          return;
        } else if (hasPermission("menu:dashboard-member")) {
          router.push("/member");
          return;
        } else {
          // Default fallback to member dashboard if no specific permission is found
          router.push("/member");
          return;
        }
      }

      // Find the current route in the menu
      const currentRoute = Menu.navMain
        .flatMap((group) => group.items)
        .find((item) => item.url === pathname);

      // Check if route requires permission
      if (
        currentRoute?.requiredPermission &&
        !hasPermission(currentRoute.requiredPermission)
      ) {
        // router.push("/unauthorized")
      }
    }
  }, [status, router, pathname, hasPermission, isLoading, session]);

  if (isLoading || status === "loading") {
    return (
      <div className="p-4">
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppNavbar />
        <Toaster position="top-center" richColors expand={false} />
        <main className="flex flex-1 flex-col gap-4 bg-muted/5 p-4">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
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
  );
}
