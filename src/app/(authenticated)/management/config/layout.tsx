"use client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "next/navigation";

export default function ConfigLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const currentTab = pathname.includes("/site")
    ? "site"
    : pathname.includes("/email")
      ? "email"
      : "general";

  const handleTabChange = (value: string) => {
    if (value === "general") {
      router.push("/management/config");
    } else {
      router.push(`/management/config/${value}`);
    }
  };

  return (
    <div className="container mx-auto space-y-6 py-6">
      <Tabs
        value={currentTab}
        className="w-full"
        onValueChange={handleTabChange}
      >
        <TabsList>
          <TabsTrigger value="general">General Config</TabsTrigger>
          <TabsTrigger value="site">Site Settings</TabsTrigger>
          <TabsTrigger value="email">Email Settings</TabsTrigger>
        </TabsList>
      </Tabs>
      {children}
    </div>
  );
}
