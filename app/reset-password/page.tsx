"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Supabase automatically handles the token from the URL hash
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setValidSession(true);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setDone(true);
      setTimeout(() => router.push("/log"), 2500);
    }
  };

  return (
    <main className="min-h-screen flex flex-col" style={{ backgroundColor: "#F5F0EA" }}>
      <nav className="flex items-center justify-between px-8 py-5 border-b border-stone-200">
        <Link href="/" className="text-2xl font-serif font-semibold" style={{ color: "#2C2C2C" }}>
          The Formula
        </Link>
      </nav>

      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-serif font-semibold mb-2 text-center" style={{ color: "#2C2C2C" }}>
            Set new password
          </h1>
          <p className="text-stone-500 text-center mb-8">Choose a new password for your account.</p>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-100">
            {done ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-semibold text-stone-800 mb-1">Password updated!</p>
                <p className="text-stone-500 text-sm">Redirecting you to your log...</p>
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
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">New password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none text-stone-700 placeholder-stone-300 focus:border-stone-400 bg-stone-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Confirm password</label>
                    <input
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Repeat your new password"
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
                    {loading ? "Updating..." : "Update Password"}
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
