import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "#F5F0EA" }}>
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-stone-200">
        <span className="text-2xl font-serif font-semibold" style={{ color: "#2C2C2C" }}>
          The Formula
        </span>
        <div className="flex items-center gap-8">
          <Link href="/" className="text-sm font-medium" style={{ color: "#8B4513" }}>
            Home
          </Link>
          <Link href="/dupes" className="text-sm font-medium text-stone-600 hover:text-stone-900">
            Dupe Detector
          </Link>
          <Link href="/log" className="text-sm font-medium text-stone-600 hover:text-stone-900">
            My Log
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/signup" className="text-sm font-medium text-stone-600 hover:text-stone-900">
            Sign Up
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: "#8B4513" }}
          >
            Log In
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-20 pb-12">
        <h1 className="text-5xl font-serif font-semibold mb-4" style={{ color: "#2C2C2C" }}>
          Start Building Your Formula
        </h1>
        <p className="text-lg text-stone-500 mb-10 max-w-xl">
          Your personal product history — so you never waste money on something you've already tried.
        </p>

        {/* Search bar */}
        <div className="w-full max-w-2xl mb-6">
          <div className="flex items-center gap-3 bg-white rounded-full px-6 py-4 shadow-sm border border-stone-200">
            <svg className="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search a product to add to your log..."
              className="flex-1 bg-transparent outline-none text-stone-700 placeholder-stone-400"
            />
          </div>
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-4">
          <Link
            href="/signup"
            className="px-6 py-3 rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: "#8B4513" }}
          >
            Create Free Account
          </Link>
          <Link
            href="/"
            className="px-6 py-3 rounded-full text-sm font-medium border border-stone-300 text-stone-700 hover:bg-stone-100"
          >
            Try Without Signing Up
          </Link>
        </div>
      </section>

      {/* Smart Tracking Section */}
      <section className="px-8 py-16" style={{ backgroundColor: "#EDE8E0" }}>
        <div className="max-w-6xl mx-auto grid grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "#8B4513" }}>
              Smart Tracking
            </p>
            <h2 className="text-3xl font-serif font-semibold mb-4" style={{ color: "#2C2C2C" }}>
              Never repurchase a product you've abandoned
            </h2>
            <p className="text-stone-500 mb-6 leading-relaxed">
              Keep a personal log of every product you've tried. Mark favorites, note why you abandoned others, and get alerts when you're about to buy something similar to a product that didn't work for you.
            </p>
            <Link
              href="/log"
              className="inline-block px-5 py-2.5 rounded-full text-sm font-medium border border-stone-400 text-stone-700 hover:bg-stone-200"
            >
              View My Log
            </Link>
          </div>

          {/* Product cards */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-stone-100" />
                <div>
                  <p className="text-xs font-semibold tracking-widest uppercase text-stone-400">CeraVe</p>
                  <p className="font-semibold text-stone-800">CeraVe Moisturizing Cream</p>
                  <span className="inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
                    Abandoned
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-stone-100" />
                <div>
                  <p className="text-xs font-semibold tracking-widest uppercase text-stone-400">La Roche-Posay</p>
                  <p className="font-semibold text-stone-800">La Roche-Posay Toleriane</p>
                  <span className="inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    Love It
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="px-8 py-16" style={{ backgroundColor: "#F5F0EA" }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-serif font-semibold text-center mb-10" style={{ color: "#2C2C2C" }}>
            Everything you need to make smarter choices
          </h2>
          <div className="grid grid-cols-3 gap-6">
            {[
              { title: "Find Dupes", desc: "Discover affordable alternatives with similar formulations and ingredients." },
              { title: "Check Ingredients", desc: "Instantly identify potential irritants, comedogenic ingredients, and fungal acne triggers." },
              { title: "Read Reviews", desc: "Get summarized insights from real user reviews across Reddit, MakeupAlley, and more." },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-8 shadow-sm text-center">
                <h3 className="font-semibold text-lg mb-2" style={{ color: "#2C2C2C" }}>{f.title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-10 border-t border-stone-200" style={{ backgroundColor: "#F5F0EA" }}>
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <p className="font-serif font-semibold text-lg" style={{ color: "#2C2C2C" }}>The Formula</p>
            <p className="text-stone-400 text-sm">Know what's in it. Know if you've tried it.</p>
          </div>
          <div className="flex gap-8 text-sm text-stone-500">
            <Link href="/">Home</Link>
            <Link href="/dupes">Dupe Detector</Link>
            <Link href="/log">My Log</Link>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-6 text-center text-xs text-stone-400">
          © 2026 The Formula. All rights reserved. We are not a medical tool — always consult your dermatologist.
        </div>
      </footer>
    </main>
  );
}
