import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "DELLA Admin", template: "%s · DELLA Admin" },
  robots: { index: false, follow: false },
};

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return children;
}
