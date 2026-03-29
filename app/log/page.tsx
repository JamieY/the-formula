import Link from "next/link";

export default function MyLog() {
  // Sample products — will be replaced with real data from Supabase
  const products = [
    {
      id: 1,
      brand: "CeraVe",
      name: "CeraVe Moisturizing Cream",
      status: "Abandoned",
      note: "Caused breakouts after 2 weeks of use",
    },
    {
      id: 2,
      brand: "La Roche-Posay",
      name: "La Roche-Posay Toleriane Double Repair",
      status: "Love It",
      note: "Perfect for winter — keeps skin hydrated all day",
    },
    {
      id: 3,
      brand: "Paula's Choice",
      name: "Paula's Choice 2% BHA Liquid Exfoliant",
      status: "Love It",
      note: "Holy grail for keeping pores clear",
    },
  ];

  const statusColors: Record<string, string> = {
    "Love It": "bg-green-100 text-green-700",
    "Abandoned": "bg-red-100 text-red-600",
    "Want to Try": "bg-amber-100 text-amber-700",
    "Still Using": "bg-blue-100 text-blue-700",
  };

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#F5F0EA" }}>
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-stone-200">
        <Link href="/" className="text-2xl font-serif font-semibold" style={{ color: "#2C2C2C" }}>
          The Formula
        </Link>
        <div className="flex items-center gap-8">
          <Link href="/" className="text-sm font-medium text-stone-600 hover:text-stone-900">
            Home
          </Link>
          <Link href="/dupes" className="text-sm font-medium text-stone-600 hover:text-stone-900">
            Dupe Detector
          </Link>
          <Link href="/log" className="text-sm font-medium" style={{ color: "#8B4513" }}>
            My Log
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/signup" className="text-sm font-medium text-stone-600 hover:text-stone-900">
            Sign Up
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: "#8B4513" }}
          >
            Log In
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-serif font-semibold" style={{ color: "#2C2C2C" }}>
              My Product Log
            </h1>
            <p className="text-stone-500 mt-1">Track everything you've tried and loved (or abandoned)</p>
          </div>
          <button
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: "#8B4513" }}
          >
            <span className="text-lg leading-none">+</span>
            Add Product
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 bg-white rounded-full px-5 py-3 shadow-sm border border-stone-200 mb-6 max-w-md">
          <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search your products..."
            className="flex-1 bg-transparent outline-none text-stone-700 placeholder-stone-400 text-sm"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-3 mb-8">
          {["All", "Love It", "Abandoned", "Want to Try"].map((tab) => (
            <button
              key={tab}
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                tab === "All"
                  ? "text-white"
                  : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
              }`}
              style={tab === "All" ? { backgroundColor: "#8B4513" } : {}}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Product cards — populated state */}
        {products.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 flex items-center gap-6">
                <div className="w-16 h-16 rounded-xl bg-stone-100 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold tracking-widest uppercase text-stone-400 mb-0.5">
                    {product.brand}
                  </p>
                  <p className="font-semibold text-stone-800 mb-1">{product.name}</p>
                  <p className="text-sm text-stone-500">{product.note}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${statusColors[product.status]}`}
                >
                  {product.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-xl font-serif font-semibold mb-2" style={{ color: "#2C2C2C" }}>
              Your log is empty
            </h2>
            <p className="text-stone-500 mb-6 max-w-sm">
              Start by adding products you've tried, love, or want to try.
            </p>
            <button
              className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: "#8B4513" }}
            >
              <span className="text-lg leading-none">+</span>
              Add Your First Product
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
