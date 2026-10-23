"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  AuthScreen,
  FormError,
  SubmitButton,
  TextField,
} from "@/components/AuthScreen";
import { StatusScreen } from "@/components/StatusScreen";
import { ApiClientError, fieldMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { FieldError } from "@/lib/types";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (loading) {
    return <StatusScreen title="PocketPilot" body="Checking your session…" />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: FieldError[] = [];
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.push({ field: "email", message: "Email is required" });
    } else if (!emailPattern.test(trimmedEmail)) {
      nextErrors.push({ field: "email", message: "Enter a valid email" });
    }
    if (!password) {
      nextErrors.push({ field: "password", message: "Password is required" });
    }

    setErrors(nextErrors);
    setFormError(null);
    if (nextErrors.length > 0) return;

    setPending(true);
    try {
      await login(trimmedEmail, password);
      router.push("/dashboard");
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrors(error.errors ?? []);
        setFormError(error.errors?.length ? null : error.message);
      } else {
        setFormError("Could not log in. Please try again.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthScreen
      title="Log in"
      subtitle="Use the email and password for your PocketPilot account."
      footer={
        <>
          New here?{" "}
          <Link href="/register" className="font-medium text-emerald-800 hover:underline dark:text-emerald-300">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {user ? (
          <p className="text-sm text-stone-600 dark:text-stone-400">
            You&apos;re signed in as {user.name}.{" "}
            <Link href="/dashboard" className="font-medium text-emerald-800 hover:underline dark:text-emerald-300">
              Go to dashboard
            </Link>
          </p>
        ) : null}
        <FormError message={formError} />
        <TextField
          id="email"
          label="Email"
          type="email"
          value={email}
          autoComplete="email"
          error={fieldMessage(errors, "email")}
          onChange={setEmail}
        />
        <TextField
          id="password"
          label="Password"
          type="password"
          value={password}
          autoComplete="current-password"
          error={fieldMessage(errors, "password")}
          onChange={setPassword}
        />
        <SubmitButton pending={pending} idleLabel="Log in" pendingLabel="Signing in…" />
      </form>
    </AuthScreen>
  );
}
