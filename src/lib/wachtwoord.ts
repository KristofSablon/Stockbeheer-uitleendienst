import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

// Eenvoudige, afhankelijkheidsvrije wachtwoord-hashing met scrypt.
// Formaat: <salt-hex>:<hash-hex>

export function hashWachtwoord(wachtwoord: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(wachtwoord, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifieerWachtwoord(wachtwoord: string, opgeslagen: string): boolean {
  const [saltHex, hashHex] = opgeslagen.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const hash = Buffer.from(hashHex, "hex");
  const test = scryptSync(wachtwoord, salt, 64);
  if (test.length !== hash.length) return false;
  return timingSafeEqual(test, hash);
}
