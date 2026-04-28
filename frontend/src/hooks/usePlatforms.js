import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { PLATFORMS as BUILTIN } from "@/components/PlatformIcon";

export function usePlatforms() {
    const [custom, setCustom] = useState([]);

    const load = useCallback(async () => {
        try {
            const r = await api.get("/platforms");
            setCustom(r.data);
        } catch {
            // ignore
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const add = async (name) => {
        const n = (name || "").trim();
        if (!n) return null;
        const r = await api.post("/platforms", { name: n });
        await load();
        return r.data;
    };

    const remove = async (id) => {
        await api.delete(`/platforms/${id}`);
        await load();
    };

    // Merged list: built-ins first (minus "Other"), then custom (dedupe by name)
    const names = [
        ...BUILTIN.filter((p) => p !== "Other"),
        ...custom.map((c) => c.name).filter((n) => !BUILTIN.includes(n)),
        "Other",
    ];

    return { custom, names, add, remove, refresh: load };
}
