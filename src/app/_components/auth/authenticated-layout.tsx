"use client";
import { type ReactNode, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import AppNavbar from "../headers/app-navbar";
import { AppSidebar } from "../headers/app-sidebar";
import { SidebarProvider, SidebarInset } from "../ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "sonner";
import { toast } from "sonner";
import { useRBAC } from "@/hooks/useRBAC";
import { Menu } from "@/lib/menu";
import { RFIDProvider } from "../hooks/useRFIDCheckIn";
import { GlobalCheckInModal } from "../rfid/GlobalCheckInModal";

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

// Redirect to profile page if profile is incomplete
if (
  status === "authenticated" &&
  !isLoading &&
  session?.user &&
  pathname !== "/member/profile"
) {
  // Require name and phone for profile completeness
  const isProfileIncomplete =
    !session.user.name ||
    session.user.name.trim() === "" ||
    !session.user.phone ||
    session.user.phone.trim() === "";

  if (isProfileIncomplete && pathname !== "/member/profile") {
    toast.warning("You need to complete your profile First");
    router.push("/member/profile");
    return;
  }
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
    return <FullPageLoadingSkeleton />;
  }

  return (
    <RFIDProvider>
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
      <GlobalCheckInModal />
    </RFIDProvider>
  );
}

function FullPageLoadingSkeleton() {
  return (
    <div className="flex h-screen w-full">
      {/* Sidebar Skeleton */}
      <div className="hidden md:flex w-64 flex-col border-r bg-background p-4 gap-4">
        {/* Logo area */}
        <Skeleton className="h-10 w-32" />
        
        {/* Nav items */}
        <div className="flex flex-col gap-2 mt-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        
        {/* Bottom section */}
        <div className="mt-auto">
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
      
      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        {/* Navbar Skeleton */}
        <div className="flex h-14 items-center justify-between border-b px-4">
          <Skeleton className="h-8 w-32" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        
        {/* Content Skeleton */}
        <div className="flex-1 p-4 space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}
