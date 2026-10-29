import Link from "next/link";

const footerLinks = {
  Products: [
    { href: "/#pricing",   label: "Pricing" },
    { href: "/#products",  label: "All Templates" },
    { href: "/#faq",       label: "FAQ" },
  ],
  Support: [
    { href: "/contact", label: "Contact" },
    { href: "/about",   label: "About Us" },
  ],
  Legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms",   label: "Terms of Service" },
    { href: "/refunds", label: "Refund Policy" },
    { href: "/cookies", label: "Cookie Policy" },
  ],
};

export function DigitalFooter() {
  return (
    <footer className="bg-[#2D4A3E] text-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <span className="text-3xl font-display font-semibold tracking-tight">tolif</span>
            <p className="mt-4 text-sm text-white/60 leading-relaxed max-w-xs">
              Professional spreadsheet templates for entrepreneurs, freelancers, and teams who want clarity — not complexity.
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
          <span>Download once, use forever.</span>
        </div>
      </div>
    </footer>
  );
}
