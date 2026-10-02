import type { Card, TransferPartner } from "../types";

export function findTransferPartnersByName(
  catalog: Card[],
  name: string,
  type?: TransferPartner["type"]
): { program: string; partner: TransferPartner; cardIds: string[] }[] {
  const needle = name.toLowerCase();
  const hits: {
    program: string;
    partner: TransferPartner;
    cardIds: string[];
  }[] = [];

  for (const card of catalog) {
    for (const partner of card.transferPartners) {
      if (type && partner.type !== type) continue;
      if (!partner.name.toLowerCase().includes(needle)) continue;
      const existing = hits.find(
        (h) => h.program === card.rewardProgram && h.partner.name === partner.name
      );
      if (existing) {
        existing.cardIds.push(card.id);
      } else {
        hits.push({
          program: card.rewardProgram,
          partner,
          cardIds: [card.id],
        });
      }
    }
  }
  return hits;
}

export function ecosystemSynergyNote(
  catalog: Card[],
  ownedCardIds: string[],
  candidate: Card
): string | null {
  const ownedPrograms = new Set(
    ownedCardIds
      .map((id) => catalog.find((c) => c.id === id)?.rewardProgram)
      .filter((p): p is string => Boolean(p))
  );
  if (!candidate.rewardProgram) return null;
  if (ownedPrograms.has(candidate.rewardProgram)) {
    return `Stacks with your existing ${candidate.rewardProgram} balance — transfers and earn combine in one ecosystem.`;
  }
  const airlineOverlap = findTransferPartnersByName(
    catalog,
    candidate.issuer,
    "airline"
  );
  if (airlineOverlap.length > 0 && candidate.transferPartners.length > 0) {
    return "Adds transfer options; compare overlap with cards you already hold before applying.";
  }
  return null;
}

export function listEcosystemsForWallet(
  catalog: Card[],
  cardIds: string[]
): string[] {
  const programs = cardIds
    .map((id) => catalog.find((c) => c.id === id)?.rewardProgram)
    .filter((p): p is string => Boolean(p));
  return [...new Set(programs)];
}
