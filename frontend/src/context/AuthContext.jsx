import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        try {
            const res = await api.get("/auth/me");
            setUser(res.data);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // CRITICAL: If returning from OAuth callback, skip the /me check.
        // AuthCallback will exchange the session_id and establish the session first.
        if (window.location.hash?.includes("session_id=")) {
            setLoading(false);
            return;
        }
        checkAuth();
    }, [checkAuth]);

    const login = async (email, password) => {
        const res = await api.post("/auth/login", { email, password });
        if (res.data.token) localStorage.setItem("gm_token", res.data.token);
        setUser(res.data.user);
        return res.data.user;
    };

    const signup = async (email, password, name) => {
        const res = await api.post("/auth/signup", { email, password, name });
        if (res.data.token) localStorage.setItem("gm_token", res.data.token);
        setUser(res.data.user);
        return res.data.user;
    };

    const logout = async () => {
        try {
            await api.post("/auth/logout");
        } catch {
            // ignore network errors
        }
        localStorage.removeItem("gm_token");
        setUser(null);
    };

    const setSession = (userObj, token) => {
        if (token) localStorage.setItem("gm_token", token);
        setUser(userObj);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, logout, setSession, refresh: checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
