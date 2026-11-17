/** Insère la barre oblique de « MM/AA » pendant la saisie : 1240 devient 12/40. */
export function formatExpiry(raw: string): string {
  const digits = raw.replaceAll(/\D/g, "").slice(0, 4);

  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}
