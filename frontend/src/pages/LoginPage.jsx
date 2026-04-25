import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Diamond, GoogleLogo, ArrowRight } from "@phosphor-icons/react";
import { toast } from "sonner";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const startGoogleAuth = () => {
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
};

const AUTH_BG =
    "https://images.unsplash.com/photo-1647101734210-ff5d79813069?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTZ8MHwxfHNlYXJjaHwyfHxkYXJrJTIwYWJzdHJhY3QlMjB0ZXh0dXJlJTIwZ29sZHxlbnwwfHx8fDE3NzcxMTQxODh8MA&ixlib=rb-4.1.0&q=85";

export function AuthShell({ children, title, subtitle }) {
    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-ink-base">
            <div className="hidden lg:block relative overflow-hidden">
                <img
                    src={AUTH_BG}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-70"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-ink-base/60 via-ink-base/30 to-ink-base/90" />
                <div className="relative z-10 h-full flex flex-col justify-between p-14">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 grid place-items-center border border-gold/40 bg-black/40">
                            <Diamond size={20} weight="fill" className="text-gold" />
                        </div>
                        <span className="font-display text-xl tracking-tight">GoldMine</span>
                    </div>
                    <div>
                        <p className="font-display font-light text-3xl xl:text-4xl leading-tight max-w-md">
                            Stop hoarding the scroll. <span className="text-gold">Mine the gold.</span> Execute on it.
                        </p>
                        <p className="text-white/50 mt-6 text-sm max-w-md">
                            A private execution hub for the content that actually moves you forward.
                        </p>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-center px-6 py-16 md:px-12">
                <div className="w-full max-w-md">
                    <div className="lg:hidden flex items-center gap-3 mb-12">
                        <div className="h-9 w-9 grid place-items-center border border-gold/40">
                            <Diamond size={16} weight="fill" className="text-gold" />
                        </div>
                        <span className="font-display text-lg tracking-tight">GoldMine</span>
                    </div>
                    <div className="tag-overline mb-3 text-gold/80">{subtitle}</div>
                    <h1 className="font-display font-light text-4xl md:text-5xl tracking-tight leading-tight mb-10">
                        {title}
                    </h1>
                    {children}
                </div>
            </div>
        </div>
    );
}

export function GoogleButton({ label }) {
    return (
        <button
            type="button"
            onClick={startGoogleAuth}
            data-testid="google-auth-button"
            className="w-full flex items-center justify-center gap-3 py-3.5 border border-white/10 hover:border-gold/50 hover:bg-white/[0.02] transition-all text-sm tracking-wide"
        >
            <GoogleLogo size={18} weight="bold" className="text-white" />
            {label}
        </button>
    );
}

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            await login(email, password);
            toast.success("Welcome back.");
            navigate("/dashboard");
        } catch (err) {
            toast.error(err?.response?.data?.detail || "Login failed");
        } finally {
            setBusy(false);
        }
    };

    return (
        <AuthShell subtitle="Sign in" title="Welcome back.">
            <GoogleButton label="Continue with Google" />
            <div className="flex items-center gap-4 my-8">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[10px] tracking-[0.22em] uppercase text-white/40">or</span>
                <div className="flex-1 h-px bg-white/10" />
            </div>
            <form onSubmit={submit} className="space-y-5">
                <div>
                    <label className="tag-overline mb-2 block">Email</label>
                    <input
                        data-testid="login-email-input"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-luxury w-full"
                        placeholder="you@goldmine.app"
                    />
                </div>
                <div>
                    <label className="tag-overline mb-2 block">Password</label>
                    <input
                        data-testid="login-password-input"
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-luxury w-full"
                        placeholder="••••••••"
                    />
                </div>
                <button
                    type="submit"
                    data-testid="login-submit-button"
                    disabled={busy}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-gold text-black hover:bg-gold-soft transition-colors text-sm font-medium tracking-wide disabled:opacity-50"
                >
                    {busy ? "Signing in…" : "Sign in"} <ArrowRight size={16} weight="bold" />
                </button>
            </form>
            <p className="mt-8 text-sm text-white/50">
                New here?{" "}
                <Link to="/signup" data-testid="link-to-signup" className="text-gold hover:text-gold-soft">
                    Create an account
                </Link>
            </p>
        </AuthShell>
    );
}
