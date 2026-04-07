export const CURRENT_MUNICIPAL_ELECTION = {
  year: 2024,
  round: 1,
  type: "municipal" as const,
};

export const CURRENT_SUMMARY_SCOPE = {
  year: CURRENT_MUNICIPAL_ELECTION.year,
  round: CURRENT_MUNICIPAL_ELECTION.round,
};

export const CURRENT_SUMMARY_ORDER_BY = [
  { year: "desc" as const },
  { round: "desc" as const },
];
