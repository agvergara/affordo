import { z } from "zod";

export const CurrencySchema = z.enum(["EUR", "USD", "GBP"]);
export type Currency = z.infer<typeof CurrencySchema>;

export const ProfileSchema = z.object({
  currency: CurrencySchema,
  salary: z.number().nonnegative(),
  hoursPerWeek: z.number().positive(),
  hoursPerDay: z.number().positive(),
  paymentsPerYear: z.number().positive(),
  expenses: z.number().nonnegative(),
  threshold: z.number().min(0).max(100),
  savings: z.number().nonnegative(),
  monthlyContribution: z.number().nonnegative(),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const GoalSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
  price: z.number().nonnegative(),
  note: z.string().max(200).default(""),
  createdAt: z.number(),
});
export type Goal = z.infer<typeof GoalSchema>;

export const GoalsSchema = z.array(GoalSchema);

export const defaultProfile: Profile = {
  currency: "EUR",
  salary: 0,
  hoursPerWeek: 40,
  hoursPerDay: 8,
  paymentsPerYear: 12,
  expenses: 0,
  threshold: 10,
  savings: 0,
  monthlyContribution: 0,
};
