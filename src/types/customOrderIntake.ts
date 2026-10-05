export interface CustomOrderIntakeStatus {
  accepting: boolean;
  message: string;
}

export interface CustomOrderIntakeResponse {
  timetable: CustomOrderIntakeStatus;
  thumbnail: CustomOrderIntakeStatus & { pricingReady: boolean };
}
