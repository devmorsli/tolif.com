import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "Terms of Service", description: "Terms and conditions for using Tolif." };

export default function TermsPage() {
  return (
    <LegalPage
      tag="Legal"
      headline={<>Terms of <em className="not-italic font-medium text-[#C4622D]">Service</em></>}
      intro="By using Tolif you agree to these terms. Please read them carefully."
      updated="28 September 2026"
      sections={[
        { title: "1. Service description", body: "Tolif provides an AI-powered portrait generation service. You upload photos, choose a template, and receive a digital portrait. You may also order physical print products shipped worldwide." },
        { title: "2. Acceptable use", body: "You must not upload photos of people without their consent, images that infringe third-party rights, illegal content, or content depicting minors. We reserve the right to cancel orders that violate these terms." },
        { title: "3. Intellectual property", body: "The AI-generated portrait is licensed to you for personal, non-commercial use. You may print it, share it on social media, and give it as a gift. Commercial use requires a separate licence — contact us." },
        { title: "4. Preview and payment", body: "You receive a free watermarked preview before payment. Payment confirms your order and triggers high-resolution generation. All prices are shown inclusive of applicable VAT." },
        { title: "5. Delivery", body: "Digital downloads are delivered by email within minutes of payment. Physical products ship within 5–7 business days via tracked courier. Tolif is not responsible for delays caused by customs or carriers." },
        { title: "6. Limitation of liability", body: "Tolif's liability is limited to the amount you paid for the order in question. We are not liable for indirect or consequential loss." },
        { title: "7. Governing law", body: "These terms are governed by the laws of the European Union. Any disputes shall be resolved in good faith; escalation to mediation or the courts of the relevant jurisdiction applies if necessary." },
      ]}
    />
  );
}
