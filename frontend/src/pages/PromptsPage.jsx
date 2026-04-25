import React, { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import Pill from "@/components/Pill";
import { Plus, MagnifyingGlass, Copy, PencilSimple, Trash, Check } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

const EMPTY_IMG = "https://images.unsplash.com/photo-1659738943702-a22ddb8f87f1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTZ8MHwxfHNlYXJjaHwzfHxkYXJrJTIwYWJzdHJhY3QlMjB0ZXh0dXJlJTIwZ29sZHxlbnwwfHx8fDE3NzcxMTQxODh8MA&ixlib=rb-4.1.0&q=85";

function PromptForm({ open, onClose, onSaved, categories, editing }) {
    const [title, setTitle] = useState("");
    const [text, setText] = useState("");
    const [categoryId, setCategoryId] = useState("");
    useEffect(() => {
        if (open) {
            setTitle(editing?.title || "");
            setText(editing?.prompt_text || "");
            setCategoryId(editing?.category_id || "");
        }
    }, [open, editing]);
    const submit = async () => {
        if (!title.trim() || !text.trim()) return toast.error("Title and prompt are required");
        const payload = { title: title.trim(), prompt_text: text, category_id: categoryId || null };
        try {
            if (editing) await api.put(`/prompts/${editing.id}`, payload);
            else await api.post("/prompts", payload);
            toast.success(editing ? "Prompt updated" : "Prompt saved");
            onSaved(); onClose();
        } catch { toast.error("Failed"); }
    };
    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="bg-ink-surface border border-white/[0.08] max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl tracking-tight">{editing ? "Edit prompt" : "Save a prompt"}</DialogTitle>
                    <DialogDescription className="sr-only">Save a reusable AI prompt with a title and category.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <input data-testid="prompt-title-input" className="input-luxury w-full" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    <textarea data-testid="prompt-text-input" className="input-luxury w-full font-mono text-xs" rows={8} placeholder="Paste your prompt here…" value={text} onChange={(e) => setText(e.target.value)} />
                    <select data-testid="prompt-category-select" className="input-luxury w-full" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                        <option value="">— Uncategorized —</option>
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <DialogFooter>
                    <button onClick={onClose} className="px-5 py-2.5 text-sm border border-white/10">Cancel</button>
                    <button data-testid="save-prompt-button" onClick={submit} className="px-5 py-2.5 text-sm bg-gold text-black hover:bg-gold-soft">Save</button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function PromptsPage() {
    const [prompts, setPrompts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState("all");
    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [copiedId, setCopiedId] = useState(null);

    const load = async () => {
        const [p, c] = await Promise.all([api.get("/prompts"), api.get("/categories")]);
        setPrompts(p.data); setCategories(c.data);
    };
    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => prompts.filter((p) => {
        if (activeCategory !== "all" && p.category_id !== activeCategory) return false;
        if (search.trim()) {
            const q = search.toLowerCase();
            if (!p.title.toLowerCase().includes(q) && !p.prompt_text.toLowerCase().includes(q)) return false;
        }
        return true;
    }), [prompts, activeCategory, search]);

    const copy = async (p) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(p.prompt_text);
            } else {
                const ta = document.createElement("textarea");
                ta.value = p.prompt_text;
                ta.style.position = "fixed";
                ta.style.opacity = "0";
                document.body.appendChild(ta);
                ta.select();
                document.execCommand("copy");
                document.body.removeChild(ta);
            }
            setCopiedId(p.id);
            toast.success("Copied to clipboard");
            setTimeout(() => setCopiedId(null), 1500);
        } catch (e) {
            toast.error("Copy failed — please copy manually");
        }
    };

    const remove = async (id) => {
        if (!confirm("Delete this prompt?")) return;
        await api.delete(`/prompts/${id}`);
        toast.success("Deleted"); load();
    };

    return (
        <div data-testid="prompts-page">
            <SectionHeader
                overline="Prompt Vault"
                title="The prompts that earn their keep."
                description="Your personal library of prompts that produce gold. One click to copy."
                action={
                    <button onClick={() => { setEditing(null); setShowForm(true); }} data-testid="new-prompt-button" className="px-5 py-2.5 text-sm bg-gold text-black hover:bg-gold-soft inline-flex items-center gap-2">
                        <Plus size={16} weight="bold" /> Save prompt
                    </button>
                }
            />

            <div className="relative mb-6 max-w-xl">
                <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input data-testid="prompts-search" className="input-luxury w-full pl-10" placeholder="Search prompts…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div className="mb-10 flex flex-wrap gap-2">
                <Pill active={activeCategory === "all"} onClick={() => setActiveCategory("all")}>All</Pill>
                {categories.map((c) => <Pill key={c.id} active={activeCategory === c.id} onClick={() => setActiveCategory(c.id)}>{c.name}</Pill>)}
            </div>

            {filtered.length === 0 ? (
                <EmptyState
                    image={EMPTY_IMG}
                    title={prompts.length === 0 ? "No prompts saved" : "No matches"}
                    description={prompts.length === 0 ? "Save your first prompt that consistently delivers gold." : "Try a different filter."}
                    action={prompts.length === 0 && (
                        <button onClick={() => setShowForm(true)} className="px-5 py-2.5 text-sm bg-gold text-black hover:bg-gold-soft inline-flex items-center gap-2" data-testid="empty-add-prompt">
                            <Plus size={14} weight="bold" /> Save first prompt
                        </button>
                    )}
                    testid="prompts-empty"
                />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filtered.map((p) => {
                        const cat = categories.find((c) => c.id === p.category_id);
                        return (
                            <article key={p.id} data-testid={`prompt-card-${p.id}`} className="luxury-card p-7 flex flex-col">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div>
                                        {cat && <div className="tag-overline mb-2 text-gold/70">{cat.name}</div>}
                                        <h3 className="font-display text-lg tracking-tight">{p.title}</h3>
                                    </div>
                                </div>
                                <pre className="font-mono text-xs text-white/70 whitespace-pre-wrap leading-relaxed bg-ink-base/50 border border-white/[0.04] p-4 max-h-48 overflow-auto mb-5">{p.prompt_text}</pre>
                                <div className="mt-auto flex items-center justify-between">
                                    <button onClick={() => copy(p)} data-testid={`copy-prompt-${p.id}`} className="inline-flex items-center gap-2 text-xs tracking-[0.18em] uppercase text-gold hover:text-gold-soft">
                                        {copiedId === p.id ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                                    </button>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setEditing(p); setShowForm(true); }} className="p-1.5 text-white/40 hover:text-gold"><PencilSimple size={14} /></button>
                                        <button onClick={() => remove(p.id)} className="p-1.5 text-white/40 hover:text-gold-deep"><Trash size={14} /></button>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            <PromptForm open={showForm} onClose={() => setShowForm(false)} onSaved={load} categories={categories} editing={editing} />
        </div>
    );
}
