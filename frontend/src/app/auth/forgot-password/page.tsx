"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/password-reset/", { email });
      setSubmitted(true);
    } catch {
      // Always show success to prevent email enumeration
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafb] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ffba20] to-[#513800] flex items-center justify-center">
            <span className="material-symbols-outlined text-white" style={{ fontSize: 18 }}>wb_sunny</span>
          </div>
          <span className="font-headline font-bold text-[#191c1d]">SolarArchitect</span>
        </div>

        {submitted ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-[#dcfce7] flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[#166534]" style={{ fontSize: 32 }}>mark_email_read</span>
            </div>
            <h2 className="font-headline font-bold text-xl text-[#191c1d] mb-2">Check your email</h2>
            <p className="text-sm text-[#40484c] mb-6">
              If an account exists for <strong>{email}</strong>, we've sent a password reset link. Check your inbox and spam folder.
            </p>
            <Link href="/auth/login" className="btn-primary px-6 py-3 text-sm inline-flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
              Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <h2 className="font-headline font-bold text-2xl text-[#191c1d] mb-1">Reset password</h2>
            <p className="text-sm text-[#40484c] mb-8">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            {error && (
              <div className="flex items-center gap-2 bg-[#ffdad6] rounded-xl px-4 py-3 mb-5">
                <span className="material-symbols-outlined text-[#ba1a1a]" style={{ fontSize: 18 }}>error</span>
                <p className="text-sm text-[#ba1a1a]">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#40484c] mb-1.5">Email Address</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#70787d]" style={{ fontSize: 18 }}>email</span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com" required
                    className="w-full bg-[#eceeef] rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#19667d]/30 focus:bg-white transition-all" />
                </div>
              </div>
              <button type="submit" disabled={loading || !email}
                className="w-full btn-primary py-3.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Sending…</>
                ) : (
                  <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span> Send Reset Link</>
                )}
              </button>
            </form>

            <p className="text-sm text-[#40484c] text-center mt-6">
              Remember your password?{" "}
              <Link href="/auth/login" className="font-bold text-[#19667d] hover:opacity-75">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
