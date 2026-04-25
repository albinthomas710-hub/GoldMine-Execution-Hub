import React from "react";

export default function EmptyState({ image, title, description, action, testid }) {
    return (
        <div data-testid={testid} className="border border-white/[0.06] bg-ink-surface px-8 py-16 md:py-24 grid place-items-center text-center">
            {image && (
                <div className="mb-10 opacity-50 mix-blend-screen">
                    <img src={image} alt="" className="w-32 h-32 object-cover" />
                </div>
            )}
            <h3 className="font-display text-2xl md:text-3xl tracking-tight mb-3">{title}</h3>
            {description && (
                <p className="text-white/50 max-w-md mb-8 leading-relaxed text-sm">{description}</p>
            )}
            {action}
        </div>
    );
}
