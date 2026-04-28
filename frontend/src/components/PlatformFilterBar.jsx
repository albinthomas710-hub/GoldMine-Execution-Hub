import React, { useState } from "react";
import { Plus, X } from "@phosphor-icons/react";
import Pill from "@/components/Pill";
import PlatformIcon, { PLATFORMS as BUILTIN } from "@/components/PlatformIcon";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

/**
 * Shared platform filter bar with a "+ Add platform" button.
 * - `options` = string[] (all platform names to render as pills)
 * - `active` = currently active platform filter, or "all"
 * - `onChange(name | "all")`
 * - `custom` = [{id, name}] user-created platforms (only these show a delete button)
 * - `onAdd(name)` / `onRemoveCustom(id)`
 */
export default function PlatformFilterBar({ options, active, onChange, custom = [], onAdd, onRemoveCustom }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const customIdByName = Object.fromEntries(custom.map((c) => [c.name, c.id]));

    const submit = async () => {
        const n = name.trim();
        if (!n) return;
        if ([...BUILTIN, ...custom.map((c) => c.name)].some((p) => p.toLowerCase() === n.toLowerCase())) {
            toast.error("That platform already exists");
            return;
        }
        try {
            await onAdd(n);
            toast.success(`Added ${n}`);
            setName("");
            setOpen(false);
        } catch {
            toast.error("Failed to add platform");
        }
    };

    return (
        <>
            <div className="flex flex-wrap gap-2 items-center">
                <Pill active={active === "all"} onClick={() => onChange("all")} testid="platform-pill-all">All</Pill>
                {options.map((p) => {
                    const isCustom = !!customIdByName[p];
                    return (
                        <div key={p} className="relative group/pill">
                            <Pill
                                active={active === p}
                                onClick={() => onChange(p)}
                                testid={`platform-pill-${p}`}
                            >
                                <span className="inline-flex items-center gap-1.5"><PlatformIcon platform={p} size={11} /> {p}</span>
                            </Pill>
                            {isCustom && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onRemoveCustom(customIdByName[p]); }}
                                    data-testid={`remove-custom-platform-${p}`}
                                    className="hidden group-hover/pill:inline-block absolute -top-1.5 -right-1.5 bg-ink-elevated border border-white/10 rounded-full p-0.5 text-white/50 hover:text-gold"
                                    aria-label={`Remove ${p}`}
                                >
                                    <X size={10} />
                                </button>
                            )}
                        </div>
                    );
                })}
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    data-testid="add-custom-platform-button"
                    className="px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase border border-dashed border-white/20 text-white/50 hover:text-gold hover:border-gold/50 inline-flex items-center gap-1.5 transition-all"
                >
                    <Plus size={11} weight="bold" /> Add platform
                </button>
            </div>

            <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
                <DialogContent className="bg-ink-surface border border-white/[0.08] max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-display text-2xl tracking-tight">Add a platform</DialogTitle>
                        <DialogDescription className="sr-only">Create a custom platform that will be available across creators, vault, and notes.</DialogDescription>
                    </DialogHeader>
                    <input
                        data-testid="new-platform-name-input"
                        className="input-luxury w-full"
                        placeholder="e.g. Threads, Bluesky, Mastodon…"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && submit()}
                        autoFocus
                    />
                    <DialogFooter>
                        <button onClick={() => setOpen(false)} className="px-5 py-2.5 text-sm border border-white/10">Cancel</button>
                        <button data-testid="save-custom-platform-button" onClick={submit} className="px-5 py-2.5 text-sm bg-gold text-black hover:bg-gold-soft">Add</button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
