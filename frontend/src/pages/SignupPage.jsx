import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ArrowRight } from "@phosphor-icons/react";
import { AuthShell, GoogleButton } from "./LoginPage";
import { toast } from "sonner";

export default function SignupPage() {
    const { signup } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            await signup(email, password, name);
            toast.success("Account created.");
            navigate("/dashboard");
        } catch (err) {
            toast.error(err?.response?.data?.detail || "Signup failed");
        } finally {
            setBusy(false);
        }
    };

    return (
        <AuthShell subtitle="Get started" title="Build your gold mine.">
            <GoogleButton label="Sign up with Google" />
            <div className="flex items-center gap-4 my-8">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[10px] tracking-[0.22em] uppercase text-white/40">or</span>
                <div className="flex-1 h-px bg-white/10" />
            </div>
            <form onSubmit={submit} className="space-y-5">
                <div>
                    <label className="tag-overline mb-2 block">Name</label>
                    <input
                        data-testid="signup-name-input"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="input-luxury w-full"
                        placeholder="Your name"
                    />
                </div>
                <div>
                    <label className="tag-overline mb-2 block">Email</label>
                    <input
                        data-testid="signup-email-input"
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
                        data-testid="signup-password-input"
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-luxury w-full"
                        placeholder="At least 6 characters"
                    />
                </div>
                <button
                    type="submit"
                    data-testid="signup-submit-button"
                    disabled={busy}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-gold text-black hover:bg-gold-soft transition-colors text-sm font-medium tracking-wide disabled:opacity-50"
                >
                    {busy ? "Creating…" : "Create account"} <ArrowRight size={16} weight="bold" />
                </button>
            </form>
            <p className="mt-8 text-sm text-white/50">
                Already have an account?{" "}
                <Link to="/login" data-testid="link-to-login" className="text-gold hover:text-gold-soft">
                    Sign in
                </Link>
            </p>
        </AuthShell>
    );
}
