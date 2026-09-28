import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

interface Section {
  title: string;
  body: string;
}

export function LegalPage({
  tag,
  headline,
  intro,
  sections,
  updated,
}: {
  tag: string;
  headline: React.ReactNode;
  intro: string;
  sections: Section[];
  updated: string;
}) {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#FAF6F0] pt-32 pb-20">
        <div className="max-w-3xl mx-auto px-6">
          <span className="text-xs font-medium tracking-widest uppercase text-[#C4622D] mb-3 block">
            {tag}
          </span>
          <h1 className="text-5xl font-display font-light text-[#1A1714] leading-tight mb-5">
            {headline}
          </h1>
          <p className="text-[#8C7B6B] mb-10 leading-relaxed">{intro}</p>
          <p className="text-xs text-[#8C7B6B] mb-10 pb-8 border-b border-[#E4D8CC]">
            Last updated: {updated}
          </p>

          <div className="space-y-10">
            {sections.map((s) => (
              <section key={s.title}>
                <h2 className="text-xl font-display font-medium text-[#1A1714] mb-3">{s.title}</h2>
                <p className="text-[#8C7B6B] leading-relaxed text-sm whitespace-pre-line">{s.body}</p>
              </section>
            ))}
          </div>

          <div className="mt-16 pt-8 border-t border-[#E4D8CC] text-sm text-[#8C7B6B]">
            Questions? Email{" "}
            <a href="mailto:hello@tolif.com" className="text-[#C4622D] hover:underline">
              hello@tolif.com
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
