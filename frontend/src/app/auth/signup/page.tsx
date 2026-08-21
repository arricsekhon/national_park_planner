import Image from "next/image";

import { SignupForm } from "@/components/signup-form";

export default function SignUpPage() {
  return (
    <div className="mt-[var(--nav-h)] grid min-h-[calc(100svh-var(--nav-h))] bg-surface lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
      <div className="flex flex-col p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md">
            <SignupForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <Image
          src="/auth-signup.webp"
          alt="Snow-dusted red and white canyon cliffs"
          fill
          priority
          className="object-cover object-center dark:brightness-[0.2] dark:grayscale"
          sizes="40vw"
        />
      </div>
    </div>
  );
}
