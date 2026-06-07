export function calculateMonthlyPayment(
  principal: number,
  annualRatePercent: number,
  tenureYears: number
) {
  if (principal <= 0 || tenureYears <= 0) return 0;

  const months = tenureYears * 12;
  const monthlyRate = annualRatePercent / 100 / 12;

  if (monthlyRate <= 0) {
    return principal / months;
  }

  return (
    (principal * monthlyRate) /
    (1 - Math.pow(1 + monthlyRate, -months))
  );
}
