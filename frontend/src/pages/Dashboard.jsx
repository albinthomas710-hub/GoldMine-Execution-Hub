import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import SectionHeader from "@/components/SectionHeader";
import { ArrowUpRight, Lightning, BookmarkSimple, CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

const fmt = (iso) => {
    if (!iso) return "—";
    try {
        const d = new Date(iso);
        return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
        return iso;
    }
};

function Stat({ label, value, hint, testid }) {
    return (
        <div className="border border-white/[0.06] bg-ink-surface p-8" data-testid={testid}>
            <div className="tag-overline mb-3">{label}</div>
            <div className="font-display text-4xl md:text-5xl tracking-tight">{value}</div>
            {hint && <div className="text-white/40 text-xs mt-2">{hint}</div>}
        </div>
    );
}

export default function Dashboard() {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        api.get("/dashboard/stats").then((r) => setStats(r.data)).catch(() => {});
    }, []);

    const score = stats?.accountability_score ?? 0;
    const ratio = stats?.save_to_action_ratio ?? 0;
    const ratioPct = Math.min(100, Math.round(ratio * 100));

    return (
        <div data-testid="dashboard-page">
            <SectionHeader
                overline="Execution"
                title="The gap between consuming and doing — visible."
                description="Tracking the truth: what you save versus what you actually act on."
            />

            {/* Hero accountability score */}
            <div className="border border-white/[0.06] bg-ink-surface p-10 md:p-16 mb-10 relative overflow-hidden">
                <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-gold/10" />
                <div className="absolute -right-16 top-12 h-40 w-40 rounded-full border border-gold/20" />
                <div className="relative">
                    <div className="tag-overline mb-6 text-gold/80">Accountability Score</div>
                    <div
                        className="font-display font-light text-7xl md:text-[10rem] leading-[0.9] tracking-tight"
                        data-testid="accountability-score"
                    >
                        {score}
                        <span className="text-gold/70 text-5xl md:text-7xl ml-2">%</span>
                    </div>
                    <div className="mt-6 text-white/50 text-sm max-w-md">
                        Of everything you saved, this is what you actually executed on.
                    </div>
                </div>
            </div>

            {/* Stat row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <Stat
                    label="Save-to-Action"
                    value={`${ratioPct}%`}
                    hint={`${stats?.total_actions || 0} of ${stats?.total_saved || 0} saved`}
                    testid="stat-save-to-action"
                />
                <Stat
                    label="Saved this week"
                    value={stats?.saved_this_week ?? 0}
                    hint="In the last 7 days"
                    testid="stat-saved-week"
                />
                <Stat
                    label="Completed this week"
                    value={stats?.completed_this_week ?? 0}
                    hint="Closed action cards"
                    testid="stat-completed-week"
                />
            </div>

            {/* By type + Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
                <div className="border border-white/[0.06] bg-ink-surface p-8">
                    <div className="tag-overline mb-6">By Action Type</div>
                    <div className="space-y-5">
                        {["Learn", "Build", "Try", "Share"].map((t) => {
                            const v = stats?.by_type?.[t] || 0;
                            const total = stats?.total_actions || 1;
                            const pct = Math.round((v / total) * 100);
                            return (
                                <div key={t}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-white/70">{t}</span>
                                        <span className="text-xs text-white/40 tracking-wide">{v}</span>
                                    </div>
                                    <div className="h-px bg-white/[0.06]">
                                        <div className="h-px bg-gold transition-all" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="border border-white/[0.06] bg-ink-surface p-8">
                    <div className="tag-overline mb-6">Status Breakdown</div>
                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <div className="text-3xl font-display tracking-tight">{stats?.not_started ?? 0}</div>
                            <div className="text-xs text-white/40 mt-2 tracking-wider uppercase">Not Started</div>
                        </div>
                        <div>
                            <div className="text-3xl font-display tracking-tight text-gold">{stats?.in_progress ?? 0}</div>
                            <div className="text-xs text-gold/60 mt-2 tracking-wider uppercase">In Progress</div>
                        </div>
                        <div>
                            <div className="text-3xl font-display tracking-tight">{stats?.done_actions ?? 0}</div>
                            <div className="text-xs text-white/40 mt-2 tracking-wider uppercase">Done</div>
                        </div>
                    </div>
                    <div className="gold-divider my-8" />
                    <div className="flex flex-wrap gap-3 text-xs">
                        <Link to="/vault" className="inline-flex items-center gap-1.5 text-white/50 hover:text-gold">
                            <BookmarkSimple size={14} /> Open Vault <ArrowUpRight size={12} />
                        </Link>
                        <Link to="/actions" className="inline-flex items-center gap-1.5 text-white/50 hover:text-gold">
                            <Lightning size={14} /> Action Loop <ArrowUpRight size={12} />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Overdue */}
            <div className="border border-white/[0.06] bg-ink-surface p-8" data-testid="overdue-block">
                <div className="flex items-center justify-between mb-6">
                    <div className="tag-overline">Overdue</div>
                    <span className="text-xs text-white/40">{stats?.overdue?.length || 0} item(s)</span>
                </div>
                {(!stats?.overdue || stats.overdue.length === 0) ? (
                    <div className="flex items-center gap-3 text-white/50 text-sm">
                        <CheckCircle size={18} className="text-gold" /> Nothing overdue. You're on the rails.
                    </div>
                ) : (
                    <ul className="divide-y divide-white/[0.06]">
                        {stats.overdue.map((a) => (
                            <li key={a.id} className="py-4 flex items-center justify-between gap-4">
                                <div className="flex items-start gap-3 min-w-0">
                                    <WarningCircle size={18} className="text-gold-deep mt-0.5" />
                                    <div className="min-w-0">
                                        <div className="text-sm truncate">{a.title}</div>
                                        <div className="text-xs text-white/40 mt-1">
                                            {a.action_type} · Due {fmt(a.deadline)}
                                        </div>
                                    </div>
                                </div>
                                <Link to="/actions" className="text-xs tracking-[0.18em] uppercase text-gold hover:text-gold-soft">Resolve</Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
