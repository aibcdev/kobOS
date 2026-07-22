import type { DashboardNavIcon } from "@/lib/dashboard/nav";

/** Thin outline icons — Owner.com-style, monochrome. */
export function DashboardNavIconGlyph({
  icon,
  className = "h-[18px] w-[18px]",
}: {
  icon: DashboardNavIcon;
  className?: string;
}) {
  const stroke = "currentColor";
  const common = {
    className,
    fill: "none",
    stroke,
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (icon) {
    case "home":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
        </svg>
      );
    case "chat":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7A2.5 2.5 0 0 1 16.5 16H10l-4 3v-3H7.5A2.5 2.5 0 0 1 5 13.5v-7Z" />
        </svg>
      );
    case "requests":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M8 7h8M8 12h8M8 17h5" />
          <rect x="4" y="4" width="16" height="16" rx="2" />
        </svg>
      );
    case "website":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M4.5 12h15M12 4.5c2.2 2.4 2.2 12.6 0 15M12 4.5c-2.2 2.4-2.2 12.6 0 15" />
        </svg>
      );
    case "seo":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="10.5" cy="10.5" r="5.5" />
          <path d="m15 15 4.5 4.5" />
        </svg>
      );
    case "menu":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M7 7h10M7 12h10M7 17h7" />
        </svg>
      );
    case "reviews":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="m12 4.5 2.2 4.5 5 .7-3.6 3.5.9 5L12 15.8 7.5 18.2l.9-5L4.8 9.7l5-.7L12 4.5Z" />
        </svg>
      );
    case "listings":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
          <circle cx="12" cy="11" r="2" />
        </svg>
      );
    case "ordering":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M7 8h11l-1.2 8.2a1.5 1.5 0 0 1-1.5 1.3H9.5a1.5 1.5 0 0 1-1.5-1.3L7 8Z" />
          <path d="M9 8V6.5A2.5 2.5 0 0 1 11.5 4h1A2.5 2.5 0 0 1 15 6.5V8" />
          <path d="M12 11v4M10 13h4" />
        </svg>
      );
    case "upsells":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M4 17 10 11l3 3 7-7" />
          <path d="M14 7h6v6" />
        </svg>
      );
    case "delivery":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M3 16V8h10v8" />
          <path d="M13 10h4l3 3v3h-2" />
          <circle cx="7" cy="17" r="2" />
          <circle cx="17" cy="17" r="2" />
        </svg>
      );
    case "catering":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M8 10c0-2 1.5-3.5 4-3.5s4 1.5 4 3.5v1H8v-1Z" />
          <path d="M7 11h10v2a5 5 0 0 1-10 0v-2Z" />
          <path d="M12 6.5V4M10 5.2 9 3.5M14 5.2l1-1.7" />
        </svg>
      );
    case "phone":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M8.5 4.5h3.2A1.8 1.8 0 0 1 13.5 6.3v11.4a1.8 1.8 0 0 1-1.8 1.8H8.5a1.8 1.8 0 0 1-1.8-1.8V6.3a1.8 1.8 0 0 1 1.8-1.8Z" />
          <path d="M9.2 17.5h2.6" />
        </svg>
      );
    case "content":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <rect x="5" y="4" width="14" height="16" rx="2" />
          <path d="M8 9h8M8 13h8M8 17h5" />
        </svg>
      );
    case "customers":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="9" cy="9" r="3" />
          <circle cx="16" cy="10" r="2.5" />
          <path d="M4.5 18.5c.8-2.4 2.7-3.5 4.5-3.5s3.7 1.1 4.5 3.5M13.5 15c1.3 0 2.7.6 3.5 2.5" />
        </svg>
      );
    case "brand":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <circle cx="9" cy="11" r="2" />
          <path d="m20 16-4.5-4.5L8 19" />
        </svg>
      );
    case "creative":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M12 4v3M12 17v3M4 12h3M17 12h3M7 7l2 2M15 15l2 2M17 7l-2 2M9 15l-2 2" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    case "analytics":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M5 19V10M10 19V5M15 19v-7M20 19V8" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 4.5v2M12 17.5v2M4.5 12h2M17.5 12h2M6.8 6.8l1.4 1.4M15.8 15.8l1.4 1.4M17.2 6.8l-1.4 1.4M8.2 15.8l-1.4 1.4" />
        </svg>
      );
    case "billing":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <rect x="3.5" y="6" width="17" height="12" rx="2" />
          <path d="M3.5 10h17" />
        </svg>
      );
    case "outbound":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M4 12h12M12 6l6 6-6 6" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="12" cy="12" r="7" />
        </svg>
      );
  }
}
