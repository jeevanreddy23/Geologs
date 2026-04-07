import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Layers } from "lucide-react";
import { toast } from "sonner";

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) navigate("/", { replace: true });
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/", { replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Sign in failed. Please try again.");
      }
      if (result.redirected) return;
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Hero — Apple-style dramatic whitespace */}
      <div className="w-full max-w-sm space-y-10 animate-fade-in text-center">

        {/* Brand mark */}
        <div className="space-y-4">
          <div className="inline-flex p-4 rounded-2xl bg-primary/8 border border-primary/10">
            <Layers className="h-9 w-9 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Geologs</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              AS 1726:2017 Geotechnical Logging
            </p>
          </div>
        </div>

        {/* Sign in card — Stripe-level clarity */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm space-y-5">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">Welcome back</h2>
            <p className="text-xs text-muted-foreground">Sign in to continue logging</p>
          </div>

          <Button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm rounded-lg hover-scale"
          >
            <svg className="h-4 w-4 mr-2.5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {loading ? "Signing in…" : "Continue with Google"}
          </Button>
        </div>

        {/* Footer */}
        <p className="text-[10px] text-muted-foreground/50">
          Fast, secure sign-in · Data encrypted at rest
        </p>
      </div>
    </div>
  );
}
