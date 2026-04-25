import React from "react";

export default function SectionHeader({ overline, title, description, action }) {
    return (
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10 md:mb-14">
            <div className="max-w-2xl">
                {overline && <div className="tag-overline mb-3 text-gold/70">{overline}</div>}
                <h1 className="font-display font-light text-4xl md:text-5xl lg:text-6xl tracking-tight leading-[1.05]">
                    {title}
                </h1>
                {description && (
                    <p className="text-white/50 mt-4 leading-relaxed text-sm md:text-base">{description}</p>
                )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}
