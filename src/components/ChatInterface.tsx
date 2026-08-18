"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  pdfDownloadUrl,
  processPrescription,
  uploadPrescription,
  type MedicineItem,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import ChatSidebar from "@/components/ChatSidebar";
import Icon from "@/components/Icon";
import { DOCTAR_HELPLINE } from "@/lib/constants";
import {
  deleteSession as apiDeleteSession,
  getSession as apiGetSession,
  listSessions as apiListSessions,
  renameSession as apiRenameSession,
  type SessionSummary,
} from "@/lib/chatSessions";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const GREETING_MESSAGE = {
  role: "assistant" as const,
  text: "👋 Hello! I'm DOCTAR AI — your health assistant.\n\nI can help you:\n• 🔍 **Find doctors** by speciality, city, or budget\n• 📋 **Upload a prescription** — tap the 📎 button to get your medicine schedule\n• 📷 **Scan a medicine label** — tap the camera button to identify any medicine\n• 💊 **Answer questions** about DOCTAR services\n\nTry asking: *\"Find a cardiologist in Delhi under ₹1000\"*",
};

interface Doctor {
  id: number;
  name: string;
  speciality: string;
  hospital: string;
  city: string;
  fee: number;
  rating: number;
  experience_years: number;
  available_today: boolean;
  languages: string;
  phone: string | null;
}

interface Hospital {
  id: string;
  name: string;
  city: string;
  address: string;
  type: string;
  emergency: boolean;
  phone: string | null;
  rating: number;
  beds?: number;
}

interface PrescriptionResult {
  id: string;
  medicines: MedicineItem[];
}

interface MedicineLabel {
  name: string | null;
  generic_name: string | null;
  manufacturer: string | null;
  uses: string[] | null;
  dosage: string | null;
  side_effects: string[] | null;
  warnings: string[] | null;
  storage: string | null;
  expiry: string | null;
  prescription_required: boolean | null;
  source: "ai" | "ocr" | "none";
  error?: string;
  ocr_text?: string;
}

interface Message {
  role: "user" | "assistant";
  text: string;
  doctors?: Doctor[];
  hospitals?: Hospital[];
  prescription?: PrescriptionResult;
  medicineLabel?: MedicineLabel;
  imagePreview?: string;
  isFile?: boolean;
  askCity?: boolean;          // show inline city-input when both geolocation methods fail
  pendingQuery?: string;      // the "near me" query to retry once city is known
  showNearMeChip?: boolean;   // show "Find Doctors Near Me" chip after health advice
  resolvedCity?: string;      // city used for this search (shown in result header)
  resolvedCitySource?: "gps" | "ip" | "manual" | null; // provenance of resolvedCity
}

function DoctorCard({ d }: { d: Doctor }) {
  // Dialled when the doctor record has no direct number on file, so "Call
  // Now" is always actionable rather than degrading to a dead disabled
  // state. `||` (not `??`) on purpose: the field is `string | null` but
  // empty-string rows exist in the data too, and both should fall back.
  const dialNumber = d.phone || DOCTAR_HELPLINE;
  return (
    <div className="bg-surface-gloss border border-outline-variant/30 rounded-2xl p-4 mt-2 shadow-soft-surface">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-label-md text-label-md font-semibold text-on-surface">{d.name.startsWith("Dr.") ? d.name : `Dr. ${d.name}`}</p>
          <p className="font-caption-sm text-caption-sm text-primary font-semibold mt-0.5">{d.speciality}</p>
          <p className="font-caption-sm text-caption-sm text-on-surface-variant mt-0.5">{d.hospital}, {d.city}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-label-md text-label-md font-bold text-primary">₹{d.fee}</p>
          <p className="font-caption-sm text-caption-sm text-amber-600 flex items-center gap-0.5 justify-end mt-0.5">
            <Icon name="star" filled className="text-[13px]" />{d.rating}/5
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3">
        <span className="font-caption-sm text-caption-sm text-on-surface-variant">{d.experience_years} yrs · {d.languages}</span>
        <span className={`font-caption-sm text-caption-sm px-2 py-0.5 rounded-full font-medium ${d.available_today ? "bg-emerald-100 text-emerald-700" : "bg-surface-container-high text-outline"}`}>
          {d.available_today ? "Available Today" : "By Appointment"}
        </span>
      </div>
      <a
        href={`tel:${dialNumber}`}
        className="mt-3 flex items-center justify-center gap-1.5 w-full bg-gradient-to-r from-ai-gradient-start to-ai-gradient-end text-white shadow-btn-primary hover:opacity-90 transition-opacity font-label-md text-label-md font-semibold py-2 rounded-full"
      >
        <Icon name="call" filled className="text-[16px]" /> Call Now
      </a>
    </div>
  );
}

function HospitalCard({ h }: { h: Hospital }) {
  return (
    <div className="bg-surface-gloss border border-outline-variant/30 rounded-2xl p-4 mt-2 shadow-soft-surface">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex items-start gap-2">
          <Icon name="local_hospital" filled className="text-[18px] text-tertiary shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-label-md text-label-md font-semibold text-on-surface truncate">{h.name}</p>
            <p className="font-caption-sm text-caption-sm text-primary font-semibold mt-0.5">{h.type}</p>
            <p className="font-caption-sm text-caption-sm text-on-surface-variant mt-0.5 truncate flex items-center gap-1">
              <Icon name="location_on" className="text-[13px] shrink-0" />{h.address}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-caption-sm text-caption-sm text-amber-600 font-medium flex items-center gap-0.5 justify-end">
            <Icon name="star" filled className="text-[13px]" />{h.rating}/5
          </p>
          {h.beds && <p className="font-caption-sm text-caption-sm text-outline mt-0.5">{h.beds} beds</p>}
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 gap-2">
        <span className={`font-caption-sm text-caption-sm px-2 py-0.5 rounded-full font-medium ${
          h.emergency ? "bg-error-container text-on-error-container" : "bg-surface-container-high text-outline"
        }`}>
          {h.emergency ? "Emergency" : "No Emergency"}
        </span>
        {h.phone && (
          <span className="font-caption-sm text-caption-sm text-on-surface-variant truncate flex items-center gap-1">
            <Icon name="call" className="text-[13px]" />{h.phone}
          </span>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(h.name + " " + h.city)}`, "_blank")}
          className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-ai-gradient-start to-ai-gradient-end text-white shadow-btn-primary hover:opacity-90 transition-opacity font-label-md text-label-md font-semibold py-2 rounded-full"
        >
          <Icon name="directions" filled className="text-[16px]" /> Get Directions
        </button>
        {/* A real <a href="tel:"> rather than window.location — mobile browsers
            handle the former reliably, and it keeps the control usable via
            long-press / "copy number" on desktop where there's no dialer. */}
        <a
          href="tel:108"
          className="flex-1 flex items-center justify-center gap-1.5 bg-error hover:opacity-90 text-on-error font-label-md text-label-md font-semibold py-2 rounded-full transition-opacity"
        >
          <Icon name="emergency" filled className="text-[16px]" /> Call Ambulance
        </a>
      </div>
    </div>
  );
}

function MedicineCard({ med, idx }: { med: MedicineItem; idx: number }) {
  const foodLabel =
    med.food_instructions?.toUpperCase() === "AC"
      ? "Before food / खाने से पहले"
      : med.food_instructions?.toUpperCase() === "PC"
      ? "After food / खाने के बाद"
      : med.food_instructions || "—";

  return (
    <div className="bg-surface-gloss border border-outline-variant/30 rounded-2xl p-3 shadow-soft-surface">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-label-md text-label-md font-semibold text-on-surface">{idx}. {med.name}</p>
          <p className="font-caption-sm text-caption-sm text-primary mt-0.5">{med.dosage}</p>
        </div>
        <span className="font-caption-sm text-caption-sm bg-surface-container-low text-primary border border-outline-variant/40 rounded-full px-2 py-0.5 shrink-0">
          {med.duration}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-caption-sm text-caption-sm text-on-surface-variant">
        <span className="flex items-center gap-1"><Icon name="schedule" className="text-[13px]" />{med.timing}</span>
        <span className="flex items-center gap-1"><Icon name="restaurant" className="text-[13px]" />{foodLabel}</span>
        {med.purpose && (
          <span className="text-primary font-semibold w-full flex items-center gap-1">
            <Icon name="medication" filled className="text-[13px]" />{med.purpose}
          </span>
        )}
      </div>
    </div>
  );
}

const LANG_OPTIONS: { lang: "en" | "hi" | "both"; label: string; sublabel: string; emoji: string }[] = [
  { lang: "en", label: "English", sublabel: "English only", emoji: "🇬🇧" },
  { lang: "hi", label: "हिंदी", sublabel: "Hindi only", emoji: "🇮🇳" },
  { lang: "both", label: "Both", sublabel: "English + हिंदी", emoji: "📄" },
];

function PrescriptionMessage({ result }: { result: PrescriptionResult }) {
  const [chosen, setChosen] = useState<"en" | "hi" | "both" | null>(null);

  return (
    <div className="mt-2 space-y-2">
      <p className="font-caption-sm text-caption-sm font-semibold text-outline uppercase tracking-wide">
        {result.medicines.length} medicine{result.medicines.length !== 1 ? "s" : ""} found
      </p>
      {result.medicines.map((m, i) => (
        <MedicineCard key={i} med={m} idx={i + 1} />
      ))}

      {/* Language picker */}
      {!chosen ? (
        <div className="mt-3 bg-surface-container-low border border-outline-variant/30 rounded-2xl p-3">
          <p className="font-label-md text-label-md font-semibold text-on-surface mb-2 flex items-center gap-1.5">
            <Icon name="download" className="text-[16px]" /> Which language do you want the PDF in?
          </p>
          <div className="grid grid-cols-3 gap-2">
            {LANG_OPTIONS.map((opt) => (
              <button
                key={opt.lang}
                onClick={() => setChosen(opt.lang)}
                className="flex flex-col items-center gap-1 bg-surface-gloss hover:bg-gradient-to-br hover:from-ai-gradient-start hover:to-ai-gradient-end hover:text-white border border-outline-variant/40 hover:border-transparent rounded-xl py-2.5 px-2 transition-all group shadow-soft-surface"
              >
                <span className="text-xl">{opt.emoji}</span>
                <span className="font-caption-sm text-caption-sm font-semibold">{opt.label}</span>
                <span className="text-[10px] text-outline group-hover:text-white/80">{opt.sublabel}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <a
            href={pdfDownloadUrl(result.id, chosen)}
            download
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-ai-gradient-start to-ai-gradient-end text-white shadow-btn-primary hover:opacity-90 transition-opacity font-label-md text-label-md font-semibold py-2.5 rounded-full"
          >
            <Icon name="download" filled className="text-[18px]" />
            Download PDF — {LANG_OPTIONS.find(o => o.lang === chosen)?.sublabel}
          </a>
          <button
            onClick={() => setChosen(null)}
            className="w-full font-caption-sm text-caption-sm text-primary hover:underline py-1 transition-colors"
          >
            ← Change language
          </button>
        </div>
      )}
    </div>
  );
}

function MedicineLabelCard({ label }: { label: MedicineLabel }) {
  if (label.error) {
    return (
      <div className="mt-2 rounded-2xl border border-error-container bg-error-container/40 p-3 font-body-md text-body-md text-on-error-container flex items-center gap-2">
        <Icon name="error" filled className="text-[18px] shrink-0" /> {label.error}
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-2xl border border-outline-variant/30 bg-surface-gloss shadow-soft-surface overflow-hidden">
      {/* Header */}
      <div className="bg-tertiary text-white px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-title-md text-title-md leading-tight">{label.name || "Unknown Medicine"}</p>
            {label.generic_name && (
              <p className="text-white/80 font-caption-sm text-caption-sm mt-0.5">{label.generic_name}</p>
            )}
          </div>
          {label.prescription_required && (
            <span className="shrink-0 bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Rx</span>
          )}
        </div>
        {label.manufacturer && (
          <p className="text-white/70 font-caption-sm text-caption-sm mt-1 flex items-center gap-1">
            <Icon name="factory" className="text-[13px]" />{label.manufacturer}
          </p>
        )}
      </div>

      <div className="p-3 space-y-3 font-body-md text-body-md">
        {/* Uses */}
        {label.uses && label.uses.length > 0 && (
          <div>
            <p className="font-semibold text-on-surface-variant font-caption-sm text-caption-sm uppercase tracking-wide mb-1 flex items-center gap-1">
              <Icon name="check_circle" filled className="text-[14px] text-emerald-600" /> Uses
            </p>
            <ul className="space-y-0.5">
              {label.uses.map((u, i) => (
                <li key={i} className="text-on-surface-variant flex gap-1.5"><span className="text-primary shrink-0">•</span>{u}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Dosage */}
        {label.dosage && (
          <div>
            <p className="font-semibold text-on-surface-variant font-caption-sm text-caption-sm uppercase tracking-wide mb-1 flex items-center gap-1">
              <Icon name="medication" filled className="text-[14px] text-primary" /> Dosage
            </p>
            <p className="text-on-surface-variant">{label.dosage}</p>
          </div>
        )}

        {/* Side effects */}
        {label.side_effects && label.side_effects.length > 0 && (
          <div>
            <p className="font-semibold text-on-surface-variant font-caption-sm text-caption-sm uppercase tracking-wide mb-1 flex items-center gap-1">
              <Icon name="warning" filled className="text-[14px] text-amber-600" /> Side Effects
            </p>
            <ul className="space-y-0.5">
              {label.side_effects.map((s, i) => (
                <li key={i} className="text-on-surface-variant flex gap-1.5"><span className="text-amber-500 shrink-0">•</span>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings */}
        {label.warnings && label.warnings.length > 0 && (
          <div className="bg-error-container/30 border border-error-container rounded-lg p-2">
            <p className="font-semibold text-on-error-container font-caption-sm text-caption-sm uppercase tracking-wide mb-1 flex items-center gap-1">
              <Icon name="block" filled className="text-[14px]" /> Warnings
            </p>
            <ul className="space-y-0.5">
              {label.warnings.map((w, i) => (
                <li key={i} className="text-on-error-container font-caption-sm text-caption-sm flex gap-1.5"><span className="shrink-0">•</span>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Storage & Expiry */}
        <div className="flex flex-wrap gap-3 font-caption-sm text-caption-sm text-outline border-t border-outline-variant/30 pt-2">
          {label.storage && <span className="flex items-center gap-1"><Icon name="thermostat" className="text-[13px]" />{label.storage}</span>}
          {label.expiry && <span className="flex items-center gap-1"><Icon name="event" className="text-[13px]" />Exp: {label.expiry}</span>}
          {label.source !== "ai" && (
            <span className="text-outline italic">OCR-based — verify with pharmacist</span>
          )}
        </div>
      </div>
    </div>
  );
}

const WELCOME_FEATURES = [
  { icon: "search", label: "Find doctors", detail: "by speciality, city, or budget", bubble: "bg-blue-100 text-primary-container" },
  { icon: "description", label: "Upload a prescription", detail: "to get your medicine schedule", bubble: "bg-purple-100 text-tertiary-container" },
  { icon: "center_focus_strong", label: "Scan a medicine label", detail: "to identify any medicine", bubble: "bg-green-100 text-emerald-700" },
] as const;

/** The very first assistant message — a richly-structured intro card in both
 * mockups, distinct from every later message's plain markdown bubble. */
function WelcomeCard({ compact }: { compact: boolean }) {
  if (compact) {
    return (
      <div className="bg-surface-gloss rounded-2xl p-5 shadow-soft-surface border border-white/50">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-ai-gradient-start to-ai-gradient-end flex-shrink-0 flex items-center justify-center shadow-md">
            <Icon name="smart_toy" filled className="text-white text-[18px]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-label-md text-label-md text-on-surface font-semibold">Hello! I&apos;m DOCTAR AI — your health assistant.</p>
            <div className="flex flex-col gap-2 mt-3">
              {WELCOME_FEATURES.map((f) => (
                <div key={f.label} className="bg-surface-container-low rounded-xl p-2.5 border border-outline-variant/20 flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-full ${f.bubble} flex items-center justify-center shrink-0`}>
                    <Icon name={f.icon} className="text-[14px]" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-caption-sm text-caption-sm font-semibold text-on-surface block">{f.label}</span>
                    <span className="text-[10px] text-outline block truncate">{f.detail}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 p-2.5 rounded-lg bg-surface-dim/50 border border-outline-variant/20">
              <p className="font-caption-sm text-caption-sm text-on-surface-variant italic">Try asking: &quot;Find a cardiologist in Delhi under ₹1000&quot;</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop treatment */}
      <div className="hidden md:block bg-surface-gloss rounded-3xl p-8 shadow-soft-surface border border-white/50 transform transition-all duration-500 hover:shadow-lg">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ai-gradient-start to-ai-gradient-end flex-shrink-0 flex items-center justify-center shadow-md">
            <Icon name="smart_toy" filled className="text-white text-[20px]" />
          </div>
          <div className="flex-1 space-y-6">
            <p className="font-body-lg text-body-lg text-on-surface font-medium">Hello! I&apos;m DOCTAR AI — your health assistant.</p>
            <div className="space-y-4">
              <p className="font-body-md text-body-md text-on-surface-variant">I can help you:</p>
              <ul className="space-y-4 font-body-md text-body-md text-on-surface">
                {WELCOME_FEATURES.map((f) => (
                  <li key={f.label} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary-container/50 flex items-center justify-center flex-shrink-0 text-primary">
                      <Icon name={f.icon} className="text-[16px]" />
                    </div>
                    <div><strong className="font-semibold text-primary">{f.label}</strong> {f.detail}</div>
                  </li>
                ))}
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary-container/50 flex items-center justify-center flex-shrink-0 text-primary">
                    <Icon name="medication" className="text-[16px]" />
                  </div>
                  <div><strong className="font-semibold text-primary">Answer questions</strong> about DOCTAR services</div>
                </li>
              </ul>
            </div>
            <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 italic text-on-surface-variant font-body-md">
              Try asking: &quot;Find a cardiologist in Delhi under ₹1000&quot;
            </div>
          </div>
        </div>
      </div>

      {/* Mobile treatment */}
      <div className="md:hidden">
        <div className="flex items-center justify-center pt-2 pb-4">
          <div className="w-16 h-16 rounded-full skeuo-surface flex items-center justify-center relative overflow-hidden border-2 border-white">
            <div className="absolute inset-0 bg-gradient-to-br from-ai-gradient-start/20 to-ai-gradient-end/20" />
            <Icon name="smart_toy" filled className="text-primary text-[32px] relative z-10" />
          </div>
        </div>
        <div className="skeuo-surface rounded-2xl p-6 border border-white/60">
          <h2 className="font-title-md text-title-md text-on-surface mb-2">Hello! I&apos;m DOCTAR AI — your health assistant.</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-5">I can help you with your daily wellness needs:</p>
          <div className="flex flex-col gap-3">
            {WELCOME_FEATURES.map((f) => (
              <div key={f.label} className="bg-surface-container-low rounded-xl p-3 shadow-sm border border-outline-variant/20 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full ${f.bubble} flex items-center justify-center shrink-0`}>
                  <Icon name={f.icon} className="text-[18px]" />
                </div>
                <div>
                  <span className="font-label-md text-label-md font-semibold text-on-surface block">{f.label}</span>
                  <span className="font-caption-sm text-caption-sm text-outline block">{f.detail}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 p-3 rounded-lg bg-surface-dim/50 border border-outline-variant/20">
            <p className="font-caption-sm text-caption-sm text-on-surface-variant italic">Try asking: &quot;Find a cardiologist in Delhi under ₹1000&quot;</p>
          </div>
        </div>
      </div>
    </>
  );
}

/** Escape before any markdown substitution runs — this feeds dangerouslySetInnerHTML,
 * and every message bubble (including the user's own) goes through it. Without this,
 * typing e.g. `<img src=x onerror=...>` executes it in the sender's own browser. */
function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMarkdown(text: string) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
}

// ── Voice input (Web Speech API) ───────────────────────────────────────────
// Support is uneven: Chrome/Edge/Safari implement it (Chrome behind the
// webkit- prefix), Firefox does not. Everything below feature-detects and the
// button simply doesn't render when unsupported.
interface SpeechRecognitionAlternativeLike { transcript: string }
interface SpeechRecognitionResultLike {
  readonly length: number;
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { readonly length: number; [index: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const SUGGESTIONS = [
  "📍 Doctors near me",
  "🏥 Hospitals near me",
  "Find a cardiologist in Delhi",
  "Dermatologist under ₹500",
  "I have a headache",
  "What is DOCTAR?",
];

/** Display-only: strips a suggestion's leading emoji (the redesign shows a
 * Material icon there instead) — `send()` is always called with the
 * original, unstripped string from SUGGESTIONS, so backend behavior is
 * completely unchanged. */
function suggestionLabel(s: string): string {
  return s.replace(/^\p{Extended_Pictographic}\s*/u, "");
}

// ── Popular Indian cities shown in the picker ──────────────────────────────
const POPULAR_CITIES = [
  "Delhi", "Mumbai", "Kolkata", "Bangalore", "Hyderabad", "Chennai",
  "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Chandigarh", "Kochi",
  "Surat", "Nagpur", "Indore", "Bhopal", "Patna", "Ranchi",
  "Guwahati", "Bhubaneswar", "Visakhapatnam", "Vadodara", "Agra", "Varanasi",
];

interface LocationPickerProps {
  onSelect: (city: string) => void;
  onDetect: () => void;
  detecting: boolean;
  onClose: () => void;
}

function LocationPicker({ onSelect, onDetect, detecting, onClose }: LocationPickerProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = query.trim().length > 0
    ? POPULAR_CITIES.filter((c) => c.toLowerCase().includes(query.toLowerCase()))
    : POPULAR_CITIES;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const city = query.trim();
    if (city) { onSelect(city); }
  }

  return (
    <div className="absolute top-full right-0 mt-2 w-80 bg-surface-gloss rounded-2xl shadow-soft-surface border border-outline-variant/30 z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20">
        <p className="font-label-md text-label-md font-semibold text-on-surface">Choose your location</p>
        <button onClick={onClose} className="text-outline hover:text-on-surface transition-colors">
          <Icon name="close" className="text-[18px]" />
        </button>
      </div>

      <div className="p-3 space-y-2">
        {/* Search input */}
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-outline" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type your State or City"
              className="w-full pl-9 pr-3 py-2.5 font-body-md text-body-md skeuo-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 text-on-surface placeholder:text-outline-variant"
            />
          </div>
        </form>

        {/* Detect my location */}
        <button
          onClick={onDetect}
          disabled={detecting}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-secondary-container/30 transition-colors group disabled:opacity-60"
        >
          <Icon
            name={detecting ? "progress_activity" : "my_location"}
            filled={!detecting}
            className={`text-[20px] text-primary shrink-0 ${detecting ? "animate-spin" : ""}`}
          />
          <span className="font-label-md text-label-md font-medium text-primary">
            {detecting ? "Detecting location…" : "Detect my location"}
          </span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-2 px-1">
          <div className="flex-1 h-px bg-outline-variant/30" />
          <span className="text-[10px] text-outline uppercase tracking-wide">Popular cities</span>
          <div className="flex-1 h-px bg-outline-variant/30" />
        </div>

        {/* City grid */}
        <div className="max-h-52 overflow-y-auto -mx-1 px-1">
          {filtered.length > 0 ? (
            <div className="grid grid-cols-3 gap-1.5">
              {filtered.map((city) => (
                <button
                  key={city}
                  onClick={() => onSelect(city)}
                  className="font-caption-sm text-caption-sm text-on-surface-variant bg-surface-container-low hover:bg-gradient-to-br hover:from-ai-gradient-start hover:to-ai-gradient-end hover:text-white border border-outline-variant/30 hover:border-transparent rounded-xl py-2 px-2 transition-all truncate font-medium"
                >
                  {city}
                </button>
              ))}
            </div>
          ) : (
            <p className="font-caption-sm text-caption-sm text-outline text-center py-4">No cities found. Press Enter to use &quot;{query}&quot;.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatInterface({ compact = false }: { compact?: boolean }) {
  type LocationSource = "gps" | "ip" | "manual" | null;

  const [userCity, setUserCityState] = useState<string | null>(null);
  const [locationSource, setLocationSourceState] = useState<LocationSource>(null);
  const [locationResolving, setLocationResolving] = useState(false);
  const [locStatus, setLocStatus] = useState<"idle" | "loading" | "denied">("idle");
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  // Scan-menu popup state — declared here alongside the location picker's,
  // above the effects that reference both.
  const [showScanMenu, setShowScanMenu] = useState(false);
  const scanMenuRef = useRef<HTMLDivElement>(null);

  // Refs mirror the state above so async callbacks (which would otherwise close
  // over a stale `userCity`/`locationSource`) always read the current value.
  const userCityRef = useRef<string | null>(null);
  const locationSourceRef = useRef<LocationSource>(null);

  /** Update the known city and its provenance together — state (for render) and refs (for async reads). */
  function applyLocation(city: string, source: LocationSource) {
    userCityRef.current = city;
    locationSourceRef.current = source;
    setUserCityState(city);
    setLocationSourceState(source);
  }

  // Memoized lookups backing the silent mount-time auto-detect. Kept as refs
  // so the "near me" flow (in resolveNearMeCity, below) can await the SAME
  // in-flight request instead of firing a second GPS prompt / IP call.
  const autoIpLookupRef = useRef<Promise<string | null> | null>(null);
  const autoGpsLookupRef = useRef<Promise<string | null> | null>(null);

  function autoIpLookup(): Promise<string | null> {
    if (!autoIpLookupRef.current) autoIpLookupRef.current = cityFromIP();
    return autoIpLookupRef.current;
  }

  function autoGpsLookup(): Promise<string | null> {
    if (!autoGpsLookupRef.current) {
      autoGpsLookupRef.current = new Promise<string | null>((resolve) => {
        if (!navigator.geolocation) { resolve(null); return; }
        navigator.geolocation.getCurrentPosition(
          async (pos) => resolve(await cityFromCoords(pos.coords.latitude, pos.coords.longitude)),
          () => resolve(null), // denied / unavailable
          { timeout: 8000 }
        );
      });
    }
    return autoGpsLookupRef.current;
  }

  // ── Auto-detect location silently on mount ──────────────────────────────
  // IP lookup first (no permission needed, instant), GPS second (precise).
  // Non-blocking — chat works normally even if both fail. A result is only
  // applied if it wouldn't clobber a manual pick, and a slower IP result can
  // never overwrite an already-resolved (more accurate) GPS fix.
  useEffect(() => {
    let cancelled = false;

    autoIpLookup().then((ipCity) => {
      if (cancelled || !ipCity) return;
      if (locationSourceRef.current === "manual" || locationSourceRef.current === "gps") return;
      applyLocation(ipCity, "ip");
    });

    autoGpsLookup().then((gpsCity) => {
      if (cancelled || !gpsCity) return;
      if (locationSourceRef.current === "manual") return;
      applyLocation(gpsCity, "gps");
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← run once on mount only

  // Close picker when clicking outside
  const handleOutsideClick = useCallback((e: MouseEvent) => {
    if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
      setShowPicker(false);
    }
  }, []);

  useEffect(() => {
    if (showPicker) document.addEventListener("mousedown", handleOutsideClick);
    else document.removeEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showPicker, handleOutsideClick]);

  // Same outside-click-to-close treatment for the scan menu. Kept as its own
  // handler/effect rather than folded into the picker's: the two popups are
  // anchored to different elements and can't share a single container ref.
  const handleScanMenuOutsideClick = useCallback((e: MouseEvent) => {
    if (scanMenuRef.current && !scanMenuRef.current.contains(e.target as Node)) {
      setShowScanMenu(false);
    }
  }, []);

  useEffect(() => {
    if (showScanMenu) document.addEventListener("mousedown", handleScanMenuOutsideClick);
    else document.removeEventListener("mousedown", handleScanMenuOutsideClick);
    return () => document.removeEventListener("mousedown", handleScanMenuOutsideClick);
  }, [showScanMenu, handleScanMenuOutsideClick]);

  const [messages, setMessages] = useState<Message[]>([GREETING_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Two separate inputs for the label scan, not one: `capture` is all-or-nothing
  // on a single input and there's no cross-browser way to make one input offer
  // both paths — Android Chrome jumps straight to the camera with it and to a
  // full picker without it, while iOS Safari differs again. So each path gets
  // its own input and the user picks explicitly (see the scan menu below).
  const cameraCaptureRef = useRef<HTMLInputElement>(null);
  const gallerySelectRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Chat sessions / sidebar (full page only — compact widget is untouched) ──
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  // Mobile-only drawer state — irrelevant above the md breakpoint, where
  // ChatSidebar is always visible inline regardless of this value.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  sessionIdRef.current = sessionId;

  const refreshSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const list = await apiListSessions();
      setSessions(list);
    } catch {
      setSessionsError("Couldn't load your chat history.");
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  // Load the sidebar list once we know who's logged in, and clear any
  // in-progress conversation state on every login/logout transition — the
  // primary defense (not just the backend's silent-rebase) against a stale
  // sessionId surviving an account switch on a shared browser.
  useEffect(() => {
    if (user) {
      refreshSessions();
    } else {
      setSessions([]);
    }
    setSessionId(null);
    setMessages([GREETING_MESSAGE]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  function startNewChat() {
    setSessionId(null);
    setMessages([GREETING_MESSAGE]);
  }

  async function selectSession(id: string) {
    try {
      const detail = await apiGetSession(id);
      setSessionId(detail.id);
      setMessages(
        detail.messages.map((m) => ({
          role: m.role,
          text: m.text,
          doctors: m.doctors,
          hospitals: m.hospitals,
        }))
      );
    } catch {
      setSessionsError("Couldn't load that conversation.");
    }
  }

  async function handleRenameSession(id: string, title: string) {
    // Optimistic — the sidebar already shows the typed title immediately.
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
    try {
      await apiRenameSession(id, title);
    } catch {
      refreshSessions(); // reconcile with the server on failure
    }
  }

  async function handleDeleteSession(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (id === sessionId) startNewChat();
    try {
      await apiDeleteSession(id);
    } catch {
      refreshSessions();
    }
  }

  // ── Voice input ─────────────────────────────────────────────────────────
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // Text already committed when this dictation started, so interim results
  // extend what the user typed instead of overwriting it.
  const voiceBaseRef = useRef("");

  // Detect support after mount — `window` doesn't exist during SSR, and
  // checking in a render would desync server and client markup.
  useEffect(() => {
    setVoiceSupported(getSpeechRecognitionCtor() !== null);
  }, []);

  // Make sure a live recognition session can't outlive the component.
  useEffect(() => {
    return () => {
      const rec = recognitionRef.current;
      if (rec) {
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        try { rec.abort(); } catch { /* already stopped */ }
        recognitionRef.current = null;
      }
    };
  }, []);

  function stopListening() {
    const rec = recognitionRef.current;
    if (rec) {
      try { rec.stop(); } catch { /* already stopped */ }
    }
    setListening(false);
  }

  function startListening() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    // Toggle off if already running.
    if (recognitionRef.current) { stopListening(); return; }

    setVoiceError(null);
    let rec: SpeechRecognitionLike;
    try {
      rec = new Ctor();
    } catch {
      setVoiceError("Voice input couldn't start on this device.");
      return;
    }

    // en-IN gives noticeably better results than en-US for Indian English and
    // for the Hinglish medical vocabulary this app deals in. Pure Hindi
    // dictation remains unreliable — a browser/engine limitation, not
    // something this code can compensate for.
    rec.lang = "en-IN";
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    voiceBaseRef.current = input.trim();

    rec.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const base = voiceBaseRef.current;
      // Populate the field only — never auto-send, so the user can review and
      // edit exactly as they would with typed input.
      setInput(base ? `${base} ${transcript.trim()}` : transcript.trim());
    };

    rec.onerror = (e) => {
      const code = e?.error;
      if (code === "not-allowed" || code === "service-not-allowed") {
        setVoiceError("Microphone permission denied. Enable it in your browser settings.");
      } else if (code === "no-speech") {
        setVoiceError("Didn't catch that — try again.");
      } else if (code !== "aborted") {
        setVoiceError("Voice input failed. Please type instead.");
      }
      setListening(false);
      recognitionRef.current = null;
    };

    rec.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    try {
      rec.start();
      recognitionRef.current = rec;
      setListening(true);
    } catch {
      setVoiceError("Voice input couldn't start. Please type instead.");
      recognitionRef.current = null;
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /** Reverse-geocode lat/lng → city name via Nominatim (free, no key). */
  async function cityFromCoords(lat: number, lon: number): Promise<string | null> {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        { headers: { "Accept-Language": "en" } }
      );
      const d = await r.json();
      return d.address?.city || d.address?.town || d.address?.village ||
             d.address?.county || d.address?.state_district || null;
    } catch { return null; }
  }

  /** IP-based location — no permission needed, works even when browser blocks GPS. */
  async function cityFromIP(): Promise<string | null> {
    try {
      const r = await fetch("https://ipapi.co/json/");
      if (!r.ok) return null;
      const d = await r.json();
      return d.city || null;
    } catch { return null; }
  }

  /**
   * Two-tier location resolution triggered by an explicit user action (the
   * "Detect my location" button) — always re-attempts both tiers fresh,
   * independent of the mount-time auto-detect's cached results.
   *   1. Browser GPS  → Nominatim reverse-geocode
   *   2. IP geolocation (ipapi.co) — no permission dialog, always works
   * Returns the city string, or null if both fail.
   */
  async function getLocation(): Promise<string | null> {
    setLocStatus("loading");
    setLocationResolving(true);
    try {
      // Tier 1: browser geolocation (precise, requires permission)
      if (navigator.geolocation) {
        const gpsCity = await new Promise<string | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            async (pos) => resolve(await cityFromCoords(pos.coords.latitude, pos.coords.longitude)),
            () => resolve(null),   // denied / unavailable — fall through to IP
            { timeout: 8000 }
          );
        });
        if (gpsCity) { applyLocation(gpsCity, "gps"); setLocStatus("idle"); return gpsCity; }
      }

      // Tier 2: IP-based location (no permission, city-level accuracy)
      const ipCity = await cityFromIP();
      if (ipCity) { applyLocation(ipCity, "ip"); setLocStatus("idle"); return ipCity; }

      setLocStatus("denied");
      return null;
    } finally {
      setLocationResolving(false);
    }
  }

  /**
   * Resolve the city for a "near me" query without racing ahead of a
   * still-in-flight GPS fix. If a manual pick or an already-resolved GPS city
   * is known, use it immediately (unchanged from before). Otherwise, wait a
   * short window for the GPS lookup already running (from the mount-time
   * auto-detect) to settle before falling back to the coarser IP-based city —
   * this is what fixes the race where an IP-resolved city (e.g. "New Delhi"
   * for a small-town IP) gets used for the search while the header a moment
   * later corrects itself to the real GPS city.
   */
  async function resolveNearMeCity(): Promise<{ city: string; source: LocationSource } | null> {
    if (userCityRef.current && (locationSourceRef.current === "manual" || locationSourceRef.current === "gps")) {
      return { city: userCityRef.current, source: locationSourceRef.current };
    }

    setLocStatus("loading");
    setLocationResolving(true);

    const GPS_WAIT_MS = 4500;
    const gpsCity = await Promise.race([
      autoGpsLookup(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), GPS_WAIT_MS)),
    ]);

    if (gpsCity) {
      applyLocation(gpsCity, "gps");
      setLocStatus("idle");
      setLocationResolving(false);
      return { city: gpsCity, source: "gps" };
    }

    // GPS didn't settle within the wait window (or already failed/denied) —
    // fall back to IP, reusing the auto-detect's lookup if already in flight.
    const ipCity = await autoIpLookup();
    setLocationResolving(false);

    if (ipCity) {
      applyLocation(ipCity, "ip");
      setLocStatus("idle");
      return { city: ipCity, source: "ip" };
    }

    setLocStatus("denied");
    return null;
  }

  const NEAR_ME_PAT = /\bnear\s*me\b|\bnearby\b|\bnear\s+my\s+(?:location|area|place|home)\b/i;

// ── All Indian cities used for message-level city extraction ────────────────
const ALL_CITIES = [
  "new delhi","delhi","mumbai","bangalore","bengaluru","hyderabad","chennai",
  "kolkata","pune","ahmedabad","jaipur","lucknow","surat","kanpur","nagpur",
  "indore","bhopal","patna","vadodara","ghaziabad","ludhiana","agra","nashik",
  "faridabad","meerut","rajkot","varanasi","srinagar","ranchi","howrah",
  "coimbatore","jabalpur","gwalior","vijayawada","jodhpur","madurai","raipur",
  "kota","guwahati","chandigarh","solapur","bhubaneswar","mysore","mysuru",
  "gurgaon","gurugram","noida","kochi","ernakulam","thiruvananthapuram",
  "dehradun","amritsar","allahabad","prayagraj","visakhapatnam","vizag",
  "siliguri","jamshedpur","cuttack","mangalore","mangaluru","udaipur",
  "navi mumbai","thane","aurangabad","jalandhar","jammu","shimla","pondicherry",
  "puducherry","gangtok","imphal","shillong","goa","panaji","surat","bilaspur",
  "bhilai","durgapur","asansol","warangal","guntur","nellore","kurnool",
  "akola","loni","ulhasnagar","jhansi","hubli","hubballi","bareilly","moradabad",
  "deoghar","bokaro","dhanbad","korba","rourkela","berhampur","sambalpur",
];

/**
 * Extract a city name from a free-text message.
 * Checks "in/near/at X" patterns first, then direct substring match.
 * Returns title-cased city string or null.
 */
function extractLocationFromMessage(msg: string): string | null {
  const lower = msg.toLowerCase();

  // Pattern: "in Delhi", "near Ranchi", "Ranchi mein", "at Mumbai"
  const locPattern = /\b(?:in|near|at|from)\s+([a-z][a-z ]{2,20}?)(?:\s*$|\s*[,.]|\s+(?:ke|ka|ki|mein|me\b|doctor|hospital|clinic|specialist))/i;
  const m = lower.match(locPattern);
  if (m) {
    const candidate = m[1].trim();
    const hit = ALL_CITIES.find((c) => c === candidate || candidate.startsWith(c + " "));
    if (hit) return hit.split(" ").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  }

  // Hinglish: "Delhi mein doctor"
  const hinglishPat = /([a-z][a-z ]{2,20}?)\s+mein\b/i;
  const hm = lower.match(hinglishPat);
  if (hm) {
    const candidate = hm[1].trim();
    const hit = ALL_CITIES.find((c) => c === candidate);
    if (hit) return hit.split(" ").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  }

  // Direct city name anywhere in message (longest match first)
  const sorted = [...ALL_CITIES].sort((a, b) => b.length - a.length);
  for (const city of sorted) {
    const re = new RegExp(`\\b${city}\\b`, "i");
    if (re.test(lower)) {
      return city.split(" ").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
    }
  }

  return null;
}

  async function send(text?: string) {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    const currentMessages = messages;
    setMessages((prev) => [...prev, { role: "user", text: msg }]);

    // ── Resolve city (priority: message text > known userCity > GPS/IP) ──────
    // Step 1: check if the user typed a city in this message
    const msgCity = extractLocationFromMessage(msg);
    if (msgCity) applyLocation(msgCity, "manual"); // as authoritative as a manual pick

    let city = msgCity || userCityRef.current;
    let citySource: LocationSource = msgCity ? "manual" : locationSourceRef.current;

    // Step 2: "near me" query with no city named in the message itself —
    // resolve the most accurate location, waiting briefly for an in-flight
    // GPS fix instead of racing ahead with a possibly-wrong IP-based city.
    if (NEAR_ME_PAT.test(msg) && !msgCity) {
      setLoading(true);
      const resolved = await resolveNearMeCity();
      if (!resolved) {
        // Both GPS and IP failed — ask the user to type their city
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "📍 Couldn't detect your location automatically.",
            askCity: true,
            pendingQuery: msg,
          },
        ]);
        setLoading(false);
        return;
      }
      city = resolved.city;
      citySource = resolved.source;
    }

    setLoading(true);
    // Build history from last 6 messages (exclude prescription/doctor UI messages, just text)
    const history = currentMessages
      .filter((m) => m.text && !m.text.startsWith("📤"))
      .slice(-6)
      .map((m) => ({ role: m.role, text: m.text.slice(0, 150) }));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s hard limit
    try {
      const body: Record<string, unknown> = { message: msg, history };
      if (city) body.user_city = city;
      if (sessionIdRef.current) body.session_id = sessionIdRef.current;
      const res = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Needed so the auth cookie actually reaches the API — without this,
        // optionalAuth on the backend never sees a logged-in user and
        // persistence silently never activates, while everything else about
        // the response still looks completely normal.
        credentials: "include",
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const data = await res.json();

      if (data.session_id) {
        setSessionId(data.session_id);
        // Refresh after every authenticated turn, not just new-session
        // creation — keeps an existing session's position in the "most
        // recent first" list correct too, not just its first appearance.
        if (user) refreshSessions();
      }

      // ── Post-process reply: inject city name into "Here are X doctors" headers ──
      let replyText: string = data.reply || "";
      const resolvedCity = city || null;
      if (resolvedCity && data.intent === "find_doctor") {
        // Replace generic "Here are <Specialty> doctors" with city-aware version
        replyText = replyText.replace(
          /^(Here are\s+\*\*[^*]+\*\*\s+doctors)(\.?\s*[:：]?\s*$)/im,
          (_, prefix, suffix) => `${prefix} in **${resolvedCity}**${suffix}`
        );
        // Also handle "I found X doctors" pattern
        replyText = replyText.replace(
          /^(I found \d+ \*\*[^*]+\*\*\s+doctors?)(\.?\s*$)/im,
          (_, prefix) => `${prefix} in **${resolvedCity}**`
        );
      }

      // If a "near me" query had to fall back to the coarser IP-based city
      // (GPS didn't settle in time), say so — the header may still correct
      // itself to a more precise city moments later.
      if (resolvedCity && citySource === "ip" && NEAR_ME_PAT.test(msg)) {
        replyText += "\n\n📶 *Using your approximate network location — tap 📍 to set your exact city if this looks wrong.*";
      }

      // ── Show "Find Doctors Near Me" chip after health-advice replies ────────
      const isHealthAdvice =
        (data.intent === "health_info" || data.intent === "general" || data.intent === "health_advice") &&
        (!data.doctors || data.doctors.length === 0);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: replyText,
          doctors: data.doctors || [],
          hospitals: data.hospitals || [],
          showNearMeChip: isHealthAdvice,
          resolvedCity: resolvedCity ?? undefined,
          resolvedCitySource: citySource,
        },
      ]);
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === "AbortError";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: isTimeout
            ? "⏱️ It's taking longer than usual. Please try again in a moment."
            : "Sorry, I couldn't connect to the server. Please try again.",
        },
      ]);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setMessages((prev) => [
      ...prev,
      { role: "user", text: `📎 ${file.name}`, isFile: true },
    ]);
    setUploading(true);
    setMessages((prev) => [
      ...prev,
      { role: "assistant", text: "📤 Uploading your prescription... reading medicines with AI..." },
    ]);

    try {
      const upload = await uploadPrescription(file);
      const result = await processPrescription(upload.id);
      const meds = result.medicines || [];

      setMessages((prev) => {
        const next = [...prev];
        // replace the "uploading..." message
        const idx = next.findLastIndex((m) => m.role === "assistant" && m.text.startsWith("📤"));
        if (idx !== -1) {
          next[idx] = {
            role: "assistant",
            text: meds.length > 0
              ? `✅ Done! Found **${meds.length} medicine${meds.length !== 1 ? "s" : ""}** in your prescription. Here's your schedule:`
              : "⚠️ I couldn't find any medicines in this image. Please try a clearer photo.",
            prescription: meds.length > 0 ? { id: upload.id, medicines: meds } : undefined,
          };
        }
        return next;
      });
    } catch (err) {
      setMessages((prev) => {
        const next = [...prev];
        const idx = next.findLastIndex((m) => m.role === "assistant" && m.text.startsWith("📤"));
        if (idx !== -1) {
          next[idx] = {
            role: "assistant",
            text: `❌ Sorry, couldn't process this file. ${err instanceof Error ? err.message : "Please try again."}`,
          };
        }
        return next;
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleMedicineImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    // Show image preview in chat
    const previewUrl = URL.createObjectURL(file);
    setMessages((prev) => [
      ...prev,
      { role: "user", text: "📷 Medicine label photo", isFile: true, imagePreview: previewUrl },
      { role: "assistant", text: "🔍 Analyzing the medicine label... please wait." },
    ]);
    setUploading(true);

    const labelController = new AbortController();
    const labelTimeout = setTimeout(() => labelController.abort(), 20000);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API}/api/chat/analyze-medicine-label`, {
        method: "POST",
        body: formData,
        signal: labelController.signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Analysis failed");
      }
      const label: MedicineLabel = await res.json();

      setMessages((prev) => {
        const next = [...prev];
        const idx = next.findLastIndex((m) => m.role === "assistant" && m.text.startsWith("🔍"));
        if (idx !== -1) {
          if (label.source === "none" && label.error) {
            // Rate limit or total failure — don't show empty card, just show text
            next[idx] = { role: "assistant", text: label.error };
          } else {
            next[idx] = {
              role: "assistant",
              text: label.name
                ? `💊 Here's what I found about **${label.name}**:`
                : "⚠️ I could partially read the label. Here's what I found:",
              medicineLabel: label,
            };
          }
        }
        return next;
      });
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === "AbortError";
      setMessages((prev) => {
        const next = [...prev];
        const idx = next.findLastIndex((m) => m.role === "assistant" && m.text.startsWith("🔍"));
        if (idx !== -1) {
          next[idx] = {
            role: "assistant",
            text: isTimeout
              ? "⏱️ Analysis is taking too long. Please try again."
              : `❌ ${err instanceof Error ? err.message : "Could not analyze the image. Please try again."}`,
          };
        }
        return next;
      });
    } finally {
      clearTimeout(labelTimeout);
      setUploading(false);
    }
  }

  const busy = loading || uploading;
  const isGreeting = (m: Message) => m.role === "assistant" && m.text === GREETING_MESSAGE.text;
  const locationLabel = locStatus === "loading" || locationResolving ? "Detecting…" : userCity || "Set location";
  const avatarInitial = user?.name?.trim()?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || null;

  return (
    <div className={compact ? "h-full flex flex-col bg-white/60" : "app-viewport flex bg-background"}>
      {/* Sidebar — full-page /chat view only, per spec. The compact floating
          widget (384×520px) has no room for a persistent side panel. */}
      {!compact && (
        <ChatSidebar
          sessions={sessions}
          currentSessionId={sessionId}
          loading={sessionsLoading}
          error={sessionsError}
          onNewChat={startNewChat}
          onSelectSession={selectSession}
          onRenameSession={handleRenameSession}
          onDeleteSession={handleDeleteSession}
          onRetry={refreshSessions}
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />
      )}
      <div className={`flex-1 min-w-0 flex flex-col relative ${compact ? "" : "ai-pulse-bg"}`}>
      {/* Header — shrink-0 so it keeps its size and the message list absorbs
          the flex slack, rather than the header stretching on tall screens. */}
      {!compact && (
        <div className="shrink-0 sticky top-0 z-30 bg-tertiary text-white shadow-md border-b border-white/10 px-4 py-3 md:px-8 md:py-6">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
              {/* Sidebar toggle — mobile only. Above md the sidebar is always
                  visible inline (see ChatSidebar's md: classes), so there's
                  nothing for this button to open there. */}
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Open chat history"
                className="md:hidden shrink-0 text-white active:scale-95 transition-transform"
              >
                <Icon name="menu" className="text-[24px]" />
              </button>
              {/* Decorative only — deliberately not a link.
                  `draggable={false}` matters: a bare <img> is natively draggable,
                  so an imprecise click (mousedown, slight move, mouseup) starts an
                  image drag, and dropping it back on the tab navigates the browser
                  to /doctar-logo.svg — a real full page load that wipes the whole
                  conversation and reads as "clicking the logo reloaded the page".
                  `pointer-events-none` makes the element inert to clicks entirely.
                  Linking it home would be pointless anyway: next.config.ts
                  redirects / → /chat, so this page already is home. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/doctar-logo.svg"
                alt="DOCTAR"
                draggable={false}
                className="h-8 md:h-12 w-auto object-contain rounded-lg pointer-events-none select-none shrink-0"
              />
              {/* Title/subtitle — desktop only; the mobile header stays a bare
                  logo + hamburger, matching the mobile reference. */}
              <div className="hidden md:flex flex-col min-w-0">
                <h2 className="font-headline-lg text-headline-lg font-bold text-white truncate">DOCTAR AI Assistant</h2>
                <p className="font-body-md text-body-md text-white/80 mt-1">Find doctors · Upload prescription · Health guidance</p>
              </div>
            </div>

            <div className="flex items-center gap-3 md:gap-6 shrink-0">
              {/* ── Location selector ── */}
              <div ref={pickerRef} className="relative">
                <button
                  onClick={() => setShowPicker((v) => !v)}
                  aria-label="Set your location"
                  className="flex items-center gap-2 group text-white hover:bg-white/10 md:hover:bg-transparent rounded-full p-2 md:p-0 transition-colors"
                >
                  {/* Compact mobile pill */}
                  <span className="md:hidden flex items-center gap-1">
                    <Icon name="location_on" filled className="text-[20px]" />
                    <span className="font-label-md text-label-md">{userCity || "Location"}</span>
                  </span>

                  {/* Fuller desktop treatment */}
                  <div className="hidden md:flex items-center gap-3">
                    <div className="flex flex-col items-end">
                      <span className="font-caption-sm text-caption-sm text-white/70 uppercase tracking-wider">Your Location</span>
                      <span className="font-label-md text-label-md text-white font-semibold flex items-center gap-1 group-hover:text-white/80 transition-colors">
                        {locationLabel}
                        <Icon name="location_on" filled className="text-[16px]" />
                      </span>
                    </div>
                    <div
                      className={`w-11 h-11 shrink-0 bg-white rounded-[18px] border border-gray-200 shadow-md flex items-center justify-center transition-all group-hover:shadow-lg ${
                        locStatus === "loading" || locationResolving ? "animate-pulse opacity-70" : ""
                      } ${showPicker ? "ring-2 ring-white/60" : ""}`}
                    >
                      <Icon
                        name={locStatus === "loading" || locationResolving ? "progress_activity" : "my_location"}
                        filled={!(locStatus === "loading" || locationResolving)}
                        className={`text-[20px] text-primary ${locStatus === "loading" || locationResolving ? "animate-spin" : ""}`}
                      />
                    </div>
                  </div>
                </button>

                {/* Dropdown picker */}
                {showPicker && (
                  <LocationPicker
                    detecting={locStatus === "loading" || locationResolving}
                    onClose={() => setShowPicker(false)}
                    onSelect={(city) => {
                      applyLocation(city, "manual");
                      setLocStatus("idle");
                      setShowPicker(false);
                    }}
                    onDetect={async () => {
                      const city = await getLocation();
                      if (city) setShowPicker(false);
                    }}
                  />
                )}
              </div>

              {/* User avatar — desktop only; decorative (no menu exists to open). */}
              <div className="hidden md:flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-surface-gloss shadow-soft-surface overflow-hidden bg-surface-variant flex items-center justify-center">
                  {avatarInitial ? (
                    <span className="font-title-md text-title-md font-bold text-primary">{avatarInitial}</span>
                  ) : (
                    <Icon name="account_circle" filled className="text-[32px] text-outline" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages — min-h-0 is required: a flex child defaults to min-height
          auto, so a tall conversation would grow the column past the viewport
          and push the input row off-screen instead of scrolling internally. */}
      <div className={`flex-1 min-h-0 overflow-y-auto px-4 py-3 sm:py-4 ${compact ? "" : "md:px-12 md:py-8 md:pb-32"} relative z-10`}>
        <div className={`${compact ? "" : "max-w-2xl md:max-w-4xl mx-auto"} space-y-4`}>
          {messages.map((m, i) => {
            if (isGreeting(m)) {
              return (
                <div key={i} className="flex justify-start">
                  <div className="w-full">
                    <WelcomeCard compact={compact} />
                  </div>
                </div>
              );
            }
            return (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] ${m.role === "user" ? "" : "w-full"}`}>
                {m.role === "assistant" && (
                  <div className="flex items-center gap-1.5 mb-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                      src="/doctar-logo.svg"
                      alt=""
                      draggable={false}
                      className="w-5 h-5 rounded-full pointer-events-none select-none"
                    />
                    <span className="font-caption-sm text-caption-sm font-medium text-primary">DOCTAR AI</span>
                  </div>
                )}
                {m.imagePreview && (
                  <div className="mb-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.imagePreview}
                      alt="Medicine label"
                      className="rounded-xl max-h-48 object-contain border border-outline-variant/30"
                    />
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-3 font-body-md text-body-md leading-relaxed ${
                    m.role === "user"
                      ? m.isFile
                        ? "bg-secondary-container/40 text-on-secondary-container border border-secondary-container rounded-br-sm"
                        : "bg-gradient-to-br from-ai-gradient-start to-ai-gradient-end text-white rounded-br-sm shadow-btn-primary"
                      : "bg-surface-gloss text-on-surface shadow-soft-surface border border-white/50 rounded-bl-sm"
                  }`}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }}
                />
                {m.doctors && m.doctors.length > 0 && (
                  <div className="mt-1 space-y-2">
                    {m.doctors.map((d) => <DoctorCard key={d.id} d={d} />)}
                  </div>
                )}
                {m.hospitals && m.hospitals.length > 0 && (
                  <div className="mt-1 space-y-2">
                    {m.hospitals.map((h) => <HospitalCard key={h.id} h={h} />)}
                  </div>
                )}
                {m.askCity && (
                  <form
                    className="mt-2 flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const input = (e.currentTarget.elements.namedItem("city") as HTMLInputElement);
                      const typed = input.value.trim();
                      if (!typed) return;
                      applyLocation(typed, "manual");
                      // re-fire the original near-me query with the typed city
                      send(m.pendingQuery || typed);
                    }}
                  >
                    <input
                      name="city"
                      autoFocus
                      placeholder="Enter your city…"
                      className="flex-1 min-w-0 skeuo-input rounded-xl px-3 py-2 font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      type="submit"
                      className="shrink-0 bg-gradient-to-r from-ai-gradient-start to-ai-gradient-end text-white shadow-btn-primary hover:opacity-90 transition-opacity font-label-md text-label-md font-semibold px-4 py-2 rounded-xl"
                    >
                      Go
                    </button>
                  </form>
                )}
                {m.prescription && (
                  <PrescriptionMessage result={m.prescription} />
                )}
                {m.medicineLabel && (
                  <MedicineLabelCard label={m.medicineLabel} />
                )}
                {m.showNearMeChip && (
                  <div className="mt-3">
                    <button
                      onClick={() => send("find doctors near me")}
                      className="inline-flex items-center gap-1.5 font-label-md text-label-md font-medium bg-secondary-container/30 hover:bg-secondary-container/50 border border-secondary-container text-on-secondary-container rounded-full px-3 py-1.5 transition-colors"
                    >
                      <Icon name="local_hospital" filled className="text-[15px]" /> Find Doctors Near Me
                    </button>
                  </div>
                )}
              </div>
            </div>
            );
          })}

          {busy && !uploading && (
            <div className="flex justify-start">
              <div className="bg-surface-gloss border border-white/50 shadow-soft-surface rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1.5 items-center">
                  <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Suggestions + input — desktop floats this whole block over the
          message list as a gradient-fading glass overlay (matching the
          reference); mobile keeps it docked in normal flow at the bottom,
          which is also how the mobile reference itself is structured. */}
      <div
        className={
          compact
            ? ""
            : "md:absolute md:bottom-0 md:left-0 md:right-0 md:p-6 md:bg-gradient-to-t md:from-background md:via-background md:to-transparent md:pointer-events-none md:z-20"
        }
      >
        {/* Suggestions */}
        {messages.length === 1 && (
          <div className={compact ? "shrink-0 px-4 pb-2" : "shrink-0 px-4 pb-2 md:px-0 md:pb-4 md:pointer-events-auto"}>
            {/* Desktop: centered wrapping pill row */}
            <div className={`hidden ${compact ? "" : "md:flex"} flex-wrap gap-2 justify-center max-w-3xl mx-auto`}>
              {SUGGESTIONS.map((s, idx) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="px-5 py-2.5 bg-surface-gloss rounded-full shadow-soft-surface border border-white/60 text-primary hover:bg-surface-container-low transition-all duration-200 font-label-md text-label-md flex items-center gap-2"
                >
                  {idx === 0 && <Icon name="location_on" className="text-[16px] text-tertiary" />}
                  {idx === 1 && <Icon name="local_hospital" className="text-[16px] text-tertiary" />}
                  {suggestionLabel(s)}
                </button>
              ))}
            </div>

            {/* Mobile / compact: horizontally-scrollable chip row */}
            <div className={compact ? "" : "md:hidden"}>
              {!compact && <h3 className="font-label-md text-label-md text-outline mb-3 px-1">Suggested Queries</h3>}
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 px-1">
                {SUGGESTIONS.map((s, idx) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className={`skeuo-button-secondary bg-surface-gloss font-label-md text-label-md px-4 py-2 rounded-full whitespace-nowrap active:bg-surface-dim transition-colors flex items-center gap-2 shrink-0 ${
                      idx === 0
                        ? "border border-primary/20 text-primary"
                        : idx === 1
                        ? "border border-tertiary/20 text-tertiary"
                        : "border border-outline-variant/50 text-on-surface-variant"
                    }`}
                  >
                    {idx === 0 && <Icon name="location_on" className="text-[18px]" />}
                    {idx === 1 && <Icon name="local_hospital" className="text-[18px]" />}
                    {suggestionLabel(s)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input — shrink-0 keeps it pinned above the fold; pb uses the safe-area
            inset so it clears the iOS home indicator / Android gesture bar. */}
        <div
          className={
            compact
              ? "shrink-0 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-surface-gloss/90 border-t border-white/50"
              : "shrink-0 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-surface-gloss/90 backdrop-blur-xl border-t border-white/50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] " +
                "md:pointer-events-auto md:max-w-4xl md:mx-auto md:w-full md:glass-panel md:rounded-3xl md:p-2 md:shadow-glass md:border-white/30 md:bg-transparent md:backdrop-blur-xl"
          }
        >
          {/* Compact mode: show current city + location picker trigger */}
          {compact && (
            <div ref={pickerRef} className="relative mb-2 flex items-center justify-between">
              <button
                onClick={() => setShowPicker((v) => !v)}
                className="flex items-center gap-1.5 font-caption-sm text-caption-sm text-primary hover:opacity-80 transition-opacity"
              >
                <Icon name="location_on" filled className="text-[16px]" />
                <span>{locStatus === "loading" || locationResolving ? "Detecting…" : userCity || "Set your city"}</span>
              </button>
              {showPicker && (
                <div className="absolute bottom-full right-0 mb-1 z-50">
                  <LocationPicker
                    detecting={locStatus === "loading" || locationResolving}
                    onClose={() => setShowPicker(false)}
                    onSelect={(city) => { applyLocation(city, "manual"); setLocStatus("idle"); setShowPicker(false); }}
                    onDetect={async () => { const city = await getLocation(); if (city) setShowPicker(false); }}
                  />
                </div>
              )}
            </div>
          )}
          <div className={`${compact ? "" : "max-w-2xl md:max-w-none mx-auto"} flex gap-2 items-center`}>
            {/* Prescription attachment button */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              title="Upload prescription"
              className="shrink-0 w-12 h-12 rounded-full skeuo-button-secondary bg-surface-gloss flex items-center justify-center text-outline hover:text-primary disabled:opacity-40 transition-colors"
            >
              <Icon name="attach_file" className="text-[22px]" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFile}
            />

            {/* Medicine label scan — opens a choice menu rather than firing a
                file input directly, so the user can pick camera vs. an image
                they already have instead of being forced into the camera. */}
            <div ref={scanMenuRef} className="relative shrink-0">
              <button
                onClick={() => setShowScanMenu((v) => !v)}
                disabled={busy}
                title="Scan medicine label / पैकेट की फोटो लें"
                aria-haspopup="menu"
                aria-expanded={showScanMenu}
                className="w-12 h-12 rounded-full skeuo-button-secondary bg-surface-gloss flex items-center justify-center text-outline hover:text-primary disabled:opacity-40 transition-colors"
              >
                <Icon name="photo_camera" className="text-[22px]" />
              </button>

              {showScanMenu && (
                /* Opens upward — the input bar is pinned to the bottom of the
                   viewport, so a downward menu would render off-screen. */
                <div
                  role="menu"
                  className="absolute bottom-full left-0 mb-2 w-56 bg-surface-gloss rounded-2xl shadow-soft-surface border border-outline-variant/30 z-50 overflow-hidden"
                >
                  <div className="px-4 py-2.5 border-b border-outline-variant/20">
                    <p className="font-caption-sm text-caption-sm font-semibold text-outline uppercase tracking-wide">
                      Scan medicine label
                    </p>
                  </div>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setShowScanMenu(false);
                      cameraCaptureRef.current?.click();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors"
                  >
                    <Icon name="photo_camera" filled className="text-[20px] text-primary" />
                    Take Photo
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setShowScanMenu(false);
                      gallerySelectRef.current?.click();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors"
                  >
                    <Icon name="image" filled className="text-[20px] text-tertiary" />
                    Choose from Gallery
                  </button>
                </div>
              )}
            </div>
            {/* `capture` present → mobile browsers open the camera directly. */}
            <input
              ref={cameraCaptureRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleMedicineImage}
            />
            {/* No `capture` → the normal OS photo library / file picker. */}
            <input
              ref={gallerySelectRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleMedicineImage}
            />

            <div className="flex-1 min-w-0 relative">
              <input
                className="w-full min-w-0 skeuo-input rounded-full md:rounded-full py-3.5 px-5 font-body-md text-body-md text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                placeholder={listening ? "🎙️ Listening… speak now" : compact ? "Ask about doctors or health..." : "Ask about doctors, or attach a prescription"}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                disabled={busy}
              />
            </div>

            {/* Voice input — rendered only where the Web Speech API exists.
                Sits on the right, between the text field and Send: dictating is
                part of composing a message, so it belongs with the send action
                rather than with the attach/scan inputs on the left. */}
            {voiceSupported && (
              <button
                onClick={listening ? stopListening : startListening}
                disabled={uploading}
                title={listening ? "Stop listening" : "Speak your question"}
                aria-label={listening ? "Stop voice input" : "Start voice input"}
                aria-pressed={listening}
                className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center skeuo-button-secondary transition-colors ${
                  listening ? "bg-error-container text-error animate-pulse" : "bg-surface-gloss text-outline hover:text-primary"
                } disabled:opacity-40`}
              >
                {listening ? (
                  <span className="relative flex items-center justify-center">
                    <span className="absolute w-3 h-3 bg-error rounded-full animate-ping opacity-75" />
                    <span className="relative w-2.5 h-2.5 bg-error rounded-full" />
                  </span>
                ) : (
                  <Icon name="mic" className="text-[22px]" />
                )}
              </button>
            )}

            <button
              onClick={() => send()}
              disabled={busy || !input.trim()}
              className="shrink-0 w-12 h-12 rounded-full skeuo-button-primary bg-gradient-to-r from-ai-gradient-start to-ai-gradient-end disabled:opacity-40 text-white flex items-center justify-center transition-transform active:scale-95 ml-1"
            >
              <Icon name="send" filled className="text-[20px]" />
            </button>
          </div>
          {voiceError && (
            <p className="mt-1.5 text-center font-caption-sm text-caption-sm text-error">{voiceError}</p>
          )}
          <p className="flex justify-center gap-4 mt-3 pt-1 pb-1 font-caption-sm text-caption-sm text-outline">
            <span className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors" onClick={() => fileRef.current?.click()}>
              <Icon name="description" className="text-[14px]" /> Prescription
            </span>
            <span className="text-outline-variant">•</span>
            <span className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors" onClick={() => setShowScanMenu(true)}>
              <Icon name="qr_code_scanner" className="text-[14px]" /> Scan medicine label
            </span>
            {voiceSupported && (
              <>
                <span className="text-outline-variant">•</span>
                <span className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors" onClick={listening ? stopListening : startListening}>
                  <Icon name="mic" className="text-[14px]" /> Speak
                </span>
              </>
            )}
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
