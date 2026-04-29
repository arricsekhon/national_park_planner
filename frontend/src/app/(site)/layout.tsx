import type { ReactNode } from "react";
import Nav from "@/app/components/Nav";
import Footer from "@/app/components/Footer";
import CompareBar from "@/app/components/CompareBar";
import OnboardingModal from "@/app/components/OnboardingModal";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Blocks content from bleeding into the iOS status bar zone, even when
          CSS transform stacking contexts on animated sections override the nav */}
      <div
        className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none"
        style={{ height: "env(safe-area-inset-top, 0px)", background: "rgba(251,251,248,0.98)" }}
      />
      <Nav />
      {children}
      <Footer />
      <CompareBar />
      <OnboardingModal />
    </>
  );
}
