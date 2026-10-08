import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy", description: "How Tolif collects, uses, and protects your personal data." };

export default function PrivacyPage() {
  return (
    <LegalPage
      tag="Legal"
      headline={<>Privacy <em className="not-italic font-medium text-[#C4622D]">Policy</em></>}
      intro="Your privacy matters to us. This policy explains what data we collect, why we collect it, and how we protect it."
      updated="28 September 2026"
      sections={[
        {
          title: "1. Data we collect",
          body: "We collect your email address and name when you place an order. We temporarily process the photos you upload for AI portrait generation. We collect basic analytics data (page views, conversion events) to improve our service. We do not collect payment card details — all payments are processed securely by Stripe.",
        },
        {
          title: "2. How we use your photos",
          body: "Your uploaded photos are used solely to generate your portrait. They are stored on encrypted servers and are never shared with third parties, used to train AI models, or used for any purpose other than your portrait generation.\n\nPhotos are automatically and permanently deleted after 30 days for paid orders and after 7 days for abandoned sessions. You can request earlier deletion at any time by contacting us.",
        },
        {
          title: "3. Legal basis (GDPR)",
          body: "We process your data on the basis of your explicit consent (given at upload), contract performance (fulfilling your order), and our legitimate interest in preventing fraud and improving our service. You may withdraw consent at any time.",
        },
        {
          title: "4. Your rights",
          body: "Under GDPR you have the right to: access the personal data we hold about you; request correction of inaccurate data; request deletion of your data ('right to be forgotten'); object to processing; request data portability. To exercise any of these rights, email hello@tolif.com.",
        },
        {
          title: "5. Cookies & tracking pixels",
          body: "We use essential cookies for the website to function. With your consent, we also use advertising and analytics pixels:\n\n• Google Analytics 4 — tracks page views and conversion events.\n• Google Ads — measures which ads led to purchases.\n• Meta Pixel (Facebook / Instagram) — records purchase events and page views so we can measure the performance of our Facebook and Instagram ads and build relevant audiences. Meta may use this data according to its own Data Policy.\n• TikTok Pixel — measures the performance of our TikTok ads.\n\nNone of these pixels receive your uploaded portrait photos. You can manage or withdraw consent via the cookie settings link in the footer. See our full Cookie Policy for details.",
        },
        {
          title: "6. Third-party services",
          body: "We use Stripe for payment processing, our AI providers (Google Gemini, fal.ai, or OpenAI) for image generation, and print-on-demand partners (Printful or Printify) for physical products. Each partner has their own privacy policy.",
        },
        {
          title: "7. Data retention",
          body: "Order data (email, shipping address, payment reference) is retained for 7 years for legal and tax purposes. Analytics events are retained for 24 months. Photos are deleted as described in section 2.",
        },
        {
          title: "8. Contact",
          body: "Our data controller is Tolif. For any privacy-related questions or requests, contact hello@tolif.com.",
        },
      ]}
    />
  );
}
