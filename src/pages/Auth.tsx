import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Layers, Mail, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

type View = "main" | "login" | "signup" | "forgot";

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>("main");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
      if (result.error) toast.error("Sign in failed. Please try again.");
      if (result.redirected) return;
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) toast.error(error.message);
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !confirmPassword) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Check your email for a verification link.");
        setView("login");
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Check your email for a reset link.");
        setView("login");
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const goTo = (v: View) => {
    resetForm();
    setView(v);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-10 animate-fade-in text-center">
        {/* Brand */}
        <div className="space-y-4">
          <div className="inline-flex p-4 rounded-2xl bg-primary/8 border border-primary/10">
            <Layers className="h-9 w-9 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Geologs</h1>
            <p className="text-sm text-muted-foreground mt-1.5">AS 1726:2017 Geotechnical Logging</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm space-y-5">
          {view === "main" && (
            <>
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

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex-1 h-px bg-border" />
                <span>or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => goTo("login")}
                  className="flex-1 h-10 text-sm font-medium"
                >
                  <Mail className="h-3.5 w-3.5 mr-1.5" />
                  Sign in
                </Button>
                <Button
                  variant="outline"
                  onClick={() => goTo("signup")}
                  className="flex-1 h-10 text-sm font-medium"
                >
                  Create account
                </Button>
              </div>
            </>
          )}

          {view === "login" && (
            <form onSubmit={handleEmailLogin} className="space-y-4 text-left">
              <button type="button" onClick={() => goTo("main")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
              <h2 className="text-base font-semibold text-foreground">Sign in with email</h2>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-10" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-10" />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                {loading ? "Signing in…" : "Sign in"}
              </Button>
              <button type="button" onClick={() => goTo("forgot")} className="text-xs text-primary hover:underline w-full text-center">
                Forgot password?
              </button>
            </form>
          )}

          {view === "signup" && (
            <form onSubmit={handleEmailSignup} className="space-y-4 text-left">
              <button type="button" onClick={() => goTo("main")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
              <h2 className="text-base font-semibold text-foreground">Create account</h2>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-10" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Confirm password</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="h-10" />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                {loading ? "Creating account…" : "Create account"}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                A verification email will be sent to confirm your address.
              </p>
            </form>
          )}

          {view === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-4 text-left">
              <button type="button" onClick={() => goTo("login")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
              <h2 className="text-base font-semibold text-foreground">Reset password</h2>
              <p className="text-xs text-muted-foreground">Enter your email to receive a reset link.</p>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-10" autoFocus />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                {loading ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground/50">
          Fast, secure sign-in · Data encrypted at rest
        </p>
      </div>
    </div>
  );
}
