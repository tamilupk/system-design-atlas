export interface ChallengeOption {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly isOptimal: boolean;
  readonly simulationResult: {
    readonly metric: string;
    readonly outcome: string;
    readonly impact: string;
  };
  readonly seniorRationale: string;
  readonly tradeOffSummary: string;
}

export interface ChallengeDefinition {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly scenario: string;
  readonly interviewContext: string;
  readonly options: readonly ChallengeOption[];
}
