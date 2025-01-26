"use client";
import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AuthNavbar from '../headers/auth-navbar';
import { AppSidebar } from '../headers/sidebar';
import { SidebarProvider } from '../ui/sidebar';

interface AuthenticatedLayoutProps {
    children: ReactNode;
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
    const { data: session, status } = useSession();
    const router = useRouter();
    useEffect(() => {
        if (status === 'loading') return; // Do nothing while loading
        if (!session) router.push('/login'); // Redirect to login if not authenticated
    }, [session, status, router]);

    if (status === 'loading' || !session) {
        return <div>Loading...</div>; // Show a loading state while checking session
    }

    return (
        <div className="flex h-screen">
            <SidebarProvider>
                <AppSidebar user={session?.user ?? undefined}/>
                <div className="flex-1 flex flex-col">
                    <AuthNavbar />
                    <main className="flex-1 p-8">
                        {children}
                    </main>
                </div>
            </SidebarProvider>
        </div>
    );
}