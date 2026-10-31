import Link from "next/link";
import { getInboundLinks } from "@/lib/marketing/resources/inbound-links";

/** "Related guides" on a page other guides asked to be linked from. Renders nothing when there are none. */
export function RelatedGuideLinks({ path, className = "" }: { path: string; className?: string }) {
  const links = getInboundLinks(path);
  if (!links.length) return null;
  return (
    <nav aria-label="Related guides" className={className}>
      <p className="text-sm font-semibold text-[#2c2c2c]">Related guides</p>
      <ul className="mt-2 space-y-1.5 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-[#088924] underline-offset-2 hover:underline">
              {l.anchor}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
