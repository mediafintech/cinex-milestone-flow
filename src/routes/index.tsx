import { createFileRoute } from "@tanstack/react-router";
import CineXDemo from "@/components/CineXDemo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CineX Demo – Milestone-Based Financing" },
      {
        name: "description",
        content:
          "Investor-ready demo of CineX milestone-based film financing on the Stacks testnet.",
      },
      { property: "og:title", content: "CineX Demo – Milestone-Based Financing" },
      {
        property: "og:description",
        content:
          "Register creators, fund campaigns, approve milestones and release escrowed STX on Stacks testnet.",
      },
    ],
  }),
  component: CineXDemo,
});
