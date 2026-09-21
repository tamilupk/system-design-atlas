export interface SharedConcept {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly explanation: string;
  readonly role: string;
  readonly tradeoffs: readonly TradeoffItem[];
  readonly failureModes: readonly string[];
  readonly relatedConceptIds: readonly string[];
}

export interface TradeoffItem {
  readonly aspect: string;
  readonly pros: string;
  readonly cons: string;
}

export interface ConceptContextEntry {
  readonly conceptId: string;
  readonly chapterRole: string;
  readonly exampleData?: string;
  readonly specificConsiderations: readonly string[];
}

export type ConceptContext = Record<string, ConceptContextEntry>;
