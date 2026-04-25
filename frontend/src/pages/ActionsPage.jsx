import React, { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import Pill from "@/components/Pill";
import { Plus, ArrowUpRight, Trash, PencilSimple, Lightning, CalendarBlank, MagnifyingGlass } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

const EMPTY_IMG = "https://images.pexels.com/photos/21031387/pexels-photo-21031387.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

const TYPES = ["Learn", "Build", "Try", "Share"];
const STATUSES = ["Not Started", "In Progress", "Done"];

function ActionForm({ open, onClose, onSaved, editing }) {
    const [title, setTitle] = useState("");
    const [actionType, setActionType] = useState("Learn");
    const [deadline, setDeadline] = useState("");
    const [status, setStatus] = useState("Not Started");
    const [notes, setNotes] = useState("");
    const [sourceUrl, setSourceUrl] = useState("");

    useEffect(() => {
        if (open) {
            setTitle(editing?.title || "");
            setActionType(editing?.action_type || "Learn");
            setDeadline(editing?.deadline || "");
            setStatus(editing?.status || "Not Started");
            setNotes(editing?.notes || "");
            setSourceUrl(editing?.source_url || "");
        }
    }, [open, editing]);

    const submit = async () => {
        if (!title.trim()) return toast.error("Title required");
        const payload = {
            title: title.trim(),
            action_type: actionType,
            deadline: deadline || null,
            status,
            notes,
            source_url: sourceUrl || null,
            vault_item_id: editing?.vault_item_id || null,
        };
        try {
            if (editing) await api.put(`/actions/${editing.id}`, payload);
            else await api.post("/actions", payload);
            toast.success(editing ? "Action updated" : "Action created");
            onSaved(); onClose();
        } catch { toast.error("Failed"); }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="bg-ink-surface border border-white/[0.08] max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl tracking-tight">{editing ? "Edit action" : "New action"}</DialogTitle>
                    <DialogDescription className="sr-only">Define an action card with type, deadline, and status.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <input data-testid="action-title-input" className="input-luxury w-full" placeholder="What needs doing?" value={title} onChange={(e) => setTitle(e.target.value)} />
                    <input className="input-luxury w-full" placeholder="Source URL (optional)" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
                    <div>
                        <label className="tag-overline mb-2 block">Type</label>
                        <div className="flex gap-2 flex-wrap">{TYPES.map((t) => <Pill key={t} active={actionType === t} onClick={() => setActionType(t)}>{t}</Pill>)}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="tag-overline mb-2 block">Deadline</label>
                            <input type="date" data-testid="action-form-deadline" className="input-luxury w-full" value={deadline || ""} onChange={(e) => setDeadline(e.target.value)} />
                        </div>
                        <div>
                            <label className="tag-overline mb-2 block">Status</label>
                            <select data-testid="action-form-status" className="input-luxury w-full" value={status} onChange={(e) => setStatus(e.target.value)}>
                                {STATUSES.map((s) => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                    <textarea className="input-luxury w-full" rows={3} placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <DialogFooter>
                    <button onClick={onClose} className="px-5 py-2.5 text-sm border border-white/10">Cancel</button>
                    <button data-testid="save-action-button" onClick={submit} className="px-5 py-2.5 text-sm bg-gold text-black hover:bg-gold-soft">Save</button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const fmt = (iso) => {
    if (!iso) return null;
    try { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
    catch { return iso; }
};

export default function ActionsPage() {
    const [actions, setActions] = useState([]);
    const [activeType, setActiveType] = useState("all");
    const [activeStatus, setActiveStatus] = useState("all");
    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);

    const load = async () => {
        const r = await api.get("/actions");
        setActions(r.data);
    };
    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => actions.filter((a) => {
        if (activeType !== "all" && a.action_type !== activeType) return false;
        if (activeStatus !== "all" && a.status !== activeStatus) return false;
        if (search.trim()) {
            const q = search.toLowerCase();
            if (!a.title.toLowerCase().includes(q) && !(a.notes || "").toLowerCase().includes(q)) return false;
        }
        return true;
    }), [actions, activeType, activeStatus, search]);

    const updateStatus = async (a, next) => {
        try {
            await api.put(`/actions/${a.id}`, { ...a, status: next });
            load();
        } catch { toast.error("Failed"); }
    };

    const remove = async (id) => {
        if (!confirm("Delete this action?")) return;
        await api.delete(`/actions/${id}`);
        toast.success("Deleted"); load();
    };

    const today = new Date().toISOString().slice(0, 10);

    return (
        <div data-testid="actions-page">
            <SectionHeader
                overline="Action Loop"
                title="Where saves become deeds."
                description="Every action card pushes a saved idea into motion. Set a type, set a deadline, ship."
                action={
                    <button onClick={() => { setEditing(null); setShowForm(true); }} data-testid="new-action-button" className="px-5 py-2.5 text-sm bg-gold text-black hover:bg-gold-soft inline-flex items-center gap-2">
                        <Plus size={16} weight="bold" /> New action
                    </button>
                }
            />

            <div className="relative mb-6 max-w-xl">
                <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input data-testid="actions-search" className="input-luxury w-full pl-10" placeholder="Search actions…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div className="mb-4">
                <div className="tag-overline mb-3">Type</div>
                <div className="flex gap-2 flex-wrap">
                    <Pill active={activeType === "all"} onClick={() => setActiveType("all")}>All</Pill>
                    {TYPES.map((t) => <Pill key={t} active={activeType === t} onClick={() => setActiveType(t)}>{t}</Pill>)}
                </div>
            </div>
            <div className="mb-10">
                <div className="tag-overline mb-3">Status</div>
                <div className="flex gap-2 flex-wrap">
                    <Pill active={activeStatus === "all"} onClick={() => setActiveStatus("all")}>All</Pill>
                    {STATUSES.map((s) => <Pill key={s} active={activeStatus === s} onClick={() => setActiveStatus(s)}>{s}</Pill>)}
                </div>
            </div>

            {filtered.length === 0 ? (
                <EmptyState
                    image={EMPTY_IMG}
                    title={actions.length === 0 ? "No actions yet" : "No matches"}
                    description={actions.length === 0
                        ? "Move something from the Vault to start the loop. Or create an action directly."
                        : "Adjust your filter."}
                    action={actions.length === 0 && (
                        <button onClick={() => setShowForm(true)} data-testid="empty-add-action" className="px-5 py-2.5 text-sm bg-gold text-black hover:bg-gold-soft inline-flex items-center gap-2">
                            <Lightning size={14} weight="bold" /> Create first action
                        </button>
                    )}
                    testid="actions-empty"
                />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filtered.map((a) => {
                        const overdue = a.deadline && a.deadline < today && a.status !== "Done";
                        return (
                            <article key={a.id} data-testid={`action-card-${a.id}`} className={`luxury-card p-7 ${overdue ? "border-gold/30" : ""}`}>
                                <div className="flex items-center gap-3 mb-3 text-xs">
                                    <span className={`px-2 py-0.5 border ${a.action_type === "Build" ? "border-gold/40 text-gold" : "border-white/10 text-white/60"} text-[10px] tracking-[0.18em] uppercase`}>{a.action_type}</span>
                                    <span className={`px-2 py-0.5 border text-[10px] tracking-[0.18em] uppercase ${a.status === "In Progress" ? "border-gold/40 text-gold" : a.status === "Done" ? "border-white/10 text-white/40 line-through" : "border-white/10 text-white/60"}`}>{a.status}</span>
                                    {overdue && <span className="text-[10px] tracking-[0.18em] uppercase text-gold-deep">Overdue</span>}
                                </div>
                                <h3 className={`font-display text-lg tracking-tight mb-2 leading-snug ${a.status === "Done" ? "text-white/40 line-through" : ""}`}>{a.title}</h3>
                                {a.notes && <p className="text-sm text-white/50 leading-relaxed mb-4">{a.notes}</p>}
                                <div className="flex items-center gap-4 text-xs text-white/40 mb-5">
                                    {a.deadline && <span className="inline-flex items-center gap-1.5"><CalendarBlank size={12} /> {fmt(a.deadline)}</span>}
                                    {a.source_url && <a href={a.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-gold">Source <ArrowUpRight size={10} /></a>}
                                </div>
                                <div className="flex items-center justify-between">
                                    <select data-testid={`status-select-${a.id}`} value={a.status} onChange={(e) => updateStatus(a, e.target.value)} className="input-luxury text-xs py-1.5 px-2 w-auto">
                                        {STATUSES.map((s) => <option key={s}>{s}</option>)}
                                    </select>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setEditing(a); setShowForm(true); }} className="p-1.5 text-white/40 hover:text-gold"><PencilSimple size={14} /></button>
                                        <button onClick={() => remove(a.id)} className="p-1.5 text-white/40 hover:text-gold-deep"><Trash size={14} /></button>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            <ActionForm open={showForm} onClose={() => setShowForm(false)} onSaved={load} editing={editing} />
        </div>
    );
}
