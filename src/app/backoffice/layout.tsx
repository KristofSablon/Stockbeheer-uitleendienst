import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/Merk";
import { BackofficeNav, type NavItem } from "@/components/BackofficeNav";
import { ROL_LABELS } from "@/lib/domein";

// Statussen die om actie van een medewerker vragen (behandeling of bevestiging).
const TE_BEHANDELEN_STATUS = ["INGEDIEND", "IN_BEHANDELING", "WACHT_OP_AANVULLING", "GOEDGEKEURD", "BEVESTIGD"];

// Navigatie-items met de rollen die ze mogen zien.
const NAV: (NavItem & { rollen: string[] })[] = [
  { href: "/backoffice", label: "Dashboard", icon: "▤", rollen: ["ADMIN", "PLOEGBAAS", "TECHNISCH", "MAGAZIJNIER", "BEHEERDER", "BELEID"] },
  { href: "/backoffice/dossiers", label: "Aanvragen behandelen", icon: "▦", rollen: ["ADMIN", "PLOEGBAAS", "TECHNISCH", "MAGAZIJNIER", "BEHEERDER"] },
  { href: "/backoffice/kalender", label: "Beschikbaarheid", icon: "▧", rollen: ["ADMIN", "PLOEGBAAS", "MAGAZIJNIER", "BEHEERDER"] },
  { href: "/backoffice/planning", label: "Planning & werkopdrachten", icon: "▥", rollen: ["ADMIN", "PLOEGBAAS", "TECHNISCH", "BEHEERDER"] },
  { href: "/backoffice/retour", label: "Retour & controle", icon: "⇄", rollen: ["ADMIN", "MAGAZIJNIER", "TECHNISCH", "BEHEERDER"] },
  { href: "/backoffice/catalogus", label: "Materiaalbeheer", icon: "▣", rollen: ["BEHEERDER", "ADMIN"] },
  { href: "/backoffice/beheer", label: "Beheer & configuratie", icon: "⚙", rollen: ["BEHEERDER"] },
];

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const sessie = await getSessie();
  if (!sessie) redirect("/login");

  const teBehandelen = await prisma.dossier.count({ where: { status: { in: TE_BEHANDELEN_STATUS } } });

  const zichtbaar = NAV.filter((n) => n.rollen.some((r) => sessie.rollen.includes(r))).map((n) =>
    n.href === "/backoffice/dossiers" ? { ...n, badge: teBehandelen } : n
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <Logo subtitel={false} />
          <div className="flex items-center gap-4 text-sm">
            <div className="text-right">
              <p className="font-medium text-gray-900">{sessie.naam}</p>
              <p className="text-xs text-gray-500">{sessie.rollen.map((r) => ROL_LABELS[r] ?? r).join(", ")}</p>
            </div>
            <Link href="/logout" className="btn-secondary">Afmelden</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="w-64 shrink-0">
          <BackofficeNav items={zichtbaar} />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
