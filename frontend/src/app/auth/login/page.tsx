"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { login, clearError, selectAuthLoading, selectAuthError, selectIsAuthenticated } from "@/store/slices/authSlice";

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const [form, setForm] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard");
    return () => { dispatch(clearError()); };
  }, [isAuthenticated, router, dispatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password) return;
    dispatch(login({ username: form.username, password: form.password }));
  };

  return (
    <div className="min-h-screen bg-[#f8fafb] flex">
      {/* Left: branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0f1923] flex-col justify-between p-12 relative overflow-hidden">
        {/* Blueprint grid */}
        <div className="absolute inset-0 blueprint-grid opacity-40" />

        {/* Decorative solar panels */}
        <div className="absolute bottom-0 right-0 grid gap-2 p-8 opacity-10" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
          {Array.from({ length: 30 }, (_, i) => (
            <div key={i} className="w-10 h-16 bg-[#8dd0e9] rounded-sm border border-[#8dd0e9]/30" />
          ))}
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ffba20] to-[#513800] flex items-center justify-center">
              <span className="material-symbols-outlined text-white" style={{ fontSize: 18 }}>wb_sunny</span>
            </div>
            <h1 className="font-headline font-bold text-xl text-white">SolarArchitect</h1>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#8dd0e9]/50 font-bold">Technical Precision</p>
        </div>

        <div className="relative z-10">
          <blockquote className="text-2xl font-headline font-bold text-white leading-tight mb-4">
            "Precision engineering <br />
            for a <span className="text-[#ffba20]">solar-powered</span> world."
          </blockquote>
          <div className="flex gap-8">
            {[
              { value: "142.5 MW", label: "Designed" },
              { value: "342", label: "Active Sites" },
              { value: "1.42 GWh", label: "Generated" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="font-headline font-bold text-lg text-[#ffba20]">{stat.value}</div>
                <div className="text-[10px] text-[#8dd0e9]/50 uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#ffba20] to-[#513800] flex items-center justify-center">
              <span className="material-symbols-outlined text-white" style={{ fontSize: 16 }}>wb_sunny</span>
            </div>
            <span className="font-headline font-bold text-[#191c1d]">SolarArchitect</span>
          </div>

          <h2 className="font-headline font-bold text-2xl text-[#191c1d] mb-1">Welcome back</h2>
          <p className="text-sm text-[#40484c] mb-8">Sign in to your engineer account</p>

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 bg-[#ffdad6] border border-[#ba1a1a]/20 rounded-xl px-4 py-3 mb-6">
              <span className="material-symbols-outlined text-[#ba1a1a] flex-shrink-0" style={{ fontSize: 18 }}>error</span>
              <p className="text-sm text-[#ba1a1a]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#40484c] mb-1.5">
                Username
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#70787d]" style={{ fontSize: 18 }}>
                  person
                </span>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                  placeholder="your.username"
                  autoComplete="username"
                  required
                  className="w-full bg-[#eceeef] rounded-xl py-3 pl-11 pr-4 text-sm text-[#191c1d] outline-none focus:ring-2 focus:ring-[#19667d]/30 focus:bg-white transition-all placeholder:text-[#70787d]"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#40484c]">
                  Password
                </label>
                <Link href="/auth/forgot-password" className="text-[10px] font-bold text-[#19667d] hover:opacity-75 transition-opacity">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#70787d]" style={{ fontSize: 18 }}>
                  lock
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full bg-[#eceeef] rounded-xl py-3 pl-11 pr-12 text-sm text-[#191c1d] outline-none focus:ring-2 focus:ring-[#19667d]/30 focus:bg-white transition-all placeholder:text-[#70787d]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#70787d] hover:text-[#40484c] transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !form.username || !form.password}
              className="w-full btn-primary py-3.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60 mt-6"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>login</span>
                  Sign In
                </>
              )}
            </button>

            {/* Demo credentials hint */}
            <div className="bg-[#a1e4fe]/20 border border-[#19667d]/20 rounded-xl px-4 py-3 mt-2">
              <p className="text-[10px] font-bold text-[#19667d] uppercase tracking-wide mb-1">Demo Credentials</p>
              <p className="text-xs text-[#40484c]">Username: <strong>admin</strong> · Password: <strong>admin123</strong></p>
            </div>
          </form>

          <p className="text-sm text-[#40484c] text-center mt-8">
            Don't have an account?{" "}
            <Link href="/auth/register" className="font-bold text-[#19667d] hover:opacity-75 transition-opacity">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
