import type * as React from "react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SearchForm } from "./search-form";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState, useCallback, useEffect, useMemo } from "react";
import { ChevronRight } from "lucide-react";
import {
  Menu as data,
  isMenuParent,
  flattenMenuItems,
  type MenuLeaf,
  type MenuItem,
} from "@/lib/menu";
import { useRouter } from "next/navigation";
import { useRBAC } from "@/hooks/useRBAC";
import { api } from "@/trpc/react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { hasPermission } = useRBAC();
  const { isMobile, setOpenMobile } = useSidebar();

  const { data: packageData } = api.member.getActivePackageTypes.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });
  const activePackageTypes = packageData?.packageTypes ?? [];

  // Pending class visit count for sidebar badge
  const { data: pendingClassVisitCount } = api.classVisit.pendingCount.useQuery(undefined, {
    retry: false,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // Add this new useEffect to close mobile menu on route change
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [pathname, isMobile, setOpenMobile]);

  const handleLogout = () => {
    signOut();
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const canSeeLeaf = useCallback(
    (item: MenuLeaf) => {
      // If RBAC is disabled, show all items regardless of permissions
      if (process.env.NEXT_PUBLIC_ALLOW_RBAC === "false") {
        return true;
      }

      // If the item has a permission requirement, check if user has it
      if (item.requiredPermission && !hasPermission(item.requiredPermission)) {
        return false;
      }
      // Package-type visibility rules (only applied when member has active subscriptions)
      if (activePackageTypes.length > 0 || item.showForPackageTypes) {
        if (item.showForPackageTypes && !item.showForPackageTypes.some((t) => activePackageTypes.includes(t))) {
          return false;
        }
      }
      if (item.hideForPackageTypes && item.hideForPackageTypes.some((t) => activePackageTypes.includes(t))) {
        return false;
      }
      return true;
    },
    [hasPermission, activePackageTypes],
  );

  // Filter menu items based on permissions (recursively for nested parents)
  const filteredNavMain = useMemo(
    () =>
      data.navMain
        .map((group) => ({
          ...group,
          items: group.items
            .map((item): MenuItem | null => {
              if (isMenuParent(item)) {
                const children = item.items.filter(canSeeLeaf);
                return children.length > 0 ? { ...item, items: children } : null;
              }
              return canSeeLeaf(item) ? item : null;
            })
            .filter((item): item is MenuItem => item !== null),
        }))
        .filter((group) => group.items.length > 0),
    [canSeeLeaf],
  );

  // Track which collapsible parents are open. Auto-open the one containing the active route.
  const [openParents, setOpenParents] = useState<Record<string, boolean>>({});
  useEffect(() => {
    for (const group of filteredNavMain) {
      for (const item of group.items) {
        if (isMenuParent(item) && item.items.some((leaf) => leaf.url === pathname)) {
          const key = `${group.title}/${item.title}`;
          setOpenParents((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
        }
      }
    }
  }, [pathname, filteredNavMain]);

  const renderBadge = (url: string) =>
    url === "/admin/class-visit" && !!pendingClassVisitCount && pendingClassVisitCount > 0 ? (
      <SidebarMenuBadge className="bg-red-500 text-white rounded-full text-[10px] min-w-[20px] h-5 flex items-center justify-center">
        {pendingClassVisitCount}
      </SidebarMenuBadge>
    ) : null;

  return (
    <>
      <Sidebar {...props}>
        <SidebarHeader>
          <div className="flex items-center justify-center py-5">
            <a href="/">
              <Image
                src="/assets/fitinfinity-lime.png"
                alt="Logo"
                width={150}
                height={150}
              />
            </a>
          </div>

          {!isMobile && <SearchForm setOpen={setOpen} />}
        </SidebarHeader>
        <SidebarContent className="pe-2 ps-3">
          {filteredNavMain.map((group) => (
            <SidebarGroup key={group.title} className="py-1">
              <SidebarGroupLabel className="text-gray-400 uppercase tracking-wider text-[11px]">
                {group.title}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    if (isMenuParent(item)) {
                      const key = `${group.title}/${item.title}`;
                      const hasActiveChild = item.items.some((leaf) => leaf.url === pathname);
                      const isOpen = openParents[key] ?? hasActiveChild;
                      return (
                        <Collapsible
                          key={key}
                          open={isOpen}
                          onOpenChange={(v) => setOpenParents((prev) => ({ ...prev, [key]: v }))}
                          className="group/collapsible"
                        >
                          <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton
                                className="p-4 text-base sm:p-2 sm:text-sm"
                                isActive={hasActiveChild && !isOpen}
                              >
                                {item.icon && <item.icon className="h-4 w-4" />}
                                <span>{item.title}</span>
                                <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenuSub>
                                {item.items.map((leaf) => (
                                  <SidebarMenuSubItem key={leaf.url} className="relative">
                                    <SidebarMenuSubButton
                                      asChild
                                      isActive={pathname === leaf.url}
                                    >
                                      <Link href={leaf.url}>
                                        {leaf.icon && <leaf.icon className="h-4 w-4" />}
                                        <span>{leaf.title}</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                    {renderBadge(leaf.url)}
                                  </SidebarMenuSubItem>
                                ))}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </SidebarMenuItem>
                        </Collapsible>
                      );
                    }

                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname === item.url}
                          className="p-4 text-base sm:p-2 sm:text-sm"
                        >
                          <Link href={item.url} className="flex items-center gap-2">
                            {item.icon && <item.icon className="h-4 w-4" />}
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                        {renderBadge(item.url)}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <div className="block p-4 md:hidden">
            <Button
              onClick={handleLogout}
              className="w-full rounded border bg-infinity"
            >
              Logout
            </Button>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {filteredNavMain.map((group) => (
            <div key={group.title}>
              <CommandGroup
                key={group.title}
                heading={group.title}
                className="py-4"
              >
                {flattenMenuItems(group.items).map((item) => (
                  <CommandItem
                    key={item.url}
                    onSelect={() => runCommand(() => router.push(item.url))}
                  >
                    <div className="flex items-center gap-2">
                      {item.icon && <item.icon className="h-4 w-4" />}
                      <span>{item.title}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </div>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
