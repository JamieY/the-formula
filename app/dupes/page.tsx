import Link from "next/link";

const dupeResults = [
  {
    id: 1,
    brand: "Neutrogena",
    name: "Neutrogena Hydro Boost Water Gel",
    price: "$19",
    match: 91,
    badges: ["Fragrance Free", "Fungal Acne Safe"],
  },
  {
    id: 2,
    brand: "CeraVe",
    name: "CeraVe Moisturizing Cream",
    price: "$14",
    match: 87,
    badges: ["Fragrance Free", "Alcohol Free"],
  },
  {
    id: 3,
    brand: "First Aid Beauty",
    name: "Ultra Repair Cream",
    price: "$34",
    match: 84,
    badges: ["Fragrance Free"],
  },
];

export default function DupeDetector() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "#F5F0EA" }}>
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-stone-200">
        <Link href="/" className="text-2xl font-serif font-semibold" style={{ color: "#2C2C2C" }}>
          The Formula
        </Link>
        <div className="flex items-center gap-8">
          <Link href="/" className="text-sm font-medium text-stone-600 hover:text-stone-900">Home</Link>
          <Link href="/dupes" className="text-sm font-medium" style={{ color: "#8B4513" }}>Dupe Detector</Link>
          <Link href="/log" className="text-sm font-medium text-stone-600 hover:text-stone-900">My Log</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/signup" className="text-sm font-medium text-stone-600 hover:text-stone-900">Sign Up</Link>
          <Link href="/login" className="px-4 py-2 rounded-full text-sm font-medium text-white" style={{ backgroundColor: "#8B4513" }}>Log In</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-8 py-12">
        <h1 className="text-3xl font-serif font-semibold mb-2" style={{ color: "#2C2C2C" }}>Dupe Detector</h1>
        <p className="text-stone-500 mb-8">Search any product to instantly find affordable alternatives with similar formulas.</p>

        {/* Search */}
        <div className="flex items-center gap-3 bg-white rounded-full px-6 py-4 shadow-sm border border-stone-200 mb-10">
          <svg className="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            defaultValue="La Mer Moisturizing Cream Concentrate"
            className="flex-1 bg-transparent outline-none text-stone-700 placeholder-stone-400"
          />
        </div>

        {/* Results */}
        <div className="mb-4">
          <p className="text-sm text-stone-500 mb-1">Dupes found for</p>
          <h2 className="text-xl font-serif font-semibold" style={{ color: "#2C2C2C" }}>
            La Mer Moisturizing Cream Concentrate <span className="text-stone-400 font-normal text-base">($380)</span>
          </h2>
        </div>

        <div className="flex flex-col gap-4 mb-8">
          {dupeResults.map((dupe) => (
            <Link href="/product" key={dupe.id}>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 flex items-center gap-5 hover:shadow-md transition-shadow">
                <div className="w-14 h-14 rounded-xl bg-stone-100 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold tracking-widest uppercase text-stone-400 mb-0.5">{dupe.brand}</p>
                  <p className="font-semibold text-stone-800 mb-2">{dupe.name}</p>
                  <div className="flex gap-2 flex-wrap">
                    {dupe.badges.map((badge) => (
                      <span key={badge} className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mb-1" style={{ backgroundColor: "#F0EBE3", border: "2px solid #8B4513" }}>
                    <span className="text-sm font-bold" style={{ color: "#8B4513" }}>{dupe.match}%</span>
                  </div>
                  <span className="text-xs text-stone-400">match</span>
                  <span className="text-sm font-semibold text-stone-700 mt-1">{dupe.price}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <p className="text-center text-sm text-stone-400">
          Want to compare two specific products?{" "}
          <span className="underline cursor-pointer" style={{ color: "#8B4513" }}>Try manual compare →</span>
        </p>
      </div>
    </main>
  );
}
