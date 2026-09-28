import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Tolif team. We're here to help.",
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#FAF6F0] pt-32 pb-20">
        <div className="max-w-xl mx-auto px-6">
          <span className="text-xs font-medium tracking-widest uppercase text-[#C4622D] mb-3 block">
            Get in touch
          </span>
          <h1 className="text-5xl font-display font-light text-[#1A1714] leading-tight mb-4">
            We'd love to
            <br />
            <em className="not-italic font-medium">hear from you</em>
          </h1>
          <p className="text-[#8C7B6B] mb-10 leading-relaxed">
            Have a question about your order, a portrait issue, or just want to say hello?
            Drop us a message and we'll reply within 24 hours.
          </p>

          <form className="space-y-5">
            <div>
              <label className="text-sm font-medium text-[#1A1714] mb-1.5 block">Name</label>
              <input
                type="text"
                placeholder="Your name"
                className="w-full bg-white border border-[#E4D8CC] rounded-xl px-4 py-3 text-sm text-[#1A1714] placeholder:text-[#8C7B6B] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] transition-colors"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#1A1714] mb-1.5 block">Email</label>
              <input
                type="email"
                placeholder="your@email.com"
                className="w-full bg-white border border-[#E4D8CC] rounded-xl px-4 py-3 text-sm text-[#1A1714] placeholder:text-[#8C7B6B] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] transition-colors"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#1A1714] mb-1.5 block">Subject</label>
              <select className="w-full bg-white border border-[#E4D8CC] rounded-xl px-4 py-3 text-sm text-[#1A1714] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] transition-colors">
                <option value="">Select a topic…</option>
                <option>Order question</option>
                <option>Portrait quality</option>
                <option>Refund request</option>
                <option>Technical issue</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-[#1A1714] mb-1.5 block">Message</label>
              <textarea
                rows={5}
                placeholder="Tell us how we can help…"
                className="w-full bg-white border border-[#E4D8CC] rounded-xl px-4 py-3 text-sm text-[#1A1714] placeholder:text-[#8C7B6B] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] transition-colors resize-none"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#C4622D] hover:bg-[#9E4A1E] text-white font-medium py-4 rounded-full transition-colors"
            >
              Send message
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-[#E4D8CC] text-sm text-[#8C7B6B]">
            <p>You can also reach us at{" "}
              <a href="mailto:hello@tolif.com" className="text-[#C4622D] hover:underline">
                hello@tolif.com
              </a>
            </p>
            <p className="mt-2">We reply within 24 hours, usually much faster.</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
