"use client";

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";

export function InstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallButton, setShowInstallButton] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstallButton(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }
        
        setDeferredPrompt(null);
        setShowInstallButton(false);
    };

    if (!showInstallButton) return null;

    return (
        <div className="fixed bottom-4 left-4 z-50">
            <Button
                onClick={handleInstallClick}
                className="bg-infinity text-white px-4 py-2 rounded-lg shadow-lg"
            >
                Install App
            </Button>
        </div>
    );
}