import React, { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import Pill from "@/components/Pill";
import PlatformIcon, { PLATFORMS } from "@/components/PlatformIcon";
import { Plus, MagnifyingGlass, ArrowUpRight, Lightning, PencilSimple, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const EMPTY_IMG = "https://images.unsplash.com/photo-1659738943702-a22ddb8f87f1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTZ8MHwxfHNlYXJjaHwzfHxkYXJrJTIwYWJzdHJhY3QlMjB0ZXh0dXJlJTIwZ29sZHxlbnwwfHx8fDE3NzcxMTQxODh8MA&ixlib=rb-4.1.0&q=85";

function VaultForm({ open, onClose, onSaved, categories, editing }) {
    const [title, setTitle] = useState("");
    const [url, setUrl] = useState("");
    const [notes, setNotes] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [platform, setPlatform] = useState("");

    useEffect(() => {
        if (open) {
            setTitle(editing?.title || "");
            setUrl(editing?.url || "");
            setNotes(editing?.notes || "");
            setCategoryId(editing?.category_id || "");
            setPlatform(editing?.platform || "");
        }
    }, [open, editing]);

    const submit = async () => {
        if (!title.trim() || !url.trim()) return toast.error("Title and URL are required");
        const payload = { title: title.trim(), url: url.trim(), notes, category_id: categoryId || null, platform: platform || null };
        try {
            if (editing) await api.put(`/vault/${editing.id}`, payload);
            else await api.post("/vault", payload);
            toast.success(editing ? "Vault item updated" : "Saved to Vault");
            onSaved(); onClose();
        } catch (e) { toast.error("Failed to save"); }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="bg-ink-surface border border-white/[0.08] max-w-xl">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl tracking-tight">{editing ? "Edit item" : "Save to Vault"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <label className="tag-overline mb-2 block">Title</label>
                        <input data-testid="vault-title-input" className="input-luxury w-full" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div>
                        <label className="tag-overline mb-2 block">URL</label>
                        <input data-testid="vault-url-input" className="input-luxury w-full" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="tag-overline mb-2 block">Platform (auto)</label>
                            <select data-testid="vault-platform-select" className="input-luxury w-full" value={platform} onChange={(e) => setPlatform(e.target.value)}>
                                <option value="">Auto-detect</option>
                                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="tag-overline mb-2 block">Category</label>
                            <select data-testid="vault-category-select" className="input-luxury w-full" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                                <option value="">— Uncategorized —</option>
                                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="tag-overline mb-2 block">Notes</label>
                        <textarea data-testid="vault-notes-input" className="input-luxury w-full" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why is this gold?" />
                    </div>
                </div>
                <DialogFooter>
                    <button onClick={onClose} className="px-5 py-2.5 text-sm border border-white/10">Cancel</button>
                    <button data-testid="save-vault-button" onClick={submit} className="px-5 py-2.5 text-sm bg-gold text-black hover:bg-gold-soft">Save</button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function MoveToActionDialog({ open, onClose, onMoved, item }) {
    const [actionType, setActionType] = useState("Learn");
    const [deadline, setDeadline] = useState("");
    const [notes, setNotes] = useState("");

    useEffect(() => {
        if (open) { setActionType("Learn"); setDeadline(""); setNotes(""); }
    }, [open]);

    const submit = async () => {
        try {
            await api.post(`/vault/${item.id}/move-to-action`, {
                action_type: actionType,
                deadline: deadline || null,
                notes,
            });
            toast.success("Moved to Action Loop");
            onMoved(); onClose();
        } catch (e) { toast.error("Failed"); }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="bg-ink-surface border border-white/[0.08] max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl tracking-tight">Move to Action</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="text-sm text-white/60">{item?.title}</div>
                    <div>
                        <label className="tag-overline mb-2 block">Action Type</label>
                        <div className="flex gap-2">
                            {["Learn", "Build", "Try", "Share"].map((t) => (
                                <Pill key={t} active={actionType === t} onClick={() => setActionType(t)} testid={`action-type-${t}`}>{t}</Pill>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="tag-overline mb-2 block">Deadline</label>
                        <input data-testid="action-deadline-input" type="date" className="input-luxury w-full" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                    </div>
                    <div>
                        <label className="tag-overline mb-2 block">Notes (optional)</label>
                        <textarea className="input-luxury w-full" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <button onClick={onClose} className="px-5 py-2.5 text-sm border border-white/10">Cancel</button>
                    <button data-testid="confirm-move-action" onClick={submit} className="px-5 py-2.5 text-sm bg-gold text-black hover:bg-gold-soft inline-flex items-center gap-2">
                        <Lightning size={14} weight="fill" /> Create Action
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function VaultPage() {
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState("all");
    const [activePlatform, setActivePlatform] = useState("all");
    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [moveItem, setMoveItem] = useState(null);

    const load = async () => {
        const [v, c] = await Promise.all([api.get("/vault"), api.get("/categories")]);
        setItems(v.data); setCategories(c.data);
    };
    useEffect(() => { load(); }, []);

    const platformsInScope = useMemo(() => Array.from(new Set(items.map((i) => i.platform))), [items]);

    const filtered = useMemo(() => items.filter((i) => {
        if (activeCategory !== "all" && i.category_id !== activeCategory) return false;
        if (activePlatform !== "all" && i.platform !== activePlatform) return false;
        if (search.trim()) {
            const q = search.toLowerCase();
            if (!i.title.toLowerCase().includes(q) && !(i.notes || "").toLowerCase().includes(q)) return false;
        }
        return true;
    }), [items, activeCategory, activePlatform, search]);

    const removeItem = async (id) => {
        if (!confirm("Delete this item?")) return;
        await api.delete(`/vault/${id}`);
        toast.success("Removed"); load();
    };

    return (
        <div data-testid="vault-page">
            <SectionHeader
                overline="Content Vault"
                title="Saved gold. Not noise."
                description="Stash the links worth keeping. Filter by platform and category. Then move them to action."
                action={
                    <button onClick={() => { setEditing(null); setShowForm(true); }} data-testid="new-vault-button" className="px-5 py-2.5 text-sm bg-gold text-black hover:bg-gold-soft inline-flex items-center gap-2">
                        <Plus size={16} weight="bold" /> Save content
                    </button>
                }
            />

            <div className="relative mb-6 max-w-xl">
                <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input data-testid="vault-search" className="input-luxury w-full pl-10" placeholder="Search vault…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div className="mb-4">
                <div className="tag-overline mb-3">Categories</div>
                <div className="flex flex-wrap gap-2">
                    <Pill active={activeCategory === "all"} onClick={() => setActiveCategory("all")}>All</Pill>
                    {categories.map((c) => <Pill key={c.id} active={activeCategory === c.id} onClick={() => setActiveCategory(c.id)}>{c.name}</Pill>)}
                </div>
            </div>

            <div className="mb-10">
                <div className="tag-overline mb-3">Platforms</div>
                <div className="flex flex-wrap gap-2">
                    <Pill active={activePlatform === "all"} onClick={() => setActivePlatform("all")}>All</Pill>
                    {platformsInScope.map((p) => (
                        <Pill key={p} active={activePlatform === p} onClick={() => setActivePlatform(p)}>
                            <span className="inline-flex items-center gap-1.5"><PlatformIcon platform={p} size={11} /> {p}</span>
                        </Pill>
                    ))}
                </div>
            </div>

            {filtered.length === 0 ? (
                <EmptyState
                    image={EMPTY_IMG}
                    title={items.length === 0 ? "Your vault is empty" : "No matching items"}
                    description={items.length === 0
                        ? "The first save is the hardest. Drop a link and start mining the noise."
                        : "Try clearing some filters."}
                    action={items.length === 0 && (
                        <button onClick={() => setShowForm(true)} data-testid="empty-add-vault" className="px-5 py-2.5 text-sm bg-gold text-black hover:bg-gold-soft inline-flex items-center gap-2">
                            <Plus size={14} weight="bold" /> Save your first link
                        </button>
                    )}
                    testid="vault-empty"
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filtered.map((it) => {
                        const cat = categories.find((c) => c.id === it.category_id);
                        return (
                            <article key={it.id} data-testid={`vault-card-${it.id}`} className="luxury-card p-7 flex flex-col">
                                <div className="flex items-center gap-2 mb-3 text-xs">
                                    <span className="inline-flex items-center gap-1.5 text-white/50"><PlatformIcon platform={it.platform} size={12} /> {it.platform}</span>
                                    {cat && <><span className="text-white/20">·</span><span className="tag-overline text-gold/70">{cat.name}</span></>}
                                    {it.moved_to_action && <><span className="text-white/20">·</span><span className="text-[10px] tracking-[0.18em] uppercase text-gold inline-flex items-center gap-1"><Lightning size={10} weight="fill" /> Actioned</span></>}
                                </div>
                                <h3 className="font-display text-lg tracking-tight mb-2 leading-snug">{it.title}</h3>
                                {it.notes && <p className="text-sm text-white/50 leading-relaxed mb-5 line-clamp-3">{it.notes}</p>}
                                <div className="mt-auto flex items-center justify-between gap-3">
                                    <a href={it.url} target="_blank" rel="noopener noreferrer" data-testid={`vault-link-${it.id}`} className="inline-flex items-center gap-1.5 text-xs tracking-[0.18em] uppercase text-gold hover:text-gold-soft">
                                        Open <ArrowUpRight size={12} />
                                    </a>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setMoveItem(it)} data-testid={`move-to-action-${it.id}`} className="px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase border border-white/10 hover:border-gold/40 hover:text-gold inline-flex items-center gap-1.5">
                                            <Lightning size={11} /> Move to Action
                                        </button>
                                        <button onClick={() => { setEditing(it); setShowForm(true); }} className="p-1.5 text-white/40 hover:text-gold"><PencilSimple size={14} /></button>
                                        <button onClick={() => removeItem(it.id)} className="p-1.5 text-white/40 hover:text-gold-deep"><Trash size={14} /></button>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            <VaultForm open={showForm} onClose={() => setShowForm(false)} onSaved={load} categories={categories} editing={editing} />
            <MoveToActionDialog open={!!moveItem} onClose={() => setMoveItem(null)} onMoved={load} item={moveItem || {}} />
        </div>
    );
}
