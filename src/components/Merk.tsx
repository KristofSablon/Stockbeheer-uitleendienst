import Link from "next/link";

// Eenvoudig woordmerk in de huisstijl van de gemeente Londerzeel.
export function Logo({ subtitel = true }: { subtitel?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-londerzeel-geel font-bold text-londerzeel-inkt">
        UL
      </span>
      <span className="leading-tight">
        <span className="block font-semibold text-londerzeel-inkt">Uitleendienst</span>
        {subtitel && <span className="block text-xs text-gray-500">Gemeente Londerzeel</span>}
      </span>
    </Link>
  );
}

export function StatusBadge({ label, kleur }: { label: string; kleur: string }) {
  return <span className={`badge ${kleur}`}>{label}</span>;
}
