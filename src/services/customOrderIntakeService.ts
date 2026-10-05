import type { CustomOrderIntakeResponse } from "@/types/customOrderIntake";

export async function getCustomOrderIntake(): Promise<CustomOrderIntakeResponse> {
  const response = await fetch("/api/shop/custom-order/intake", {
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "접수 상태를 확인하지 못했습니다.");
  }
  return result;
}
