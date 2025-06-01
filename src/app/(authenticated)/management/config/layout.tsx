"use client"
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
            : "site";

    return (
        <div className="container mx-auto py-6 space-y-6">
            <Tabs value={currentTab} className="w-full" onValueChange={(value) => router.push(`/management/config/${value}`)}>
                <TabsList>
                    <TabsTrigger value="site">Site Settings</TabsTrigger>
                    <TabsTrigger value="email">Email Settings</TabsTrigger>
                </TabsList>
            </Tabs>
            {children}
        </div>
    );
}