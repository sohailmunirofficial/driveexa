export type BookingPricingUnit = "day" | "hour";
export type BookingPaymentStatus = "pending" | "partial" | "paid";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type BookingPricingInput = {
  baseUnitPrice: number;
  negotiatedUnitPrice?: number | null;
  quantity: number;
  discountAmount?: number | null;
  advanceAmount?: number | null;
};

export type BookingPricingSummary = {
  unitPrice: number;
  grossAmount: number;
  discountAmount: number;
  totalPrice: number;
  advanceAmount: number;
  balanceAmount: number;
  paymentStatus: BookingPaymentStatus;
};

export function normalizeMoney(value: number | null | undefined): number {
  if (!Number.isFinite(value ?? Number.NaN)) {
    return 0;
  }

  return Math.max(0, Math.round(Number(value) * 100) / 100);
}

export function derivePaymentStatus(
  totalPrice: number,
  advanceAmount: number,
): BookingPaymentStatus {
  if (totalPrice <= 0 || advanceAmount >= totalPrice) {
    return "paid";
  }

  return advanceAmount > 0 ? "partial" : "pending";
}

export function calculateRentalQuantity(
  startDate: Date,
  endDate: Date,
  pricingUnit: BookingPricingUnit,
): number {
  const durationMs = endDate.getTime() - startDate.getTime();

  if (durationMs <= 0) {
    return 0;
  }

  const unitMs = pricingUnit === "day" ? DAY_MS : HOUR_MS;
  return Math.max(1, Math.ceil(durationMs / unitMs));
}

export function calculateBookingPricing(
  input: BookingPricingInput,
): BookingPricingSummary {
  const quantity = Math.max(0, Math.ceil(input.quantity));
  const unitPrice = normalizeMoney(
    input.negotiatedUnitPrice ?? input.baseUnitPrice,
  );
  const grossAmount = normalizeMoney(unitPrice * quantity);
  const discountAmount = Math.min(
    grossAmount,
    normalizeMoney(input.discountAmount),
  );
  const totalPrice = normalizeMoney(grossAmount - discountAmount);
  const advanceAmount = Math.min(
    totalPrice,
    normalizeMoney(input.advanceAmount),
  );
  const balanceAmount = normalizeMoney(totalPrice - advanceAmount);

  return {
    unitPrice,
    grossAmount,
    discountAmount,
    totalPrice,
    advanceAmount,
    balanceAmount,
    paymentStatus: derivePaymentStatus(totalPrice, advanceAmount),
  };
}
