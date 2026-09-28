import Link from "next/link";

const footerLinks = {
  Shop: [
    { href: "/portraits", label: "All Templates" },
    { href: "/portraits?category=dogs", label: "Dogs" },
    { href: "/portraits?category=cats", label: "Cats" },
    { href: "/portraits?category=couples", label: "Couples & Pets" },
  ],
  Help: [
    { href: "/how-it-works", label: "How It Works" },
    { href: "/faq", label: "FAQ" },
    { href: "/contact", label: "Contact" },
  ],
  Legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
    { href: "/refunds", label: "Refund Policy" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-[#2D4A3E] text-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <span className="text-3xl font-display font-semibold tracking-tight">tolif</span>
            <p className="mt-4 text-sm text-white/60 leading-relaxed max-w-xs">
              Beautiful AI portraits of you and your pet, crafted with love. Digital downloads and premium prints shipped worldwide.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <h4 className="text-xs font-medium tracking-widest uppercase text-white/40 mb-4">
                {group}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/70 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
          <span>© {new Date().getFullYear()} Tolif. All rights reserved.</span>
          <span>Made with ♥ for pet lovers everywhere</span>
        </div>
      </div>
    </footer>
  );
}
