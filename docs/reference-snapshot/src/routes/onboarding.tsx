import { createFileRoute } from "@tanstack/react-router";
import { OnboardingWizard } from "@/components/affordo/OnboardingWizard";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up · Affordo" },
      { name: "description", content: "Configure your financial profile once. Then weigh purchases in seconds." },
      { property: "og:title", content: "Set up · Affordo" },
      { property: "og:description", content: "Configure your financial profile once. Then weigh purchases in seconds." },
    ],
  }),
  component: OnboardingWizard,
});
