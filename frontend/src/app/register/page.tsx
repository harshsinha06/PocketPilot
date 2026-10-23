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

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading, register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (loading) {
    return <StatusScreen title="PocketPilot" body="Checking your session…" />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: FieldError[] = [];
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (trimmedName.length < 2) {
      nextErrors.push({ field: "name", message: "Name must be at least 2 characters" });
    }
    if (!trimmedEmail) {
      nextErrors.push({ field: "email", message: "Email is required" });
    } else if (!emailPattern.test(trimmedEmail)) {
      nextErrors.push({ field: "email", message: "Enter a valid email" });
    }
    if (password.length < 8) {
      nextErrors.push({
        field: "password",
        message: "Password must be at least 8 characters",
      });
    }
    if (password !== confirmPassword) {
      nextErrors.push({ field: "confirmPassword", message: "Passwords do not match" });
    }

    setErrors(nextErrors);
    setFormError(null);
    if (nextErrors.length > 0) return;

    setPending(true);
    try {
      await register({ name: trimmedName, email: trimmedEmail, password });
      router.push("/dashboard");
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrors(error.errors ?? []);
        setFormError(error.errors?.length ? null : error.message);
      } else {
        setFormError("Could not create your account. Please try again.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthScreen
      title="Create an account"
      subtitle="Track this month's spending with your own PocketPilot account."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-emerald-800 hover:underline dark:text-emerald-300">
            Log in
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
          id="name"
          label="Name"
          type="text"
          value={name}
          autoComplete="name"
          error={fieldMessage(errors, "name")}
          onChange={setName}
        />
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
          autoComplete="new-password"
          error={fieldMessage(errors, "password")}
          onChange={setPassword}
        />
        <TextField
          id="confirmPassword"
          label="Confirm password"
          type="password"
          value={confirmPassword}
          autoComplete="new-password"
          error={fieldMessage(errors, "confirmPassword")}
          onChange={setConfirmPassword}
        />
        <SubmitButton
          pending={pending}
          idleLabel="Create account"
          pendingLabel="Creating account…"
        />
      </form>
    </AuthScreen>
  );
}
