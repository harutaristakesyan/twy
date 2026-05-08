export interface ProfitInput {
  serviceFee: number | null;
  incomePercentage: number | null;
  customerRate: number | null;
  charges: number | null;
}

export interface ProfitResult {
  serviceFee: number;
  incomeAmount: number;
  charges: number;
  total: number;
}

export const calculateProfit = (input: ProfitInput): ProfitResult => {
  const serviceFee = input.serviceFee ?? 0;
  const incomePercentage = input.incomePercentage ?? 0;
  const customerRate = input.customerRate ?? 0;
  const charges = input.charges ?? 0;

  const incomeAmount = (incomePercentage / 100) * customerRate;
  const total = serviceFee + incomeAmount + charges;

  return { serviceFee, incomeAmount, charges, total };
};
