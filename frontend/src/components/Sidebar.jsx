import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
    SquaresFour,
    BookmarkSimple,
    Lightning,
    NotePencil,
    ChartLineUp,
    TerminalWindow,
    SignOut,
    Diamond,
    List,
    X,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";

const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: ChartLineUp, testid: "sidebar-nav-dashboard" },
    { to: "/directory", label: "Gold Sources", icon: SquaresFour, testid: "sidebar-nav-directory" },
    { to: "/vault", label: "Content Vault", icon: BookmarkSimple, testid: "sidebar-nav-vault" },
    { to: "/prompts", label: "Prompt Vault", icon: TerminalWindow, testid: "sidebar-nav-prompts" },
    { to: "/actions", label: "Action Loop", icon: Lightning, testid: "sidebar-nav-actions" },
    { to: "/notes", label: "Notes", icon: NotePencil, testid: "sidebar-nav-notes" },
];

export default function Sidebar({ open, onClose }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    return (
        <>
            {open && (
                <div
                    onClick={onClose}
                    className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm md:hidden"
                />
            )}
            <aside
                className={`fixed md:sticky top-0 left-0 z-40 h-screen w-[280px] shrink-0
                    border-r border-white/[0.06] bg-ink-base flex flex-col
                    transform transition-transform duration-300 ease-out
                    ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
            >
                <div className="flex items-center justify-between px-8 pt-8 pb-10">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 grid place-items-center border border-gold/40">
                            <Diamond size={18} weight="fill" className="text-gold" />
                        </div>
                        <div>
                            <div className="font-display text-lg leading-none tracking-tight">GoldMine</div>
                            <div className="tag-overline mt-1">Execution Hub</div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="md:hidden text-white/60 hover:text-white"
                        data-testid="sidebar-close-mobile"
                    >
                        <X size={18} />
                    </button>
                </div>

                <nav className="flex-1 px-4">
                    <div className="tag-overline px-4 mb-3">Workspace</div>
                    <ul className="space-y-1">
                        {navItems.map((item) => (
                            <li key={item.to}>
                                <NavLink
                                    to={item.to}
                                    onClick={onClose}
                                    data-testid={item.testid}
                                    className={({ isActive }) =>
                                        `group flex items-center gap-3 px-4 py-3 text-sm transition-colors
                                        ${isActive
                                            ? "text-gold bg-white/[0.03] border-l-2 border-gold pl-[14px]"
                                            : "text-white/60 hover:text-white hover:bg-white/[0.02] border-l-2 border-transparent pl-[14px]"
                                        }`
                                    }
                                >
                                    <item.icon size={18} weight="regular" />
                                    <span className="font-medium tracking-wide">{item.label}</span>
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="px-6 py-6 border-t border-white/[0.06]">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-9 w-9 rounded-full bg-ink-elevated grid place-items-center text-xs font-medium text-gold border border-white/5">
                            {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm truncate" data-testid="sidebar-user-name">{user?.name || "Member"}</div>
                            <div className="text-xs text-white/40 truncate">{user?.email}</div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        data-testid="sidebar-logout-button"
                        className="w-full flex items-center justify-center gap-2 py-2.5 text-xs uppercase tracking-[0.18em] text-white/50 hover:text-gold border border-white/[0.06] hover:border-gold/40 transition-all"
                    >
                        <SignOut size={14} /> Sign out
                    </button>
                </div>
            </aside>
        </>
    );
}

export function MobileTopbar({ onOpen }) {
    return (
        <div className="md:hidden sticky top-0 z-20 bg-ink-base/95 backdrop-blur border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
            <button onClick={onOpen} data-testid="sidebar-open-mobile" className="text-white/70 hover:text-white">
                <List size={20} />
            </button>
            <div className="flex items-center gap-2">
                <Diamond size={14} weight="fill" className="text-gold" />
                <span className="font-display tracking-tight">GoldMine</span>
            </div>
            <div className="w-5" />
        </div>
    );
}
