"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Check, Eye, EyeOff } from "lucide-react";

import { AuthIcon } from "@/app/auth/AuthIcon";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

export function SignupForm({ className, ...props }: React.ComponentProps<"form">) {
  const { signUp, signInWithGoogle, user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const nameId = "signup-name";
  const emailId = "signup-email";
  const passwordId = "signup-password";
  const confirmId = "signup-confirm";
  const rulesId = "signup-password-rules";
  const errorId = "signup-error";

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  const passwordLongEnough = password.length >= 6;
  const passwordsMatch = confirm.length === 0 || password === confirm;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Enter your full name.");
      return;
    }
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    if (!passwordLongEnough) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!confirm) {
      setError("Confirm your password.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await signUp(name.trim(), email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError("");
    setGoogleLoading(true);

    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign up failed.");
      setGoogleLoading(false);
    }
  };

  return (
    <form
      className={cn("flex flex-col gap-5 sm:gap-6", className)}
      onSubmit={handleSubmit}
      noValidate
      {...props}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
        <p className="text-balance text-sm text-muted-foreground">
          Enter your details to create your TrailQuest account.
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        onClick={handleGoogleSignUp}
        disabled={googleLoading}
        aria-busy={googleLoading}
      >
        <AuthIcon name="google" className="size-4" />
        {googleLoading ? "Opening Google..." : "Sign up with Google"}
      </Button>

      <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
        <span className="relative z-10 bg-surface px-2 text-muted-foreground">Or continue with email</span>
      </div>

      <div className="grid gap-3.5">
        <div className="grid gap-2">
          <Label htmlFor={nameId}>Full name</Label>
          <Input
            id={nameId}
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Jane Smith"
            aria-invalid={error === "Enter your full name."}
            aria-describedby={error ? errorId : undefined}
            className="h-11"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={emailId}>Email</Label>
          <Input
            id={emailId}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            aria-invalid={error === "Enter your email address."}
            aria-describedby={error ? errorId : undefined}
            className="h-11"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={passwordId}>Password</Label>
          <div className="relative">
            <Input
              id={passwordId}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              aria-invalid={error === "Password must be at least 6 characters." || Boolean(password && !passwordLongEnough)}
              aria-describedby={`${rulesId}${error ? ` ${errorId}` : ""}`}
              className="h-11 pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1.5 top-1/2 size-8 -translate-y-1/2 text-muted-foreground"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={confirmId}>Confirm password</Label>
          <Input
            id={confirmId}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="Repeat password"
            aria-invalid={error === "Confirm your password." || error === "Passwords do not match." || Boolean(confirm && !passwordsMatch)}
            aria-describedby={`${rulesId}${error ? ` ${errorId}` : ""}`}
            className="h-11"
          />
        </div>
      </div>

      <div id={rulesId} aria-live="polite" className="grid gap-2 rounded-lg border bg-muted/40 p-3">
        <PasswordRule active={passwordLongEnough} label="At least 6 characters" />
        <PasswordRule active={Boolean(confirm) && password === confirm} label="Passwords match" muted={!confirm} />
      </div>

      {error && (
        <Alert id={errorId} variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="h-11 w-full" disabled={loading} aria-busy={loading}>
        {loading ? "Creating account..." : "Create account"}
        <ArrowRight className="size-4" />
      </Button>

      <div className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/auth/signin" className="font-medium text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </div>
    </form>
  );
}

function PasswordRule({ active, label, muted = false }: { active: boolean; label: string; muted?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 text-xs font-medium", active ? "text-primary" : muted ? "text-muted-foreground" : "text-destructive")}>
      <span className={cn("flex size-5 items-center justify-center rounded-md", active ? "bg-primary/10" : "bg-foreground/5")}>
        <Check className="size-3.5" />
      </span>
      {label}
    </div>
  );
}
