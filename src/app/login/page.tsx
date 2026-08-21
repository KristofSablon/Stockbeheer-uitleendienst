import Link from "next/link";
import { Logo } from "@/components/Merk";
import { entraConfig, lokaalAanmeldenUit } from "@/lib/entra";
import LoginFormulier from "./LoginFormulier";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ fout?: string }>;
}) {
  const { fout } = await searchParams;
  const entraActief = entraConfig() !== null;
  const lokaalUit = lokaalAanmeldenUit();

  return (
    <div className="flex min-h-screen items-center justify-center bg-londerzeel-geelLicht px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <LoginFormulier entraActief={entraActief} lokaalUit={lokaalUit} ssoFout={fout} />
        <p className="mt-4 text-center text-sm text-gray-500">
          <Link href="/" className="hover:underline">← Terug naar de publieke website</Link>
        </p>
      </div>
    </div>
  );
}
