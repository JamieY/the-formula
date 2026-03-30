"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/welcome");
    }
  };

  return (
    <main className="min-h-screen flex flex-col" style={{ backgroundColor: "#F5F0EA" }}>
      <nav className="flex items-center justify-between px-8 py-5 border-b border-stone-200">
        <Link href="/" className="text-2xl font-serif font-semibold" style={{ color: "#2C2C2C" }}>
          The Formula
        </Link>
        <p className="text-sm text-stone-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium" style={{ color: "#8B4513" }}>
            Log in
          </Link>
        </p>
      </nav>

      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-serif font-semibold mb-2 text-center" style={{ color: "#2C2C2C" }}>
            Create your account
          </h1>
          <p className="text-stone-500 text-center mb-8">Start building your personal product formula.</p>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-100">
            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSignUp} className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="First Last"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none text-stone-700 placeholder-stone-300 focus:border-stone-400 bg-stone-50"
                />
              </div>

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

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  minLength={8}
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
                {loading ? "Creating account..." : "Create Free Account"}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-stone-400 mt-6">
            By creating an account you agree to our Terms of Service and Privacy Policy.
            <br />We are not a medical tool — always consult your dermatologist.
          </p>
        </div>
      </div>
    </main>
  );
}
