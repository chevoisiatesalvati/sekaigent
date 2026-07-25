"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "./WalletButton";

const NAV = [
  { href: "/", label: "HQ" },
  { href: "/squad", label: "Squad" },
  { href: "/missions", label: "Missions" },
  { href: "/bureau", label: "Bureau" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="topbar">
      <div>
        <p className="brand">Sekaigent</p>
        <p className="muted" style={{ margin: 0 }}>
          Masters of secret agents on 0G
        </p>
      </div>
      <nav className="nav" aria-label="Primary">
        {NAV.map((item) => {
          const current =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={current ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
        <WalletButton />
      </nav>
    </header>
  );
}
