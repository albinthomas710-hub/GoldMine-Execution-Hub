import React from "react";

export default function Pill({ active, onClick, children, testid }) {
    return (
        <button
            type="button"
            onClick={onClick}
            data-testid={testid}
            className={`px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase border transition-all
                ${active
                    ? "border-gold text-gold bg-gold/[0.06]"
                    : "border-white/10 text-white/60 hover:text-white hover:border-white/30"
                }`}
        >
            {children}
        </button>
    );
}
