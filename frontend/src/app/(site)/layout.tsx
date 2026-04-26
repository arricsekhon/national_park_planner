import type { ReactNode } from "react";
import Nav from "@/app/components/Nav";
import Footer from "@/app/components/Footer";
import CompareBar from "@/app/components/CompareBar";
import OnboardingModal from "@/app/components/OnboardingModal";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav />
      {children}
      <Footer />
      <CompareBar />
      <OnboardingModal />
    </>
  );
}
