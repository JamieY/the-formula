import Link from "next/link";
import HomeSearch from "./components/HomeSearch";
import NavBar from "./components/NavBar";

export default function Home() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "#F5F0EA" }}>
      <NavBar />

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-20 pb-16">
        <div
          className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase mb-6"
          style={{ backgroundColor: "#8B451320", color: "#8B4513" }}
        >
          Free · No credit card required
        </div>
        <h1 className="text-5xl md:text-6xl font-serif font-semibold mb-5 max-w-3xl leading-tight" style={{ color: "#2C2C2C" }}>
          Stop repurchasing products<br />that don&apos;t work for you.
        </h1>
        <p className="text-lg text-stone-500 mb-10 max-w-xl leading-relaxed">
          Search any skincare product to decode its ingredients, then track what works and what doesn&apos;t — all in one place.
        </p>

        <HomeSearch />

        <div className="flex items-center gap-4 mt-2">
          <Link
            href="/signup"
            className="px-6 py-3 rounded-full text-sm font-medium text-white shadow-sm"
            style={{ backgroundColor: "#8B4513" }}
          >
            Create Free Account
          </Link>
          <Link
            href="/search"
            className="px-6 py-3 rounded-full text-sm font-medium border border-stone-300 text-stone-600 hover:bg-stone-100"
          >
            Try Without Signing Up →
          </Link>
        </div>
      </section>

      {/* Ingredient badge strip */}
      <section className="py-6 border-y border-stone-200 overflow-hidden" style={{ backgroundColor: "#EDE8E0" }}>
        <p className="text-center text-xs font-semibold tracking-widest uppercase text-stone-400 mb-4">
          What we check every product for
        </p>
        <div className="flex flex-wrap justify-center gap-3 px-8 max-w-4xl mx-auto">
          {[
            { label: "Fungal Acne Safe", color: "bg-green-100 text-green-700" },
            { label: "Fragrance Free", color: "bg-green-100 text-green-700" },
            { label: "Alcohol Free", color: "bg-green-100 text-green-700" },
            { label: "Comedogenic Ingredients", color: "bg-amber-100 text-amber-700" },
            { label: "Irritants & Sensitizers", color: "bg-amber-100 text-amber-700" },
            { label: "FA Triggers", color: "bg-red-100 text-red-600" },
            { label: "Key Actives", color: "bg-blue-100 text-blue-700" },
            { label: "Niacinamide", color: "bg-blue-100 text-blue-700" },
            { label: "Retinol", color: "bg-blue-100 text-blue-700" },
            { label: "Hyaluronic Acid", color: "bg-blue-100 text-blue-700" },
          ].map((badge) => (
            <span key={badge.label} className={`px-4 py-1.5 rounded-full text-xs font-medium ${badge.color}`}>
              {badge.label}
            </span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-8 py-20" style={{ backgroundColor: "#F5F0EA" }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold tracking-widest uppercase text-center mb-3" style={{ color: "#8B4513" }}>
            How it works
          </p>
          <h2 className="text-3xl font-serif font-semibold text-center mb-14" style={{ color: "#2C2C2C" }}>
            Three steps to smarter skincare
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                step: "01",
                title: "Search any product",
                desc: "Search by brand or product name. We pull ingredients from millions of products in our database.",
              },
              {
                step: "02",
                title: "Decode the ingredients",
                desc: "Instantly see fungal acne triggers, pore-cloggers, irritants, and beneficial actives — color-coded for your skin.",
              },
              {
                step: "03",
                title: "Track what works",
                desc: "Add products to your personal log. Mark them Love It, Still Using, Want to Try, or Abandoned.",
              },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-start">
                <span className="text-4xl font-serif font-semibold mb-4" style={{ color: "#8B451340" }}>
                  {item.step}
                </span>
                <h3 className="font-semibold text-lg mb-2" style={{ color: "#2C2C2C" }}>{item.title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product log mockup section */}
      <section className="px-8 py-16" style={{ backgroundColor: "#EDE8E0" }}>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "#8B4513" }}>
              Your Personal Log
            </p>
            <h2 className="text-3xl font-serif font-semibold mb-4" style={{ color: "#2C2C2C" }}>
              Everything you&apos;ve tried, in one place
            </h2>
            <p className="text-stone-500 mb-6 leading-relaxed">
              Never buy the same disappointing product twice. Your log remembers every product you&apos;ve tried — what you loved, what broke you out, and what you want to test next.
            </p>
            <Link
              href="/signup"
              className="inline-block px-5 py-2.5 rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: "#8B4513" }}
            >
              Start Your Log Free
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            {[
              { brand: "CeraVe", name: "Moisturizing Cream", status: "Abandoned", statusColor: "bg-red-100 text-red-600" },
              { brand: "La Roche-Posay", name: "Toleriane Double Repair", status: "Love It", statusColor: "bg-green-100 text-green-700" },
              { brand: "The Ordinary", name: "Niacinamide 10% + Zinc", status: "Still Using", statusColor: "bg-blue-100 text-blue-700" },
              { brand: "Paula's Choice", name: "2% BHA Liquid Exfoliant", status: "Want to Try", statusColor: "bg-amber-100 text-amber-700" },
            ].map((p) => (
              <div key={p.name} className="bg-white rounded-2xl px-5 py-4 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex-shrink-0" style={{ backgroundColor: "#F5F0EA" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold tracking-widest uppercase text-stone-400">{p.brand}</p>
                  <p className="font-semibold text-stone-800 text-sm truncate">{p.name}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${p.statusColor}`}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-8 py-16" style={{ backgroundColor: "#F5F0EA" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-serif font-semibold text-center mb-12" style={{ color: "#2C2C2C" }}>
            Everything you need to make smarter choices
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[
              {
                icon: "🔬",
                title: "Ingredient Analysis",
                desc: "Every ingredient flagged for fungal acne triggers, comedogenics, irritants, and beneficial actives. Know exactly what you're putting on your skin.",
                href: "/search",
                cta: "Analyze a product",
              },
              {
                icon: "🔄",
                title: "Dupe Detector",
                desc: "Find affordable alternatives to your favorite products. Compare formulas side by side and see how similar they really are.",
                href: "/dupes",
                cta: "Find a dupe",
              },
              {
                icon: "📋",
                title: "Smart Product Log",
                desc: "Track every product you've tried with status labels. Get warned before repurchasing something that didn't work for you.",
                href: "/log",
                cta: "View my log",
              },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-8 shadow-sm flex flex-col">
                <span className="text-3xl mb-4">{f.icon}</span>
                <h3 className="font-semibold text-lg mb-2" style={{ color: "#2C2C2C" }}>{f.title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed mb-6 flex-1">{f.desc}</p>
                <Link href={f.href} className="text-sm font-medium" style={{ color: "#8B4513" }}>
                  {f.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="px-8 py-16">
        <div className="max-w-2xl mx-auto text-center rounded-3xl px-10 py-14 shadow-sm" style={{ backgroundColor: "#8B4513" }}>
          <h2 className="text-3xl font-serif font-semibold text-white mb-3">
            Ready to know your skin?
          </h2>
          <p className="text-white/70 mb-8 leading-relaxed">
            Join thousands of people who track their skincare and never waste money on the wrong products.
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-3.5 rounded-full text-sm font-semibold bg-white"
            style={{ color: "#8B4513" }}
          >
            Create Your Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-10 border-t border-stone-200" style={{ backgroundColor: "#F5F0EA" }}>
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <p className="font-serif font-semibold text-lg" style={{ color: "#2C2C2C" }}>The Formula</p>
            <p className="text-stone-400 text-sm mt-1">Know what&apos;s in it. Know if you&apos;ve tried it.</p>
          </div>
          <div className="flex gap-8 text-sm text-stone-500">
            <Link href="/search" className="hover:text-stone-800">Search</Link>
            <Link href="/dupes" className="hover:text-stone-800">Dupe Detector</Link>
            <Link href="/log" className="hover:text-stone-800">My Log</Link>
            <Link href="/signup" className="hover:text-stone-800">Sign Up</Link>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-6 text-center text-xs text-stone-400">
          © 2026 The Formula. All rights reserved. · Not a medical tool — always consult your dermatologist.
        </div>
      </footer>
    </main>
  );
}
