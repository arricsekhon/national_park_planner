import type { ReactNode } from "react";
import Nav from "@/app/components/Nav";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav />
      {children}
    </>
  );
}
