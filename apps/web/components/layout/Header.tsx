"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Menu, X } from "lucide-react";
import { useWizardStore } from "@/store/wizardStore";

const navLinks = [
  { href: "/portraits", label: "Templates" },
  { href: "/how-it-works", label: "How It Works" },
];

export function Header() {
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const router                    = useRouter();
  const { selectedVariant, goTo } = useWizardStore();
  const cartCount                 = selectedVariant ? 1 : 0;

  const handleCartClick = () => {
    if (selectedVariant) {
      goTo(4);
      router.push("/create");
    } else {
      router.push("/create");
    }
  };

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-[#FAF6F0]/95 backdrop-blur-md shadow-[0_1px_0_0_#E4D8CC]"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl font-display font-semibold tracking-tight text-[#1A1714]">
              tolif
            </span>
            <span className="text-[#C4622D] text-xl leading-none -mt-0.5">·</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[#8C7B6B] hover:text-[#1A1714] transition-colors tracking-wide"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <button
              aria-label="Cart"
              onClick={handleCartClick}
              className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F2EAE0] transition-colors"
            >
              <ShoppingBag size={18} className="text-[#1A1714]" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#C4622D] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            <Link
              href="/create"
              className="hidden md:inline-flex items-center gap-2 bg-[#C4622D] hover:bg-[#9E4A1E] text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors"
            >
              Create Portrait
            </Link>

            {/* Mobile menu toggle */}
            <button
              aria-label="Menu"
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F2EAE0] transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-[#FAF6F0] flex flex-col pt-24 px-8"
          >
            <nav className="flex flex-col gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-3xl font-display text-[#1A1714] hover:text-[#C4622D] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/create"
                onClick={() => setMenuOpen(false)}
                className="mt-4 inline-flex items-center justify-center bg-[#C4622D] text-white text-base font-medium px-6 py-3.5 rounded-full"
              >
                Create Your Portrait
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
