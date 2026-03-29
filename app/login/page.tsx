"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/log");
    }
  };

  return (
    <main className="min-h-screen flex flex-col" style={{ backgroundColor: "#F5F0EA" }}>
      <nav className="flex items-center justify-between px-8 py-5 border-b border-stone-200">
        <Link href="/" className="text-2xl font-serif font-semibold" style={{ color: "#2C2C2C" }}>
          The Formula
        </Link>
        <p className="text-sm text-stone-500">
          Don't have an account?{" "}
          <Link href="/signup" className="font-medium" style={{ color: "#8B4513" }}>
            Sign up free
          </Link>
        </p>
      </nav>

      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-serif font-semibold mb-2 text-center" style={{ color: "#2C2C2C" }}>
            Welcome back
          </h1>
          <p className="text-stone-500 text-center mb-8">Log in to your Formula account.</p>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-100">
            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jamie@example.com"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none text-stone-700 placeholder-stone-300 focus:border-stone-400 bg-stone-50"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="block text-sm font-medium text-stone-700">Password</label>
                  <Link href="/forgot-password" className="text-sm" style={{ color: "#8B4513" }}>
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none text-stone-700 placeholder-stone-300 focus:border-stone-400 bg-stone-50"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full text-white font-medium text-sm mt-2 disabled:opacity-60"
                style={{ backgroundColor: "#8B4513" }}
              >
                {loading ? "Logging in..." : "Log In"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
