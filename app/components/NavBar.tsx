"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface NavLink {
  href: string;
  label: string;
}

interface NavBarProps {
  links?: NavLink[];
}

const DEFAULT_LINKS: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Search" },
  { href: "/dupes", label: "Dupe Detector" },
  { href: "/log", label: "My Log" },
];

export default function NavBar({ links = DEFAULT_LINKS }: NavBarProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const TAB_LINKS = [
    {
      href: "/search",
      label: "Search",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      href: "/dupes",
      label: "Dupes",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
    },
    {
      href: "/log",
      label: "My Log",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
  ];

  return (
    <>
    <nav className="border-b border-stone-200 relative" style={{ backgroundColor: "#F5F0EA" }}>
      <div className="flex items-center justify-between px-6 md:px-8 py-5">
        <Link href="/" className="text-2xl font-serif font-semibold" style={{ color: "#2C2C2C" }}>
          The Formula
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium transition-colors"
              style={pathname === link.href ? { color: "#8B4513" } : { color: "#57534e" }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-4">
          {loading ? (
            <div className="w-20 h-8" />
          ) : user ? (
            <>
              <Link href="/log" className="text-sm font-medium text-stone-600 hover:text-stone-900">My Log</Link>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 rounded-full text-sm font-medium border border-stone-300 text-stone-600 hover:bg-stone-100"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/signup" className="text-sm font-medium text-stone-600 hover:text-stone-900">Sign Up</Link>
              <Link href="/login" className="px-4 py-2 rounded-full text-sm font-medium text-white" style={{ backgroundColor: "#8B4513" }}>
                Log In
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-stone-200 px-6 py-4 flex flex-col gap-4" style={{ backgroundColor: "#F5F0EA" }}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium py-1"
              style={pathname === link.href ? { color: "#8B4513" } : { color: "#57534e" }}
            >
              {link.label}
            </Link>
          ))}
          <div className="border-t border-stone-200 pt-4 flex flex-col gap-3">
            {!loading && (user ? (
              <button onClick={handleSignOut} className="text-sm font-medium text-stone-600 text-left">
                Sign Out
              </button>
            ) : (
              <>
                <Link href="/signup" className="text-sm font-medium text-stone-600">Sign Up</Link>
                <Link href="/login" className="px-4 py-2 rounded-full text-sm font-medium text-white text-center" style={{ backgroundColor: "#8B4513" }}>
                  Log In
                </Link>
              </>
            ))}
          </div>
        </div>
      )}
    </nav>

    {/* Mobile bottom tab bar */}
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200 flex" style={{ backgroundColor: "#F5F0EA" }}>
      {TAB_LINKS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-1"
            style={{ color: active ? "#8B4513" : "#a8a29e" }}
          >
            {tab.icon}
            <span className="text-xs font-medium">{tab.label}</span>
          </Link>
        );
      })}
    </div>
    {/* Spacer so content doesn't hide behind tab bar on mobile */}
    <div className="md:hidden h-16" />
    </>
  );
}
