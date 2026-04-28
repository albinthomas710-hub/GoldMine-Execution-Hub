import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "@/lib/api";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import Pill from "@/components/Pill";
import PlatformIcon, { PLATFORMS } from "@/components/PlatformIcon";
import PlatformFilterBar from "@/components/PlatformFilterBar";
import { usePlatforms } from "@/hooks/usePlatforms";
import { Plus, MagnifyingGlass, Trash, PencilSimple, ArrowUpRight, TextB, TextItalic, ListBullets, ListNumbers } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

const EMPTY_IMG = "https://images.unsplash.com/photo-1659738943702-a22ddb8f87f1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTZ8MHwxfHNlYXJjaHwzfHxkYXJrJTIwYWJzdHJhY3QlMjB0ZXh0dXJlJTIwZ29sZHxlbnwwfHx8fDE3NzcxMTQxODh8MA&ixlib=rb-4.1.0&q=85";

function RichTextEditor({ value, onChange, testid }) {
    const ref = useRef(null);
    const setHtml = (html) => {
        if (ref.current && ref.current.innerHTML !== html) ref.current.innerHTML = html || "";
    };
    useEffect(() => { setHtml(value); }, [value]);
    const cmd = (c) => { document.execCommand(c, false, null); ref.current?.focus(); onChange(ref.current?.innerHTML || ""); };
    return (
        <div>
            <div className="flex gap-1 mb-2 border border-white/[0.08] bg-ink-base px-2 py-1.5 w-fit">
                <button type="button" onClick={() => cmd("bold")} className="p-1.5 text-white/60 hover:text-gold"><TextB size={14} weight="bold" /></button>
                <button type="button" onClick={() => cmd("italic")} className="p-1.5 text-white/60 hover:text-gold"><TextItalic size={14} weight="bold" /></button>
                <button type="button" onClick={() => cmd("insertUnorderedList")} className="p-1.5 text-white/60 hover:text-gold"><ListBullets size={14} /></button>
                <button type="button" onClick={() => cmd("insertOrderedList")} className="p-1.5 text-white/60 hover:text-gold"><ListNumbers size={14} /></button>
            </div>
            <div
                ref={ref}
                contentEditable
                data-testid={testid}
                onInput={(e) => onChange(e.currentTarget.innerHTML)}
                className="input-luxury w-full min-h-[180px] prose-invert prose-sm leading-relaxed"
                style={{ outline: "none" }}
                suppressContentEditableWarning
            />
        </div>
    );
}

function NoteForm({ open, onClose, onSaved, categories, editing, platformNames }) {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [platform, setPlatform] = useState("");
    const [link, setLink] = useState("");

    useEffect(() => {
        if (open) {
            setTitle(editing?.title || "");
            setContent(editing?.content || "");
            setCategoryId(editing?.category_id || "");
            setPlatform(editing?.source_platform || "");
            setLink(editing?.source_link || "");
        }
    }, [open, editing]);

    const submit = async () => {
        if (!title.trim()) return toast.error("Title required");
        const payload = { title: title.trim(), content, category_id: categoryId || null, source_platform: platform || null, source_link: link || null };
        try {
            if (editing) await api.put(`/notes/${editing.id}`, payload);
            else await api.post("/notes", payload);
            toast.success(editing ? "Note updated" : "Note saved");
            onSaved(); onClose();
        } catch { toast.error("Failed"); }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="bg-ink-surface border border-white/[0.08] max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl tracking-tight">{editing ? "Edit note" : "New note"}</DialogTitle>
                    <DialogDescription className="sr-only">Capture a thought or learning with optional source link.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <input data-testid="note-title-input" className="input-luxury w-full" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    <RichTextEditor value={content} onChange={setContent} testid="note-content-input" />
                    <div className="grid grid-cols-2 gap-3">
                        <select className="input-luxury w-full" value={platform} onChange={(e) => setPlatform(e.target.value)}>
                            <option value="">Source platform (optional)</option>
                            {platformNames.map((p) => <option key={p}>{p}</option>)}
                        </select>
                        <select className="input-luxury w-full" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                            <option value="">— Uncategorized —</option>
                            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <input className="input-luxury w-full" placeholder="Source link (optional)" value={link} onChange={(e) => setLink(e.target.value)} />
                </div>
                <DialogFooter>
                    <button onClick={onClose} className="px-5 py-2.5 text-sm border border-white/10">Cancel</button>
                    <button data-testid="save-note-button" onClick={submit} className="px-5 py-2.5 text-sm bg-gold text-black hover:bg-gold-soft">Save</button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function NotesPage() {
    const [notes, setNotes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState("all");
    const [activePlatform, setActivePlatform] = useState("all");
    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const platforms = usePlatforms();

    const load = async () => {
        const [n, c] = await Promise.all([api.get("/notes"), api.get("/categories")]);
        setNotes(n.data); setCategories(c.data);
    };
    useEffect(() => { load(); }, []);

    const platformsInScope = useMemo(() => {
        const set = new Set(notes.map((n) => n.source_platform).filter(Boolean));
        platforms.names.forEach((p) => set.add(p));
        return Array.from(set);
    }, [notes, platforms.names]);

    const filtered = useMemo(() => notes.filter((n) => {
        if (activeCategory !== "all" && n.category_id !== activeCategory) return false;
        if (activePlatform !== "all" && n.source_platform !== activePlatform) return false;
        if (search.trim()) {
            const q = search.toLowerCase();
            if (!n.title.toLowerCase().includes(q) && !(n.content || "").toLowerCase().includes(q)) return false;
        }
        return true;
    }), [notes, activeCategory, activePlatform, search]);

    const remove = async (id) => {
        if (!confirm("Delete this note?")) return;
        await api.delete(`/notes/${id}`);
        toast.success("Deleted"); load();
    };

    return (
        <div data-testid="notes-page">
            <SectionHeader
                overline="Notes"
                title="Capture, while it's still hot."
                description="The thoughts, summaries, and lessons that surface mid-scroll. Don't lose them."
                action={
                    <button onClick={() => { setEditing(null); setShowForm(true); }} data-testid="new-note-button" className="px-5 py-2.5 text-sm bg-gold text-black hover:bg-gold-soft inline-flex items-center gap-2">
                        <Plus size={16} weight="bold" /> New note
                    </button>
                }
            />

            <div className="relative mb-6 max-w-xl">
                <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input data-testid="notes-search" className="input-luxury w-full pl-10" placeholder="Search notes…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
                <Pill active={activeCategory === "all"} onClick={() => setActiveCategory("all")}>All categories</Pill>
                {categories.map((c) => <Pill key={c.id} active={activeCategory === c.id} onClick={() => setActiveCategory(c.id)}>{c.name}</Pill>)}
            </div>
            <div className="mb-10">
                <div className="tag-overline mb-3">Platforms</div>
                <PlatformFilterBar
                    options={platformsInScope}
                    active={activePlatform}
                    onChange={setActivePlatform}
                    custom={platforms.custom}
                    onAdd={platforms.add}
                    onRemoveCustom={platforms.remove}
                />
            </div>

            {filtered.length === 0 ? (
                <EmptyState
                    image={EMPTY_IMG}
                    title={notes.length === 0 ? "Nothing captured yet" : "No matches"}
                    description={notes.length === 0 ? "First note in: a thought, a summary, a one-liner from something you saved." : "Try a different filter."}
                    action={notes.length === 0 && (
                        <button onClick={() => setShowForm(true)} data-testid="empty-add-note" className="px-5 py-2.5 text-sm bg-gold text-black hover:bg-gold-soft inline-flex items-center gap-2">
                            <Plus size={14} weight="bold" /> Write first note
                        </button>
                    )}
                    testid="notes-empty"
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filtered.map((n) => {
                        const cat = categories.find((c) => c.id === n.category_id);
                        return (
                            <article key={n.id} data-testid={`note-card-${n.id}`} className="luxury-card p-7 flex flex-col">
                                <div className="flex items-center gap-2 mb-3 text-xs">
                                    {n.source_platform && <span className="inline-flex items-center gap-1.5 text-white/50"><PlatformIcon platform={n.source_platform} size={12} /> {n.source_platform}</span>}
                                    {cat && <><span className="text-white/20">·</span><span className="tag-overline text-gold/70">{cat.name}</span></>}
                                </div>
                                <h3 className="font-display text-lg tracking-tight mb-3 leading-snug">{n.title}</h3>
                                <div className="prose prose-invert prose-sm text-white/60 max-w-none line-clamp-4 mb-5" dangerouslySetInnerHTML={{ __html: n.content || "" }} />
                                <div className="mt-auto flex items-center justify-between">
                                    {n.source_link ? (
                                        <a href={n.source_link} target="_blank" rel="noopener noreferrer" className="text-xs tracking-[0.18em] uppercase text-gold hover:text-gold-soft inline-flex items-center gap-1.5">Source <ArrowUpRight size={11} /></a>
                                    ) : <span className="text-xs text-white/30">{new Date(n.updated_at).toLocaleDateString()}</span>}
                                    <div className="flex gap-2">
                                        <button onClick={() => { setEditing(n); setShowForm(true); }} className="p-1.5 text-white/40 hover:text-gold"><PencilSimple size={14} /></button>
                                        <button onClick={() => remove(n.id)} className="p-1.5 text-white/40 hover:text-gold-deep"><Trash size={14} /></button>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            <NoteForm open={showForm} onClose={() => setShowForm(false)} onSaved={load} categories={categories} editing={editing} platformNames={platforms.names} />
        </div>
    );
}
