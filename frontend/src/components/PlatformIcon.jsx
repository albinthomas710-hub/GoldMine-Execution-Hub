import React from "react";
import {
    InstagramLogo,
    XLogo,
    YoutubeLogo,
    LinkedinLogo,
    RedditLogo,
    Newspaper,
    Lightbulb,
    Globe,
    GithubLogo,
    TiktokLogo,
    MediumLogo,
} from "@phosphor-icons/react";

const map = {
    Instagram: InstagramLogo,
    X: XLogo,
    Twitter: XLogo,
    YouTube: YoutubeLogo,
    LinkedIn: LinkedinLogo,
    Reddit: RedditLogo,
    Substack: Newspaper,
    "Hacker News": Newspaper,
    "Product Hunt": Lightbulb,
    Newsletter: Newspaper,
    GitHub: GithubLogo,
    TikTok: TiktokLogo,
    Medium: MediumLogo,
    Other: Globe,
};

export const PLATFORMS = [
    "Instagram",
    "X",
    "YouTube",
    "LinkedIn",
    "Reddit",
    "Substack",
    "Hacker News",
    "Product Hunt",
    "Newsletter",
    "GitHub",
    "TikTok",
    "Medium",
    "Other",
];

export default function PlatformIcon({ platform, size = 16, weight = "regular", className = "" }) {
    const Icon = map[platform] || Globe;
    return <Icon size={size} weight={weight} className={className} />;
}
