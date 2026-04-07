import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Layers } from "lucide-react";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event from the hash fragment
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    if (password !== confirm) { toast.error("Passwords do not match."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated!");
      navigate("/", { replace: true });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-10 animate-fade-in text-center">
        <div className="space-y-4">
          <div className="inline-flex p-4 rounded-2xl bg-primary/8 border border-primary/10">
            <Layers className="h-9 w-9 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Set new password</h1>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          {ready ? (
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">New password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" className="h-10" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Confirm password</Label>
                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" className="h-10" />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                {loading ? "Updating…" : "Update password"}
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">Verifying your reset link…</p>
          )}
        </div>
      </div>
    </div>
  );
}
