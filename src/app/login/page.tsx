"use client";

import { useState } from "react";
import { Command } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function Login() {
  const [register, setRegister] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const response = await fetch(`/api/auth/${register ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      window.location.assign(
        result.data.projectId ? `/projects/${result.data.projectId}/dashboard` : "/projects"
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-art">
        <div className="brand">
          <span className="brand-mark">
            <Command size={19} />
          </span>
          <span>BuildFlow</span>
        </div>
        <div className="login-quote">
          <h1>From product script to shipped software.</h1>
          <p>
            Give your team the context, ownership, and quality gates they need to deliver confidently.
          </p>
        </div>
        <small className="text-muted-foreground font-medium">BuildFlow Workspace Engine</small>
      </section>

      <section className="login-card relative">
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <h2>{register ? "Create your workspace" : "Welcome back"}</h2>
          <p>{register ? "Start organizing your product and team." : "Sign in to your workspace."}</p>

          {register && (
            <div className="field">
              <Label htmlFor="name" className="mb-2 block">
                Your name
              </Label>
              <Input id="name" name="name" required minLength={2} maxLength={80} placeholder="Alex Chen" />
            </div>
          )}

          <div className="field">
            <Label htmlFor="email" className="mb-2 block">
              Email address
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="alex@acme.com"
            />
          </div>

          <div className="field">
            <Label htmlFor="password" className="mb-2 block">
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              minLength={10}
              maxLength={128}
              autoComplete={register ? "new-password" : "current-password"}
              required
              placeholder="••••••••••••"
            />
          </div>

          {error && <p role="alert">{error}</p>}

          <Button type="submit" disabled={busy} className="w-full mt-2">
            {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full mt-3 text-xs"
            onClick={() => {
              setRegister(!register);
              setError("");
            }}
          >
            {register ? "Already have an account? Sign in" : "New here? Create an account"}
          </Button>
        </form>
      </section>
    </main>
  );
}
