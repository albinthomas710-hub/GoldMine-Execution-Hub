import React, { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import Pill from "@/components/Pill";
import PlatformIcon, { PLATFORMS } from "@/components/PlatformIcon";
import PlatformFilterBar from "@/components/PlatformFilterBar";
import { usePlatforms } from "@/hooks/usePlatforms";
import { Plus, MagnifyingGlass, ArrowUpRight, PencilSimple, Trash, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

const EMPTY_IMG = "https://images.unsplash.com/photo-1659738943702-a22ddb8f87f1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTZ8MHwxfHNlYXJjaHwzfHxkYXJrJTIwYWJzdHJhY3QlMjB0ZXh0dXJlJTIwZ29sZHxlbnwwfHx8fDE3NzcxMTQxODh8MA&ixlib=rb-4.1.0&q=85";

function CreatorForm({ open, onClose, onSaved, categories, editing, platformNames }) {
    const [name, setName] = useState("");
    const [bio, setBio] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [links, setLinks] = useState([{ platform: "X", url: "" }]);

    useEffect(() => {
        if (open) {
            setName(editing?.name || "");
            setBio(editing?.bio || "");
            setCategoryId(editing?.category_id || "");
            setLinks(editing?.links?.length ? editing.links : [{ platform: "X", url: "" }]);
        }
    }, [open, editing]);

    const addLink = () => setLinks((l) => [...l, { platform: "Instagram", url: "" }]);
    const updateLink = (i, key, value) =>
        setLinks((l) => l.map((x, idx) => (idx === i ? { ...x, [key]: value } : x)));
    const removeLink = (i) => setLinks((l) => l.filter((_, idx) => idx !== i));

    const submit = async () => {
        if (!name.trim()) return toast.error("Name is required");
        const payload = {
            name: name.trim(),
            bio: bio.trim(),
            category_id: categoryId || null,
            links: links.filter((l) => l.url.trim()).map((l) => ({ platform: l.platform, url: l.url.trim() })),
        };
        try {
            if (editing) await api.put(`/creators/${editing.id}`, payload);
            else await api.post("/creators", payload);
            toast.success(editing ? "Creator updated" : "Creator added");
            onSaved();
            onClose();
        } catch (e) {
            toast.error(e?.response?.data?.detail || "Failed to save");
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="bg-ink-surface border border-white/[0.08] text-foreground max-w-xl">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl tracking-tight">
                        {editing ? "Edit creator" : "Add a creator"}
                    </DialogTitle>
                    <DialogDescription className="sr-only">Add a curated creator with bio, category, and platform links.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <label className="tag-overline mb-2 block">Name</label>
                        <input data-testid="creator-name-input" className="input-luxury w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Naval Ravikant" />
                    </div>
                    <div>
                        <label className="tag-overline mb-2 block">Bio</label>
                        <textarea data-testid="creator-bio-input" className="input-luxury w-full" rows={2} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Short description" />
                    </div>
                    <div>
                        <label className="tag-overline mb-2 block">Category</label>
                        <select data-testid="creator-category-select" className="input-luxury w-full" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                            <option value="">— Uncategorized —</option>
                            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="tag-overline">Platform Links</label>
                            <button type="button" onClick={addLink} data-testid="add-link-button" className="text-xs uppercase tracking-[0.18em] text-gold hover:text-gold-soft">+ Add link</button>
                        </div>
                        <div className="space-y-2">
                            {links.map((l, i) => (
                                <div key={i} className="flex gap-2">
                                    <select className="input-luxury w-40" value={l.platform} onChange={(e) => updateLink(i, "platform", e.target.value)}>
                                        {platformNames.map((p) => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                    <input className="input-luxury flex-1" placeholder="https://" value={l.url} onChange={(e) => updateLink(i, "url", e.target.value)} />
                                    <button type="button" onClick={() => removeLink(i)} className="px-2 text-white/40 hover:text-gold">
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter className="mt-6">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm border border-white/10 hover:border-white/30">Cancel</button>
                    <button data-testid="save-creator-button" onClick={submit} className="px-5 py-2.5 text-sm bg-gold text-black hover:bg-gold-soft transition-colors">
                        Save
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function CategoryForm({ open, onClose, onSaved }) {
    const [name, setName] = useState("");
    useEffect(() => { if (open) setName(""); }, [open]);
    const submit = async () => {
        if (!name.trim()) return;
        try {
            await api.post("/categories", { name: name.trim() });
            toast.success("Category created");
            onSaved();
            onClose();
        } catch (e) { toast.error("Failed"); }
    };
    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="bg-ink-surface border border-white/[0.08] max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl tracking-tight">New category</DialogTitle>
                    <DialogDescription className="sr-only">Create a new category to organize your creators and content.</DialogDescription>
                </DialogHeader>
                <input data-testid="category-name-input" className="input-luxury w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Claude Code" />
                <DialogFooter>
                    <button onClick={onClose} className="px-5 py-2.5 text-sm border border-white/10">Cancel</button>
                    <button data-testid="save-category-button" onClick={submit} className="px-5 py-2.5 text-sm bg-gold text-black hover:bg-gold-soft">Create</button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function DirectoryPage() {
    const [creators, setCreators] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState("all");
    const [activePlatform, setActivePlatform] = useState("all");
    const [search, setSearch] = useState("");
    const [showCreatorForm, setShowCreatorForm] = useState(false);
    const [showCategoryForm, setShowCategoryForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const platforms = usePlatforms();

    const load = async () => {
        const [c, cat] = await Promise.all([api.get("/creators"), api.get("/categories")]);
        setCreators(c.data); setCategories(cat.data);
    };
    useEffect(() => { load(); }, []);

    const platformsInScope = useMemo(() => {
        const set = new Set();
        creators.forEach((c) => c.links?.forEach((l) => set.add(l.platform)));
        return Array.from(set);
    }, [creators]);

    const filtered = useMemo(() => {
        return creators.filter((c) => {
            if (activeCategory !== "all" && c.category_id !== activeCategory) return false;
            if (activePlatform !== "all" && !c.links?.some((l) => l.platform === activePlatform)) return false;
            if (search.trim()) {
                const q = search.toLowerCase();
                if (!c.name.toLowerCase().includes(q) && !(c.bio || "").toLowerCase().includes(q)) return false;
            }
            return true;
        });
    }, [creators, activeCategory, activePlatform, search]);

    const removeCreator = async (id) => {
        if (!confirm("Delete this creator?")) return;
        await api.delete(`/creators/${id}`);
        toast.success("Creator removed");
        load();
    };

    const removeCategory = async (id) => {
        if (!confirm("Delete this category?")) return;
        await api.delete(`/categories/${id}`);
        toast.success("Category removed");
        load();
    };

    return (
        <div data-testid="directory-page">
            <SectionHeader
                overline="Gold Sources"
                title="Curated creators worth your attention."
                description="Organize the people who actually move the needle. Filter by category, then by platform."
                action={
                    <div className="flex gap-3">
                        <button onClick={() => setShowCategoryForm(true)} data-testid="new-category-button" className="px-4 py-2.5 text-xs tracking-[0.18em] uppercase border border-white/10 hover:border-gold/40 hover:text-gold">+ Category</button>
                        <button onClick={() => { setEditing(null); setShowCreatorForm(true); }} data-testid="new-creator-button" className="px-5 py-2.5 text-sm bg-gold text-black hover:bg-gold-soft inline-flex items-center gap-2">
                            <Plus size={16} weight="bold" /> Add creator
                        </button>
                    </div>
                }
            />

            {/* Search */}
            <div className="relative mb-6 max-w-xl">
                <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                    data-testid="directory-search"
                    className="input-luxury w-full pl-10"
                    placeholder="Search creators…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Categories */}
            <div className="mb-4">
                <div className="tag-overline mb-3">Categories</div>
                <div className="flex flex-wrap gap-2">
                    <Pill active={activeCategory === "all"} onClick={() => setActiveCategory("all")} testid="category-pill-all">All</Pill>
                    {categories.map((c) => (
                        <div key={c.id} className="group relative">
                            <Pill active={activeCategory === c.id} onClick={() => setActiveCategory(c.id)} testid={`category-pill-${c.id}`}>
                                {c.name}
                            </Pill>
                            <button onClick={() => removeCategory(c.id)} className="hidden group-hover:inline-block absolute -top-1 -right-1 bg-ink-elevated border border-white/10 rounded-full p-0.5 text-white/40 hover:text-gold">
                                <X size={10} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Platforms */}
            <div className="mb-10">
                <div className="tag-overline mb-3">Platforms</div>
                <PlatformFilterBar
                    options={platforms.names}
                    active={activePlatform}
                    onChange={setActivePlatform}
                    custom={platforms.custom}
                    onAdd={platforms.add}
                    onRemoveCustom={platforms.remove}
                />
            </div>

            {/* List */}
            {filtered.length === 0 ? (
                <EmptyState
                    image={EMPTY_IMG}
                    title={creators.length === 0 ? "No creators yet" : "No matches"}
                    description={creators.length === 0
                        ? "Add the first creator who actually deserves your scroll. Categorize them, link their platforms, and build your private gold map."
                        : "Try a different category or platform combination."}
                    action={creators.length === 0 ? (
                        <button onClick={() => setShowCreatorForm(true)} data-testid="empty-add-creator" className="px-5 py-2.5 text-sm bg-gold text-black hover:bg-gold-soft inline-flex items-center gap-2">
                            <Plus size={14} weight="bold" /> Add the first creator
                        </button>
                    ) : null}
                    testid="directory-empty"
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filtered.map((c) => {
                        const cat = categories.find((x) => x.id === c.category_id);
                        return (
                            <article key={c.id} data-testid={`creator-card-${c.id}`} className="luxury-card p-7 flex flex-col">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div>
                                        {cat && <div className="tag-overline mb-2 text-gold/70">{cat.name}</div>}
                                        <h3 className="font-display text-xl tracking-tight">{c.name}</h3>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                        <button onClick={() => { setEditing(c); setShowCreatorForm(true); }} className="p-1.5 text-white/40 hover:text-gold" data-testid={`edit-creator-${c.id}`}><PencilSimple size={14} /></button>
                                        <button onClick={() => removeCreator(c.id)} className="p-1.5 text-white/40 hover:text-gold-deep" data-testid={`delete-creator-${c.id}`}><Trash size={14} /></button>
                                    </div>
                                </div>
                                {c.bio && <p className="text-sm text-white/50 leading-relaxed mb-5">{c.bio}</p>}
                                <div className="mt-auto flex flex-wrap gap-2">
                                    {c.links?.map((l, i) => (
                                        <a
                                            key={i}
                                            href={l.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            data-testid={`creator-link-${c.id}-${l.platform}`}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] tracking-[0.18em] uppercase border border-white/10 hover:border-gold/40 hover:text-gold transition"
                                        >
                                            <PlatformIcon platform={l.platform} size={11} /> {l.platform} <ArrowUpRight size={10} />
                                        </a>
                                    ))}
                                </div>
                                <div className="flex gap-3 mt-5 text-xs">
                                    <button onClick={() => { setEditing(c); setShowCreatorForm(true); }} className="text-white/40 hover:text-gold tracking-wider uppercase">Edit</button>
                                    <button onClick={() => removeCreator(c.id)} className="text-white/40 hover:text-gold-deep tracking-wider uppercase">Delete</button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            <CreatorForm
                open={showCreatorForm}
                onClose={() => setShowCreatorForm(false)}
                onSaved={load}
                categories={categories}
                editing={editing}
                platformNames={platforms.names}
            />
            <CategoryForm open={showCategoryForm} onClose={() => setShowCategoryForm(false)} onSaved={load} />
        </div>
    );
}
