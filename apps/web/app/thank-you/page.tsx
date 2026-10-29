"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Download, AlertCircle, RefreshCw, FileDown } from "lucide-react";

interface DownloadFile {
  tokenId: string;
  token: string;
  fileName: string;
  fileSizeBytes: number;
  contentType: string;
  expiresAt: string;
  downloadsLeft: number;
}

interface OrderData {
  orderId: string;
  productName: string;
  tierDisplayName: string;
  customerEmail: string;
  files: DownloadFile[];
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ThankYouContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retries, setRetries] = useState(0);

  const loadOrder = useCallback(async () => {
    if (!sessionId) {
      setError("No session ID found.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const base = process.env.NEXT_PUBLIC_API_URL ?? "";
      const res = await fetch(`${base}/api/digital-download/order/${sessionId}`);
      if (res.status === 404) {
        setError("processing");
        return;
      }
      if (!res.ok) throw new Error("Failed to load order.");
      const data: OrderData = await res.json();
      setOrder(data);
    } catch {
      setError("Something went wrong loading your order.");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder, retries]);

  const handleDownload = (token: string, fileName: string) => {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "";
    const a = document.createElement("a");
    a.href = `${base}/api/digital-download/file/${token}`;
    a.download = fileName;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#C4622D] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#8C7B6B] text-sm">Loading your downloads…</p>
        </div>
      </div>
    );
  }

  if (error === "processing") {
    return (
      <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl border border-[#E4D8CC] p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-6">
            <RefreshCw size={28} className="text-amber-500" />
          </div>
          <h1 className="text-2xl font-display font-semibold text-[#1A1714] mb-3">
            Processing your order…
          </h1>
          <p className="text-[#8C7B6B] text-sm mb-8">
            Your payment was received. Your download links will be ready in just a moment.
          </p>
          <button
            onClick={() => setRetries((r) => r + 1)}
            className="inline-flex items-center gap-2 bg-[#C4622D] hover:bg-[#9E4A1E] text-white font-medium px-6 py-3 rounded-xl transition-colors"
          >
            <RefreshCw size={15} />
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl border border-[#E4D8CC] p-10 max-w-md w-full text-center">
          <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-[#1A1714] mb-2">Order not found</h1>
          <p className="text-[#8C7B6B] text-sm mb-6">
            {error || "We couldn't find your order. Check your email for a download link."}
          </p>
          <Link href="/" className="text-[#C4622D] text-sm font-medium hover:underline">
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6F0]">
      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Success header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h1 className="text-4xl font-display font-light text-[#1A1714] mb-3">
            Your purchase is confirmed!
          </h1>
          <p className="text-[#8C7B6B]">
            <span className="font-medium text-[#1A1714]">{order.productName}</span>
            {" — "}
            {order.tierDisplayName} · sent to{" "}
            <span className="font-medium text-[#1A1714]">{order.customerEmail}</span>
          </p>
        </div>

        {/* Downloads */}
        <div className="bg-white rounded-2xl border border-[#E4D8CC] overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-[#E4D8CC] flex items-center gap-3">
            <Download size={18} className="text-[#C4622D]" />
            <h2 className="font-semibold text-[#1A1714]">Your files</h2>
          </div>

          <div className="divide-y divide-[#E4D8CC]">
            {order.files.map((file) => (
              <div key={file.tokenId} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#FAF6F0] border border-[#E4D8CC] flex items-center justify-center shrink-0">
                    <FileDown size={18} className="text-[#C4622D]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1A1714] truncate">{file.fileName}</p>
                    <p className="text-xs text-[#8C7B6B]">
                      {formatBytes(file.fileSizeBytes)} · {file.downloadsLeft} downloads left
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(file.token, file.fileName)}
                  disabled={file.downloadsLeft <= 0}
                  className="shrink-0 ml-4 inline-flex items-center gap-2 bg-[#C4622D] hover:bg-[#9E4A1E] disabled:opacity-40 text-white text-xs font-medium px-4 py-2 rounded-xl transition-colors"
                >
                  <Download size={13} />
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-8">
          <strong>Keep this page bookmarked.</strong> Download links expire in 7 days. Check your email
          for a backup link.
        </div>

        <div className="text-center">
          <Link href="/" className="text-sm text-[#8C7B6B] hover:text-[#C4622D] transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-[#C4622D] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ThankYouContent />
    </Suspense>
  );
}
