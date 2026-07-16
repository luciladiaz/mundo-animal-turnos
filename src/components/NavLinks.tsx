"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  items: { href: string; label: string }[];
}

export default function NavLinks({ items }: Props) {
  const pathname = usePathname();

  return (
    <>
      {items.map((item) => {
        const activo = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`pildora-nav whitespace-nowrap ${
              activo
                ? "bg-white text-[var(--color-primario)] shadow-sm"
                : "bg-white/15 text-white hover:bg-white/25"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
