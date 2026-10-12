"use client";

import { useEffect, useState, use, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Command, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

type InviteDetails = {
  token: string;
  email: string;
  role: string;
  projectName: string;
  projectId: string;
  expiresAt: string;
  isExpired: boolean;
};

function InviteContent({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    async function loadInvite() {
      try {
        const res = await fetch(`/api/auth/invite?token=${encodeURIComponent(token)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Invalid invitation");
        setInvite(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load invitation");
      } finally {
        setLoading(false);
      }
    }
    void loadInvite();
  }, [token]);

  const handleAccept = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to accept invite");
      setAccepted(true);
      setTimeout(() => {
        router.replace(`/projects/${json.data.projectId}/dashboard`);
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invite. Please sign in first.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-foreground">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center gap-2 font-bold text-xl">
          <span className="brand-mark">
            <Command size={20} />
          </span>
          <span>BuildFlow</span>
        </div>

        <Card className="shadow-xl border-border">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Project Invitation</CardTitle>
            <CardDescription>You have been invited to collaborate on a BuildFlow workspace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            {loading ? (
              <p className="text-center text-sm text-muted-foreground py-6">Checking invitation details…</p>
            ) : error && !invite ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-12 h-12 rounded-full bg-destructive/15 text-destructive flex items-center justify-center mx-auto">
                  <AlertTriangle size={24} />
                </div>
                <p className="text-sm text-destructive font-medium">{error}</p>
                <Link href="/login" className="inline-block text-xs font-semibold text-primary underline">
                  Back to login
                </Link>
              </div>
            ) : invite?.isExpired ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-12 h-12 rounded-full bg-destructive/15 text-destructive flex items-center justify-center mx-auto">
                  <AlertTriangle size={24} />
                </div>
                <p className="text-sm font-semibold">This invitation has expired</p>
                <p className="text-xs text-muted-foreground">Please ask the project owner to issue a new invitation link.</p>
                <Link href="/login" className="inline-block text-xs font-semibold text-primary underline">
                  Back to login
                </Link>
              </div>
            ) : accepted ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-12 h-12 rounded-full bg-[#31e183]/20 text-[#0fa95d] flex items-center justify-center mx-auto">
                  <CheckCircle2 size={24} />
                </div>
                <p className="text-sm font-bold text-foreground">Invitation accepted!</p>
                <p className="text-xs text-muted-foreground">Redirecting to workspace dashboard…</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-secondary border border-border space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Project:</span>
                    <span className="font-bold text-foreground">{invite?.projectName}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Assigned Role:</span>
                    <Badge variant="accent">{invite?.role}</Badge>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Invited Email:</span>
                    <span className="font-mono text-muted-foreground">{invite?.email}</span>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs font-medium">
                    {error}
                  </div>
                )}

                <Button className="w-full py-3 gap-2" disabled={busy} onClick={handleAccept}>
                  Accept Invitation <ArrowRight size={15} />
                </Button>

                <p className="text-center text-[11px] text-muted-foreground">
                  Need to switch accounts?{" "}
                  <Link href="/login" className="text-primary font-semibold hover:underline">
                    Sign in here
                  </Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function InvitePage(props: { params: Promise<{ token: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center p-6 text-foreground">
          <p className="text-muted-foreground text-sm">Loading invitation…</p>
        </div>
      }
    >
      <InviteContent params={props.params} />
    </Suspense>
  );
}
