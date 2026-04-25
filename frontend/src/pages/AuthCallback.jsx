import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Diamond } from "@phosphor-icons/react";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthCallback() {
    const navigate = useNavigate();
    const { setSession } = useAuth();
    const hasProcessed = useRef(false);

    useEffect(() => {
        if (hasProcessed.current) return;
        hasProcessed.current = true;

        const hash = window.location.hash || "";
        const match = hash.match(/session_id=([^&]+)/);
        if (!match) {
            navigate("/login", { replace: true });
            return;
        }
        const session_id = match[1];

        (async () => {
            try {
                const res = await api.post("/auth/google-session", { session_id });
                setSession(res.data.user, res.data.token);
                window.history.replaceState(null, "", window.location.pathname);
                navigate("/dashboard", { replace: true, state: { user: res.data.user } });
            } catch (e) {
                console.error("Auth callback failed", e);
                navigate("/login", { replace: true });
            }
        })();
    }, [navigate, setSession]);

    return (
        <div className="min-h-screen grid place-items-center bg-ink-base">
            <div className="flex flex-col items-center gap-4">
                <Diamond size={28} weight="fill" className="text-gold animate-pulse" />
                <div className="text-white/40 text-sm tracking-[0.2em] uppercase">Signing you in</div>
            </div>
        </div>
    );
}
