"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen flex flex-col" style={{ backgroundColor: "#F5F0EA" }}>
      <nav className="flex items-center justify-between px-8 py-5 border-b border-stone-200">
        <Link href="/" className="text-2xl font-serif font-semibold" style={{ color: "#2C2C2C" }}>
          The Formula
        </Link>
        <Link href="/login" className="text-sm font-medium" style={{ color: "#8B4513" }}>
          Back to log in
        </Link>
      </nav>

      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-serif font-semibold mb-2 text-center" style={{ color: "#2C2C2C" }}>
            Reset your password
          </h1>
          <p className="text-stone-500 text-center mb-8">
            Enter your email and we'll send you a reset link.
          </p>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-100">
            {sent ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-semibold text-stone-800 mb-1">Check your inbox</p>
                <p className="text-stone-500 text-sm">
                  We sent a password reset link to <span className="font-medium text-stone-700">{email}</span>.
                </p>
                <p className="text-stone-400 text-xs mt-3">Didn't get it? Check your spam folder.</p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                    {error}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Email address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none text-stone-700 placeholder-stone-300 focus:border-stone-400 bg-stone-50"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-full text-white font-medium text-sm disabled:opacity-60"
                    style={{ backgroundColor: "#8B4513" }}
                  >
                    {loading ? "Sending..." : "Send Reset Link"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
