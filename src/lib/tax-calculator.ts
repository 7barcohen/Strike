export interface Section102TaxInput {
  optionCount: number;
  strikePrice: number;
  grantDateFmv: number;
  currentSecondaryPrice: number;
  section102CapitalGainsTrack: boolean;
  marginalTaxRate?: number;
  nationalInsuranceRate?: number;
  capitalGainsRate?: number;
  applySurtax?: boolean;
  surtaxRate?: number;
}

export interface Section102TaxBreakdown {
  regime: "section102_capital_gains" | "ordinary_income";
  grossProceeds: number;
  exerciseCost: number;
  grossGain: number;
  workIncomeComponent: number;
  capitalGainComponent: number;
  ordinaryIncomeComponent: number;
  workIncomeTax: number;
  capitalGainsTax: number;
  ordinaryIncomeTax: number;
  surtaxTax: number;
  totalTax: number;
  netGainAfterTax: number;
  splitApplied: boolean;
}

function clampPositive(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateSection102Tax(input: Section102TaxInput): Section102TaxBreakdown {
  const optionCount = clampPositive(input.optionCount);
  const strikePrice = clampPositive(input.strikePrice);
  const grantDateFmv = clampPositive(input.grantDateFmv);
  const currentSecondaryPrice = clampPositive(input.currentSecondaryPrice);

  const marginalTaxRate = input.marginalTaxRate ?? 0.47;
  const nationalInsuranceRate = input.nationalInsuranceRate ?? 0.12;
  const capitalGainsRate = input.capitalGainsRate ?? 0.25;
  const surtaxRate = input.surtaxRate ?? 0.03;

  const grossProceeds = roundCurrency(optionCount * currentSecondaryPrice);
  const exerciseCost = roundCurrency(optionCount * strikePrice);
  const grossGain = roundCurrency(clampPositive(grossProceeds - exerciseCost));

  if (!input.section102CapitalGainsTrack) {
    const ordinaryIncomeComponent = grossGain;
    const ordinaryIncomeTax = roundCurrency(ordinaryIncomeComponent * (marginalTaxRate + nationalInsuranceRate));
    const surtaxTax = roundCurrency(input.applySurtax ? ordinaryIncomeComponent * surtaxRate : 0);
    const totalTax = roundCurrency(ordinaryIncomeTax + surtaxTax);

    return {
      regime: "ordinary_income",
      grossProceeds,
      exerciseCost,
      grossGain,
      workIncomeComponent: 0,
      capitalGainComponent: 0,
      ordinaryIncomeComponent,
      workIncomeTax: 0,
      capitalGainsTax: 0,
      ordinaryIncomeTax,
      surtaxTax,
      totalTax,
      netGainAfterTax: roundCurrency(clampPositive(grossGain - totalTax)),
      splitApplied: false,
    };
  }

  const splitApplied = grantDateFmv > strikePrice;

  let workIncomeComponent = 0;
  let capitalGainComponent = 0;

  if (splitApplied) {
    workIncomeComponent = roundCurrency(clampPositive((grantDateFmv - strikePrice) * optionCount));
    capitalGainComponent = roundCurrency(clampPositive((currentSecondaryPrice - grantDateFmv) * optionCount));
  } else {
    capitalGainComponent = roundCurrency(clampPositive((currentSecondaryPrice - strikePrice) * optionCount));
  }

  const workIncomeTax = roundCurrency(workIncomeComponent * (marginalTaxRate + nationalInsuranceRate));
  const capitalGainsTax = roundCurrency(capitalGainComponent * capitalGainsRate);
  const surtaxBase = roundCurrency(workIncomeComponent + capitalGainComponent);
  const surtaxTax = roundCurrency(input.applySurtax ? surtaxBase * surtaxRate : 0);
  const totalTax = roundCurrency(workIncomeTax + capitalGainsTax + surtaxTax);

  return {
    regime: "section102_capital_gains",
    grossProceeds,
    exerciseCost,
    grossGain,
    workIncomeComponent,
    capitalGainComponent,
    ordinaryIncomeComponent: 0,
    workIncomeTax,
    capitalGainsTax,
    ordinaryIncomeTax: 0,
    surtaxTax,
    totalTax,
    netGainAfterTax: roundCurrency(clampPositive(grossGain - totalTax)),
    splitApplied,
  };
}
