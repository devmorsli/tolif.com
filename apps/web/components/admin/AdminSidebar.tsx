"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Palette, ShoppingBag, Settings, LogOut, Menu, X, Printer, Package } from "lucide-react";
import { useState } from "react";
import { adminLogout } from "@/lib/admin-api";

const nav = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/templates", label: "Templates",  icon: Palette },
  { href: "/admin/products",  label: "Products",   icon: Package },
  { href: "/admin/orders",    label: "Orders",     icon: ShoppingBag },
  { href: "/admin/printful",  label: "Printful",   icon: Printer },
  { href: "/admin/settings",  label: "Settings",   icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await adminLogout();
    router.push("/admin/login");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <Link href="/admin/dashboard" className="text-2xl font-display font-semibold tracking-tight text-white">
          tolif
        </Link>
        <p className="text-xs text-white/40 mt-0.5 font-medium tracking-widest uppercase">Admin</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-white/15 text-white"
                  : "text-white/60 hover:bg-white/8 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-4 pb-6">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:bg-white/8 hover:text-white transition-all duration-200"
        >
          <LogOut size={18} />
          Sign out
        </button>
        <div className="mt-4 px-3">
          <Link href="/" className="text-xs text-white/30 hover:text-white/60 transition-colors">
            ← Back to website
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-[#1A1714] shrink-0 fixed inset-y-0 left-0 z-20">
        <SidebarContent />
      </aside>

      {/* Mobile hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-[#1A1714] border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <Link href="/admin/dashboard" className="text-xl font-display font-semibold text-white">
          tolif <span className="text-xs text-white/40 font-sans font-medium tracking-widest uppercase">admin</span>
        </Link>
        <button onClick={() => setOpen(!open)} className="text-white/70 hover:text-white">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-20">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative w-60 h-full bg-[#1A1714]">
            <div className="pt-14">
              <SidebarContent />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
