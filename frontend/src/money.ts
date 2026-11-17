/** Montant en euros à la française : 23,00 €. */
export function formatEuros(value: number): string {
  return `${value.toFixed(2).replace(".", ",")} €`;
}
