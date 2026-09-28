import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "Refund Policy", description: "Tolif's satisfaction guarantee and refund policy." };

export default function RefundsPage() {
  return (
    <LegalPage
      tag="Legal"
      headline={<>Refund <em className="not-italic font-medium text-[#C4622D]">Policy</em></>}
      intro="We want you to love your portrait. If you're not happy, we'll make it right."
      updated="28 September 2026"
      sections={[
        { title: "Our satisfaction guarantee", body: "If you're not satisfied with your portrait, contact us within 14 days of purchase and we will offer either a full refund or a free regeneration — your choice, no questions asked." },
        { title: "Digital downloads", body: "Because digital files are delivered instantly, refunds are issued at our discretion. In practice, if you contact us with a genuine concern about quality, we will always resolve it — either with a free regeneration or a refund." },
        { title: "Physical products", body: "If your physical product arrives damaged, with a printing defect, or incorrect, we will reship at no cost. Please send a photo of the issue to hello@tolif.com within 7 days of delivery." },
        { title: "How to request a refund", body: "Email hello@tolif.com with your order number and a brief description of the issue. We respond within 24 hours. Refunds are processed to your original payment method within 5–10 business days." },
        { title: "Non-refundable situations", body: "We cannot offer refunds if the portrait quality issue was caused by low-quality, blurry, or heavily filtered source photos that did not meet our photo guidelines. We cannot refund orders where the correct portrait was delivered but you simply changed your mind after download." },
      ]}
    />
  );
}
