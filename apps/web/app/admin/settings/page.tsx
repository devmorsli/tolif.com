"use client";

import { useEffect, useState, useCallback } from "react";
import { Save, Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getSettings, saveSetting, type Setting } from "@/lib/admin-api";

// All known settings grouped for the UI
const SETTING_GROUPS = [
  {
    title: "General",
    description: "Core business settings",
    icon: "⚙️",
    settings: [
      { key: "site.name", label: "Site Name", type: "text", placeholder: "Tolif" },
      { key: "site.url", label: "Site URL", type: "text", placeholder: "https://tolif.com" },
      { key: "site.supportEmail", label: "Support Email", type: "email", placeholder: "hello@tolif.com" },
      { key: "regen.maxPerSession", label: "Free Regenerations per Session", type: "number", placeholder: "5" },
      { key: "regen.enabled", label: "Regenerations Enabled", type: "select", options: ["true", "false"] },
      { key: "photo.retentionDaysPaid", label: "Photo Retention — Paid Orders (days)", type: "number", placeholder: "30" },
      { key: "photo.retentionDaysAbandoned", label: "Photo Retention — Abandoned Sessions (days)", type: "number", placeholder: "7" },
    ],
  },
  {
    title: "Currency & Pricing",
    description: "Supported currencies and defaults",
    icon: "💶",
    settings: [
      { key: "currency.default", label: "Default Currency", type: "text", placeholder: "EUR" },
      { key: "currency.supported", label: "Supported Currencies (comma-separated)", type: "text", placeholder: "EUR,USD,GBP,CAD" },
      { key: "currency.autoDetect", label: "Auto-detect from IP", type: "select", options: ["true", "false"] },
    ],
  },
  {
    title: "AI Providers",
    description: "API keys and provider selection",
    icon: "🤖",
    settings: [
      { key: "ai.defaultProvider", label: "Default AI Provider", type: "select", options: ["gemini", "falai", "openai"] },
      { key: "ai.gemini.apiKey", label: "Google Gemini API Key", type: "password", placeholder: "AIza…", sensitive: true },
      { key: "ai.gemini.textModel", label: "Gemini Text Model (metadata / SEO generation)", type: "text", placeholder: "gemini-2.0-flash" },
      { key: "ai.gemini.model", label: "Gemini Image Model (portrait generation)", type: "text", placeholder: "gemini-2.0-flash-exp" },
      { key: "ai.falai.apiKey", label: "fal.ai API Key", type: "password", placeholder: "fal-…", sensitive: true },
      { key: "ai.openai.apiKey", label: "OpenAI API Key", type: "password", placeholder: "sk-…", sensitive: true },
      { key: "ai.openai.model", label: "OpenAI Model", type: "text", placeholder: "gpt-image-1" },
    ],
  },
  {
    title: "Stripe",
    description: "Payment processing",
    icon: "💳",
    settings: [
      { key: "stripe.publishableKey", label: "Publishable Key", type: "text", placeholder: "pk_live_…" },
      { key: "stripe.secretKey", label: "Secret Key", type: "password", placeholder: "sk_live_…", sensitive: true },
      { key: "stripe.webhookSecret", label: "Webhook Signing Secret", type: "password", placeholder: "whsec_…", sensitive: true, hint: "Webhook endpoint to register in Stripe: https://yourdomain.com/api/webhooks/stripe — listen for payment_intent.succeeded and checkout.session.completed" },
    ],
  },
  {
    title: "Email",
    description: "Transactional email — switch providers without redeploying",
    icon: "✉️",
    settings: [
      { key: "email.provider", label: "Provider", type: "select", options: ["smtp", "resend", "sendgrid"] },
      { key: "email.fromAddress", label: "From Address", type: "email", placeholder: "hello@tolif.com" },
      { key: "email.fromName", label: "From Name", type: "text", placeholder: "Tolif" },
      { key: "resend.apiKey", label: "Resend API Key", type: "password", placeholder: "re_…", sensitive: true, hint: "Used when Provider = resend. Get your key at resend.com → API Keys." },
      { key: "email.smtpHost", label: "SMTP Host", type: "text", placeholder: "smtp.example.com", hint: "Used when Provider = smtp." },
      { key: "email.smtpPort", label: "SMTP Port", type: "number", placeholder: "587" },
      { key: "email.smtpUser", label: "SMTP Username", type: "text", placeholder: "apikey" },
      { key: "email.smtpPassword", label: "SMTP Password", type: "password", placeholder: "••••••••", sensitive: true },
    ],
  },
  {
    title: "Print Providers",
    description: "Physical product fulfillment",
    icon: "🖨️",
    settings: [
      { key: "print.defaultProvider", label: "Default Provider", type: "select", options: ["printful", "printify"] },
      { key: "print.printful.apiKey", label: "Printful API Key", type: "password", placeholder: "••••••••", sensitive: true },
      { key: "print.printify.apiKey", label: "Printify API Key", type: "password", placeholder: "••••••••", sensitive: true },
      { key: "print.printify.shopId", label: "Printify Shop ID", type: "text", placeholder: "12345" },
    ],
  },
  {
    title: "Shipping",
    description: "Options shown to customers at checkout — changes apply instantly",
    icon: "📦",
    settings: [
      { key: "shipping.standard.label", label: "Standard — Label", type: "text", placeholder: "Standard delivery" },
      { key: "shipping.standard.price", label: "Standard — Price (USD, 0 = free)", type: "number", placeholder: "0" },
      { key: "shipping.standard.days",  label: "Standard — Delivery timeframe", type: "text", placeholder: "Ships in 5–7 business days" },
      { key: "shipping.express.label",  label: "Express — Label", type: "text", placeholder: "Express delivery" },
      { key: "shipping.express.price",  label: "Express — Price (USD)", type: "number", placeholder: "15" },
      { key: "shipping.express.days",   label: "Express — Delivery timeframe", type: "text", placeholder: "Priority production · tracked · 2–3 business days" },
    ],
  },
  {
    title: "Localisation",
    description: "Language and locale settings",
    icon: "🌍",
    settings: [
      { key: "i18n.defaultLocale", label: "Default Language", type: "select", options: ["en", "fr", "de", "es", "it", "nl", "pt"] },
      { key: "i18n.enabledLocales", label: "Enabled Languages (comma-separated)", type: "text", placeholder: "en,fr,de" },
      { key: "i18n.autoDetect", label: "Auto-detect from IP", type: "select", options: ["true", "false"] },
    ],
  },
  {
    title: "GDPR & Privacy",
    description: "Data protection compliance",
    icon: "🔒",
    settings: [
      { key: "gdpr.cookieConsentEnabled", label: "Cookie Consent Banner", type: "select", options: ["true", "false"] },
      { key: "gdpr.dpaEmail", label: "Data Protection Contact", type: "email", placeholder: "privacy@tolif.com" },
    ],
  },
  {
    title: "Tracking & Analytics",
    description: "Pixel IDs injected on every page — changes go live within 5 minutes, no redeploy needed",
    icon: "📊",
    settings: [
      {
        key: "tracking.fbPixelId",
        label: "Meta (Facebook / Instagram) Pixel ID",
        type: "text",
        placeholder: "XXXXXXXXXXXXXXXXXX",
        hint: "Find in: Meta Business Suite → Events Manager → your pixel",
      },
      {
        key: "tracking.gaId",
        label: "Google Analytics 4 Measurement ID",
        type: "text",
        placeholder: "G-XXXXXXXXXX",
        hint: "Find in: analytics.google.com → Admin → Data Streams → your stream",
      },
      {
        key: "tracking.gtmId",
        label: "Google Tag Manager ID",
        type: "text",
        placeholder: "GTM-XXXXXXX",
        hint: "Use GTM instead of GA4 standalone if you manage multiple tags. Leave blank to use standalone GA4.",
      },
      {
        key: "tracking.googleAdsId",
        label: "Google Ads Conversion ID",
        type: "text",
        placeholder: "AW-XXXXXXXXX",
        hint: "Find in: ads.google.com → Tools → Conversions → your conversion",
      },
      {
        key: "tracking.tiktokPixelId",
        label: "TikTok Pixel ID",
        type: "text",
        placeholder: "XXXXXXXXXXXXXXXXXX",
        hint: "Find in: ads.tiktok.com → Assets → Events → Web Events → your pixel",
      },
    ],
  },
];

type SettingDef = { key: string; label: string; type: string; placeholder?: string; options?: string[]; sensitive?: boolean; hint?: string };

function SettingField({
  def, value, onChange, saved,
}: {
  def: SettingDef; value: string; onChange: (v: string) => void; saved: boolean;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="group flex items-start gap-4 py-3 border-b border-[#F2EAE0] last:border-0">
      <div className="flex-1 min-w-0">
        <label className="text-sm font-medium text-[#1A1714] block">{def.label}</label>
        <p className="text-xs text-[#8C7B6B] font-mono mt-0.5">{def.key}</p>
        {def.hint && (
          <p className="text-xs text-[#8C7B6B] mt-1 leading-snug">{def.hint}</p>
        )}
      </div>
      <div className="flex items-center gap-2 w-72 shrink-0">
        {def.type === "select" ? (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 bg-[#FAF6F0] border border-[#E4D8CC] rounded-xl px-3 py-2 text-sm text-[#1A1714] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] transition-colors"
          >
            {!value && <option value="">— select —</option>}
            {def.options?.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <div className="relative flex-1">
            <input
              type={def.type === "password" && !show ? "password" : "text"}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={def.placeholder}
              className="w-full bg-[#FAF6F0] border border-[#E4D8CC] rounded-xl px-3 py-2 text-sm text-[#1A1714] placeholder:text-[#C8BAB0] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] transition-colors"
            />
            {def.type === "password" && (
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C7B6B] hover:text-[#1A1714] transition-colors"
              >
                {show ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            )}
          </div>
        )}
        {saved && <CheckCircle size={16} className="text-green-500 shrink-0" />}
      </div>
    </div>
  );
}

function SettingsContent() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");

  const load = useCallback(() => {
    getSettings()
      .then((settings: Setting[]) => {
        const map: Record<string, string> = {};
        settings.forEach((s) => { map[s.key] = s.value; });
        setValues(map);
      })
      .catch(() => setError("Could not load settings. Is the API running?"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleChange = (key: string, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setSaved((s) => ({ ...s, [key]: false }));
  };

  const handleSave = async (groupSettings: SettingDef[]) => {
    const keys = groupSettings.map((s) => s.key);
    const updates = Object.fromEntries(keys.map((k) => [k, true]));
    setSaving((s) => ({ ...s, ...updates }));
    try {
      await Promise.all(keys.map((k) => saveSetting(k, values[k] ?? "")));
      setSaved((s) => ({ ...s, ...updates }));
      setTimeout(() => setSaved((s) => {
        const next = { ...s };
        keys.forEach((k) => { next[k] = false; });
        return next;
      }), 2500);
    } catch {
      // individual errors handled
    } finally {
      setSaving((s) => {
        const next = { ...s };
        keys.forEach((k) => { next[k] = false; });
        return next;
      });
    }
  };

  return (
    <div className="lg:pl-60">
      <div className="pt-16 lg:pt-0">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-light text-[#1A1714]">Settings</h1>
            <p className="text-[#8C7B6B] text-sm mt-1">All API keys and configuration — stored encrypted in the database.</p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#C4622D] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm mb-6">
              <strong>API not connected:</strong> {error}
              <br />
              <span className="text-amber-600">Changes made here will be saved once the API is running.</span>
            </div>
          )}

          <div className="space-y-6">
            {SETTING_GROUPS.map((group) => {
              const isSavingGroup = group.settings.some((s) => saving[s.key]);
              const anySavedGroup = group.settings.some((s) => saved[s.key]);
              return (
                <div key={group.title} className="bg-white rounded-2xl border border-[#E4D8CC] overflow-hidden">
                  {/* Group header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4D8CC]">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{group.icon}</span>
                      <div>
                        <h2 className="font-semibold text-[#1A1714]">{group.title}</h2>
                        <p className="text-xs text-[#8C7B6B]">{group.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSave(group.settings)}
                      disabled={isSavingGroup}
                      className="flex items-center gap-2 bg-[#C4622D] hover:bg-[#9E4A1E] disabled:opacity-60 text-white text-xs font-medium px-4 py-2 rounded-xl transition-colors"
                    >
                      {isSavingGroup ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : anySavedGroup ? (
                        <CheckCircle size={13} />
                      ) : (
                        <Save size={13} />
                      )}
                      Save
                    </button>
                  </div>

                  {/* Settings */}
                  <div className="px-6">
                    {group.settings.map((def) => (
                      <SettingField
                        key={def.key}
                        def={def}
                        value={values[def.key] ?? ""}
                        onChange={(v) => handleChange(def.key, v)}
                        saved={!!saved[def.key]}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#F5F0EA]">
        <AdminSidebar />
        <SettingsContent />
      </div>
    </AdminGuard>
  );
}
