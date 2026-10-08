import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How Tolif uses cookies and tracking technologies.",
};

export default function CookiesPage() {
  return (
    <LegalPage
      tag="Legal"
      headline={<>Cookie <em className="not-italic font-medium text-[#C4622D]">Policy</em></>}
      intro="This page explains what cookies and tracking pixels we use, why we use them, and how you can control them."
      updated="29 September 2026"
      sections={[
        {
          title: "What are cookies?",
          body: "Cookies are small text files placed on your device when you visit a website. They help us remember your preferences, understand how you use our site, and show you relevant advertising.",
        },
        {
          title: "Essential cookies",
          body: "These cookies are required for the website to function and cannot be switched off.\n\n• Session cookie — keeps you logged in and maintains your portrait wizard progress.\n• CSRF cookie — protects form submissions against cross-site request forgery.\n\nThese cookies do not track you for advertising purposes and are placed on the basis of our legitimate interest in providing a functioning website.",
        },
        {
          title: "Analytics cookies",
          body: "With your consent, we use the following analytics tools to understand how visitors use Tolif:\n\n• Google Analytics 4 (Google LLC) — tracks page views, sessions, and conversion events. Data is processed in the US under Google's Data Processing Agreement. You can opt out via Google's opt-out browser add-on.\n\n• Google Tag Manager — used to manage and deploy analytics and marketing tags without code changes.",
        },
        {
          title: "Advertising & remarketing pixels",
          body: "With your consent, we use the following advertising pixels to measure the effectiveness of our ads and show relevant ads to people who have visited our site:\n\n• Meta Pixel (Facebook / Instagram) — placed by Meta Platforms Inc. Records events such as page views and purchases so we can measure ad performance and build custom audiences. Governed by Meta's Data Policy.\n\n• Google Ads Conversion Tracking — records conversions from Google Ads campaigns.\n\n• TikTok Pixel — placed by TikTok Inc. Records page view and purchase events to measure TikTok ad performance.\n\nNone of these pixels receive your uploaded portrait photos. They only receive standard web events (page URL, event type, a hashed email where you consent to it).",
        },
        {
          title: "How to manage cookies",
          body: "You can withdraw or change your consent at any time via the cookie banner (accessible by clicking 'Cookie settings' in the footer).\n\nYou can also control cookies at the browser level:\n• Chrome: Settings → Privacy and Security → Cookies\n• Firefox: Settings → Privacy & Security → Cookies\n• Safari: Preferences → Privacy → Manage Website Data\n• Edge: Settings → Cookies and Site Permissions\n\nNote: disabling all cookies may affect the functionality of the website.",
        },
        {
          title: "Cookie duration",
          body: "Essential session cookies expire when you close your browser. Analytics and advertising cookies are typically retained for 13 months, after which consent is requested again.",
        },
        {
          title: "Updates to this policy",
          body: "We may update this Cookie Policy when we add or remove tracking tools. The 'last updated' date at the top of this page will reflect any changes. Continued use of the site after changes constitutes acceptance of the updated policy.",
        },
      ]}
    />
  );
}
