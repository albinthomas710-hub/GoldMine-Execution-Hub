import React, { useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import Sidebar, { MobileTopbar } from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";

export default function Layout() {
    const { user, loading } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    if (loading) {
        return (
            <div className="min-h-screen bg-ink-base flex items-center justify-center">
                <div className="text-white/40 text-sm tracking-[0.2em] uppercase">Loading</div>
            </div>
        );
    }
    if (!user) return <Navigate to="/login" replace />;

    return (
        <div className="flex min-h-screen bg-ink-base text-foreground">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <main className="flex-1 min-w-0 flex flex-col">
                <MobileTopbar onOpen={() => setSidebarOpen(true)} />
                <div className="flex-1 px-6 md:px-12 py-10 md:py-14 max-w-[1440px] w-full mx-auto animate-fade-up">
                    <Outlet />
                </div>
            </main>
            <Toaster position="bottom-right" theme="dark" toastOptions={{ style: { background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.06)", color: "#EDEDED" } }} />
        </div>
    );
}
