import Link from "next/link";

const ingredients = [
  { name: "Water", safe: true },
  { name: "Glycerin", safe: true },
  { name: "Niacinamide", safe: true, benefit: "Brightening" },
  { name: "Cetearyl Alcohol", safe: true },
  { name: "Dimethicone", warn: true, reason: "Potential fungal acne trigger" },
  { name: "Fragrance", warn: true, reason: "Common irritant" },
  { name: "Ceramide NP", safe: true, benefit: "Barrier repair" },
  { name: "Hyaluronic Acid", safe: true, benefit: "Hydration" },
  { name: "Tocopherol", safe: true, benefit: "Antioxidant" },
  { name: "Sodium Hydroxide", safe: true },
];

export default function ProductPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "#F5F0EA" }}>
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-stone-200">
        <Link href="/" className="text-2xl font-serif font-semibold" style={{ color: "#2C2C2C" }}>
          The Formula
        </Link>
        <div className="flex items-center gap-8">
          <Link href="/" className="text-sm font-medium text-stone-600 hover:text-stone-900">Home</Link>
          <Link href="/dupes" className="text-sm font-medium text-stone-600 hover:text-stone-900">Dupe Detector</Link>
          <Link href="/log" className="text-sm font-medium text-stone-600 hover:text-stone-900">My Log</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/signup" className="text-sm font-medium text-stone-600 hover:text-stone-900">Sign Up</Link>
          <Link href="/login" className="px-4 py-2 rounded-full text-sm font-medium text-white" style={{ backgroundColor: "#8B4513" }}>Log In</Link>
        </div>
      </nav>

      {/* Similarity warning */}
      <div className="px-8 py-4" style={{ backgroundColor: "#FEF3C7" }}>
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <span className="text-amber-500">⚠️</span>
          <p className="text-sm text-amber-800 font-medium">
            83% similar to Vanicream Moisturizing Cream — which you abandoned in March 2024 (Too heavy)
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-10 grid grid-cols-2 gap-12">
        {/* Left column */}
        <div>
          <div className="w-full aspect-square rounded-2xl bg-stone-100 mb-6 flex items-center justify-center">
            <span className="text-stone-300 text-sm">Product Image</span>
          </div>

          {/* Buy buttons */}
          <div className="flex flex-col gap-3">
            <button className="w-full py-3 rounded-full text-white font-medium text-sm" style={{ backgroundColor: "#8B4513" }}>
              Buy at Sephora
            </button>
            <button className="w-full py-3 rounded-full border border-stone-300 text-stone-700 font-medium text-sm hover:bg-stone-100">
              Buy at Ulta
            </button>
            <button className="w-full py-3 rounded-full border border-stone-300 text-stone-700 font-medium text-sm hover:bg-stone-100">
              Buy on Amazon
            </button>
          </div>
        </div>

        {/* Right column */}
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#8B4513" }}>CeraVe</p>
          <h1 className="text-3xl font-serif font-semibold mb-1" style={{ color: "#2C2C2C" }}>
            CeraVe Daily Moisturizing Lotion
          </h1>
          <p className="text-xl text-stone-500 mb-6">$14.99</p>

          {/* Quality badges */}
          <div className="flex flex-wrap gap-2 mb-8">
            {[
              { label: "Fungal Acne Safe", safe: true },
              { label: "Fragrance Free", safe: true },
              { label: "Alcohol Free", safe: true },
              { label: "Not FA Safe", safe: false },
            ].map((badge) => (
              <span
                key={badge.label}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  badge.safe ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                }`}
              >
                {badge.safe ? "✓" : "⚠"} {badge.label}
              </span>
            ))}
          </div>

          {/* Add to log */}
          <button
            className="w-full py-3 rounded-full text-white font-medium text-sm mb-8"
            style={{ backgroundColor: "#8B4513" }}
          >
            + Add to My Log
          </button>

          {/* Ingredient list */}
          <h2 className="font-semibold text-stone-800 mb-3">Ingredient List</h2>
          <div className="flex flex-col gap-2 mb-8">
            {ingredients.map((ing) => (
              <div
                key={ing.name}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm ${
                  ing.warn
                    ? "bg-amber-50 border border-amber-200"
                    : ing.benefit
                    ? "bg-green-50 border border-green-100"
                    : "bg-white border border-stone-100"
                }`}
              >
                <span className={ing.warn ? "text-amber-800 font-medium" : ing.benefit ? "text-green-800" : "text-stone-700"}>
                  {ing.name}
                </span>
                {ing.warn && <span className="text-xs text-amber-600">{ing.reason}</span>}
                {ing.benefit && <span className="text-xs text-green-600">{ing.benefit}</span>}
              </div>
            ))}
          </div>

          {/* Review sentiment */}
          <h2 className="font-semibold text-stone-800 mb-3">What people are saying</h2>
          <div className="flex flex-col gap-3">
            {[
              "Frequently recommended for dry and sensitive skin types",
              "Some users report purging in the first 2 weeks of use",
              "Widely praised as a budget-friendly alternative to luxury moisturizers",
            ].map((review) => (
              <div key={review} className="bg-white rounded-xl px-4 py-3 border border-stone-100 text-sm text-stone-600">
                {review}
              </div>
            ))}
            <p className="text-xs text-stone-400 mt-1">Summarized from Reddit & MakeupAlley</p>
          </div>
        </div>
      </div>
    </main>
  );
}
