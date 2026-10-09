"use client";

import { useState, useEffect } from "react";
import { Wrench, Lock, Loader2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export default function MaintenancePage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("We're making some improvements. We'll be back very soon!");

  useEffect(() => {
    fetch(`${API_BASE}/api/settings/maintenance`)
      .then((r) => r.json())
      .then((d) => { if (d.message) setMessage(d.message); })
      .catch(() => {});
  }, []);

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/settings/maintenance/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        // Bypass cookie set by server — reload to the home page
        window.location.href = "/";
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.message ?? "Incorrect password.");
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[#F9ECE4] flex items-center justify-center mx-auto mb-6">
          <Wrench size={28} className="text-[#C4622D]" />
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-display font-light text-[#1A1714] mb-3">
          Under <em className="not-italic font-medium text-[#C4622D]">Maintenance</em>
        </h1>
        <p className="text-[#8C7B6B] text-sm mb-10 leading-relaxed">
          {message}
        </p>

        {/* Password bypass */}
        <form onSubmit={unlock} className="bg-white border border-[#E4D8CC] rounded-2xl p-6 text-left space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Lock size={13} className="text-[#C4622D]" />
            <p className="text-xs font-semibold text-[#5A4E46] uppercase tracking-wider">Staff access</p>
          </div>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter bypass password"
            className="w-full px-4 py-3 rounded-xl border border-[#E4D8CC] bg-[#FAF6F0] text-sm text-[#1A1714] placeholder:text-[#C8BAB0] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/25 focus:border-[#C4622D]/60 transition-all"
            required
          />

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full flex items-center justify-center gap-2 bg-[#C4622D] disabled:bg-[#E4D8CC] disabled:text-[#8C7B6B] text-white font-semibold py-3 rounded-xl transition-all hover:bg-[#9E4A1E]"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Unlock store"}
          </button>
        </form>
      </div>
    </div>
  );
}
