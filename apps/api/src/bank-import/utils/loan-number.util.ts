const LOAN_NUMBER_REGEX = /Loan N\s*(\d+)/;

export function extractLoanNumber(rawDetails: string | null | undefined): string | null {
  if (!rawDetails) return null;
  const match = rawDetails.match(LOAN_NUMBER_REGEX);
  return match ? match[1]! : null;
}
