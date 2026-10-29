import { motion } from "framer-motion";
import { ShoppingCart, Download, FileSpreadsheet } from "lucide-react";

const steps = [
  {
    icon: ShoppingCart,
    number: "01",
    title: "Choose your template",
    description: "Pick the tier that fits your needs — Basic for solo use, Pro for teams, or Bundle for full access.",
  },
  {
    icon: ShoppingCart,
    number: "02",
    title: "One-time payment",
    description: "Secure checkout via Stripe. No subscriptions, no hidden fees. Pay once, yours forever.",
  },
  {
    icon: Download,
    number: "03",
    title: "Download instantly",
    description: "Get your files immediately on the thank-you page. A backup link is also sent to your email.",
  },
];

// Re-export icons properly
const stepIcons = [ShoppingCart, FileSpreadsheet, Download];

export function DigitalHowItWorks() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-xs font-medium tracking-widest uppercase text-[#C4622D] mb-4">Simple process</p>
          <h2 className="text-4xl lg:text-5xl font-display font-light text-[#1A1714] leading-tight">
            Up and running in
            <br />
            <em className="text-[#C4622D] not-italic">under 2 minutes</em>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, i) => {
            const Icon = stepIcons[i];
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                className="relative"
              >
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+2rem)] right-0 h-px bg-gradient-to-r from-[#E4D8CC] to-transparent" />
                )}

                <div className="flex flex-col items-center text-center">
                  {/* Icon circle */}
                  <div className="relative mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-[#FAF6F0] border border-[#E4D8CC] flex items-center justify-center">
                      <Icon size={24} className="text-[#C4622D]" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#C4622D] text-white text-[10px] font-bold flex items-center justify-center">
                      {step.number.slice(1)}
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-[#1A1714] mb-3">{step.title}</h3>
                  <p className="text-[#8C7B6B] text-sm leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
