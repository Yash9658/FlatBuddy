import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type CityImageProps = {
  src?: string | null;
  alt: string;
  slug?: string | null;
  className?: string;
};

const defaultFallback = createSvgDataUrl("City view", "FlatBuddy fallback image");

const cityFallbacks: Record<string, string> = {
  pune: createSvgDataUrl("Pune", "Fallback image for Pune"),
};

export function CityImage({ src, alt, slug, className }: CityImageProps) {
  const fallbackSrc = (slug ? cityFallbacks[slug] : undefined) ?? defaultFallback;
  const [imageSrc, setImageSrc] = useState(src || fallbackSrc);
  const isUsingFallback = imageSrc === fallbackSrc;

  useEffect(() => {
    setImageSrc(src || fallbackSrc);
  }, [fallbackSrc, src]);

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={cn(
        className,
        isUsingFallback && "bg-gradient-to-br from-amber-50 via-stone-50 to-emerald-50 p-2 object-contain",
      )}
      onError={() => {
        if (imageSrc !== fallbackSrc) {
          setImageSrc(fallbackSrc);
        }
      }}
    />
  );
}

function createSvgDataUrl(title: string, subtitle: string) {
  const svg = `
    <svg width="1600" height="900" viewBox="0 0 1600 900" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="1600" height="900" fill="#F6F1E8"/>
      <rect width="1600" height="900" fill="url(#bg)"/>
      <circle cx="1320" cy="170" r="140" fill="#F2C879" fill-opacity="0.55"/>
      <path d="M0 675C174 625 331 643 493 684C657 725 820 780 992 761C1157 743 1290 664 1404 638C1504 614 1572 622 1600 629V900H0V675Z" fill="#9BBF98"/>
      <path d="M0 747C138 711 283 737 438 782C598 829 776 875 962 862C1154 848 1309 744 1418 705C1522 668 1579 676 1600 682V900H0V747Z" fill="#587765"/>
      <path d="M545 335H1056V611H545V335Z" fill="#F3E7CD"/>
      <path d="M800 196L1135 335H465L800 196Z" fill="#C78855"/>
      <rect x="699" y="441" width="72" height="72" rx="10" fill="#97B7B0"/>
      <rect x="829" y="441" width="72" height="72" rx="10" fill="#97B7B0"/>
      <rect x="781" y="448" width="38" height="124" rx="10" fill="#805A42"/>
      <text x="120" y="155" fill="#17352A" font-family="Georgia, serif" font-size="72" font-weight="700">${escapeXml(title)}</text>
      <text x="120" y="220" fill="#315949" font-family="Arial, sans-serif" font-size="30">${escapeXml(subtitle)}</text>
      <defs>
        <linearGradient id="bg" x1="146" y1="52" x2="1306" y2="842" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FBF6EC"/>
          <stop offset="1" stop-color="#DDEBE5"/>
        </linearGradient>
      </defs>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
