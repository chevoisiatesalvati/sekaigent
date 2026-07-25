import Link from "next/link";
import { WalletButton } from "./WalletButton";

export function SiteHeader() {
  return (
    <header className="topbar">
      <div>
        <p className="brand">Sekaigent</p>
        <p className="muted" style={{ margin: 0 }}>
          Masters of secret agents on 0G
        </p>
      </div>
      <nav className="nav">
        <Link href="/">Map</Link>
        <Link href="/agents">Agents</Link>
        <Link href="/admin">Admin</Link>
        <WalletButton />
      </nav>
    </header>
  );
}
