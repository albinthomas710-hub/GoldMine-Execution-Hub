import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import AuthCallback from "@/pages/AuthCallback";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import DirectoryPage from "@/pages/DirectoryPage";
import VaultPage from "@/pages/VaultPage";
import PromptsPage from "@/pages/PromptsPage";
import ActionsPage from "@/pages/ActionsPage";
import NotesPage from "@/pages/NotesPage";

function RouterShell() {
    const location = useLocation();
    // Detect session_id during render (NOT in useEffect) to avoid race conditions
    if (location.hash?.includes("session_id=")) {
        return <AuthCallback />;
    }
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route element={<Layout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/directory" element={<DirectoryPage />} />
                <Route path="/vault" element={<VaultPage />} />
                <Route path="/prompts" element={<PromptsPage />} />
                <Route path="/actions" element={<ActionsPage />} />
                <Route path="/notes" element={<NotesPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}

export default function App() {
    return (
        <div className="App">
            <BrowserRouter>
                <AuthProvider>
                    <RouterShell />
                </AuthProvider>
            </BrowserRouter>
        </div>
    );
}
