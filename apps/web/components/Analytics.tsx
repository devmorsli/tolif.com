/**
 * Analytics — Server Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Pixel IDs are stored in the database and edited from the admin panel at
 * /admin/settings → "Tracking & Analytics".
 *
 * No env vars needed. Changes in the admin panel go live within 5 minutes
 * (Next.js revalidates the fetch cache). Set a pixel ID to blank in the admin
 * panel to disable it — no redeploy required.
 */

import Script from "next/script";

type TrackingIds = {
  "tracking.fbPixelId"?:     string;
  "tracking.gaId"?:          string;
  "tracking.gtmId"?:         string;
  "tracking.googleAdsId"?:   string;
  "tracking.tiktokPixelId"?: string;
};

async function getTrackingIds(): Promise<TrackingIds> {
  try {
    const base =
      process.env.API_INTERNAL_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:5000";

    const res = await fetch(`${base}/api/settings/tracking`, {
      // Revalidate every 5 minutes — admin changes propagate quickly
      next: { revalidate: 300 },
    });

    if (!res.ok) return {};
    return res.json() as Promise<TrackingIds>;
  } catch {
    return {};
  }
}

export async function Analytics() {
  const ids = await getTrackingIds();

  const FB_PIXEL_ID     = ids["tracking.fbPixelId"];
  const GA_ID           = ids["tracking.gaId"];
  const GTM_ID          = ids["tracking.gtmId"];
  const GOOGLE_ADS_ID   = ids["tracking.googleAdsId"];
  const TIKTOK_PIXEL_ID = ids["tracking.tiktokPixelId"];

  // Nothing configured yet — render nothing
  if (!FB_PIXEL_ID && !GA_ID && !GTM_ID && !GOOGLE_ADS_ID && !TIKTOK_PIXEL_ID) {
    return null;
  }

  return (
    <>
      {/* ── Google Tag Manager ──────────────────────────────────────────────────
          Recommended when using GA4 + Google Ads together.
          If GTM_ID is set, the standalone GA4 / Google Ads snippets below
          are skipped — manage those tags inside GTM instead.
      ────────────────────────────────────────────────────────────────────────── */}
      {GTM_ID && (
        <Script id="gtm-head" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>
      )}

      {/* ── Google Analytics 4 (standalone — skip when GTM is configured) ─────
          Set only "tracking.gaId" in admin when not using GTM.
      ────────────────────────────────────────────────────────────────────────── */}
      {GA_ID && !GTM_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];
            function gtag(){dataLayer.push(arguments);}
            gtag('js',new Date());
            gtag('config','${GA_ID}');`}
          </Script>
        </>
      )}

      {/* ── Google Ads (fires alongside standalone GA4 — skip when using GTM) ─
          Set "tracking.googleAdsId" in admin (e.g. AW-123456789).
      ────────────────────────────────────────────────────────────────────────── */}
      {GOOGLE_ADS_ID && GA_ID && !GTM_ID && (
        <Script id="gads-config" strategy="afterInteractive">
          {`gtag('config','${GOOGLE_ADS_ID}');`}
        </Script>
      )}

      {/* ── Meta (Facebook / Instagram) Pixel ──────────────────────────────────
          Set "tracking.fbPixelId" in admin.
      ────────────────────────────────────────────────────────────────────────── */}
      {FB_PIXEL_ID && (
        <>
          <Script id="fb-pixel-init" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){
            n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
            t=b.createElement(e);t.async=!0;t.src=v;
            s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
            document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init','${FB_PIXEL_ID}');
            fbq('track','PageView');`}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1" width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}

      {/* ── TikTok Pixel ────────────────────────────────────────────────────────
          Set "tracking.tiktokPixelId" in admin.
      ────────────────────────────────────────────────────────────────────────── */}
      {TIKTOK_PIXEL_ID && (
        <Script id="tiktok-pixel-init" strategy="afterInteractive">
          {`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
          ttq.methods=["page","track","identify","instances","debug","on","off","once",
          "ready","alias","group","enableCookie","disableCookie"];
          ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(
          Array.prototype.slice.call(arguments,0)))}};
          for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
          ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)
          ttq.setAndDefer(e,ttq.methods[n]);return e};
          ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";
          ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._n=ttq._n||{},
          ttq._n[e]=i,ttq._o=ttq._o||{},ttq._o[e]=n||{};
          var o=document.createElement("script");o.type="text/javascript",o.async=!0,
          o.src=i+"?sdkid="+e+"&lib="+t;
          var a=document.getElementsByTagName("script")[0];
          a.parentNode.insertBefore(o,a)};
          ttq.load('${TIKTOK_PIXEL_ID}');
          ttq.page();
          }(window,document,'ttq');`}
        </Script>
      )}
    </>
  );
}
