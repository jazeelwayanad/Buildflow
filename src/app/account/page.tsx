"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Command, ArrowLeft, Shield, KeyRound, Monitor, User, LogOut } from "lucide-react";

type AccountData = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  currentSessionId: string | null;
  sessions: { id: string; expiresAt: string; isCurrent: boolean }[];
  projects: { id: string; name: string; role: string }[];
};

export default function AccountPage() {
  const router = useRouter();
  const {
    data,
    error: loadError,
    isLoading,
    mutate: reload,
  } = useSWR<AccountData>(
    "/api/auth/account",
    async (url: string) => {
      const res = await fetch(url);
      if (res.status === 401) {
        router.replace("/login");
        throw new Error("Please sign in");
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data;
    },
    { shouldRetryOnError: false }
  );

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("name") ?? "");
    const email = String(formData.get("email") ?? "");
    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      setMessage("Profile updated successfully");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Password change failed");
      setMessage("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password change failed");
    } finally {
      setBusy(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/revoke-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) throw new Error("Revocation failed");
      setMessage("Session terminated");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revocation failed");
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <p className="text-muted-foreground text-sm">Loading your account…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/projects" className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted">
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2 font-bold text-lg">
              <span className="brand-mark">
                <Command size={18} />
              </span>
              <span>BuildFlow</span>
            </div>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-semibold">Account & Security</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut size={14} />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-6 md:p-10 space-y-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Account settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your identity, password, and active web sessions.</p>
        </div>

        {message && <div className="notice">{message}</div>}
        {(error || loadError) && (
          <div className="p-3.5 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-sm font-medium">
            {error || loadError?.message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User size={18} className="text-primary" />
                <CardTitle>Profile Details</CardTitle>
              </div>
              <CardDescription>Update your personal information displayed across workspaces.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="field">
                  <label htmlFor="name">Full Name</label>
                  <input
                    id="name"
                    name="name"
                    defaultValue={data?.name ?? ""}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={data?.email ?? ""}
                    required
                  />
                </div>
                <Button type="submit" disabled={busy}>Save profile</Button>
              </form>
            </CardContent>
          </Card>

          {/* Password Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <KeyRound size={18} className="text-primary" />
                <CardTitle>Change Password</CardTitle>
              </div>
              <CardDescription>Ensure your account stays secure by using a strong password.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="field">
                  <label htmlFor="curpass">Current Password</label>
                  <input
                    id="curpass"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="newpass">New Password (min 10 characters)</label>
                  <input
                    id="newpass"
                    type="password"
                    minLength={10}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" variant="secondary" disabled={busy}>Update password</Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Active Sessions */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Monitor size={18} className="text-primary" />
              <CardTitle>Active Web Sessions</CardTitle>
            </div>
            <CardDescription>Sessions currently signed in to your account. You can revoke any unfamiliar sessions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.sessions.map((s, idx) => (
                <div key={s.id || idx} className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-3">
                    <Shield size={16} className={s.isCurrent ? "text-primary" : "text-muted-foreground"} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs">Web Session ({s.id ? s.id.slice(0, 10) : "active"})</span>
                        {s.isCurrent ? (
                          <Badge variant="success">Current session</Badge>
                        ) : (
                          <Badge variant="outline">Other device</Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground">Expires: {new Date(s.expiresAt).toLocaleString()}</span>
                    </div>
                  </div>
                  {!s.isCurrent && (
                    <Button variant="destructive" size="sm" disabled={busy} onClick={() => handleRevokeSession(s.id)}>
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
