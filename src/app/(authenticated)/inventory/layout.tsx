"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "next/navigation";
import { Package, History, AlertTriangle } from "lucide-react";
import { api } from "@/trpc/react";
import { Badge } from "@/components/ui/badge";

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Get low stock count for badge
  const { data: lowStockData } = api.inventory.getLowStockCount.useQuery();

  const tabs = [
    {
      value: "/inventory/stock",
      label: "Stock Levels",
      icon: Package,
    },
    {
      value: "/inventory/transactions",
      label: "Transactions",
      icon: History,
    },
  ];

  const currentTab = tabs.find((tab) => pathname.startsWith(tab.value))?.value ?? "/inventory/stock";

  return (
    <div className="h-full flex-1 flex-col space-y-6 p-8 md:flex">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventory Management</h2>
          <p className="text-muted-foreground">
            Manage stock levels, adjustments, and view transaction history
          </p>
        </div>
        {lowStockData && lowStockData.count > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {lowStockData.count} Low Stock Items
          </Badge>
        )}
      </div>

      <Tabs value={currentTab} onValueChange={(value) => router.push(value)}>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {children}
    </div>
  );
}