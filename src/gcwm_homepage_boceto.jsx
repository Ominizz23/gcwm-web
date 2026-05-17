import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toCanvas } from "html-to-image";
import {
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Heart,
  Images,
  Instagram,
  Link2,
  Mail,
  Menu,
  MessageCircle,
  PlayCircle,
  Scissors,
  Search,
  ShoppingBag,
  Sparkles,
  Tag,
  User,
  Users,
  Wand2,
  Wrench,
  X,
  Zap,
} from "lucide-react";

import { categories, getCategory } from "./data/categories";
import { tutorials } from "./data/tutorials";
import { products as shopItems } from "./data/products";
import { professionals } from "./data/professionals";
import { characters } from "./data/characters";
import { postJson, exitApp } from "./native.js";
import { useAndroidBackButton } from "./use-android-back.js";

// ───────────────────────────────────────────────────────
// Configuración del negocio
// ───────────────────────────────────────────────────────
const WHATSAPP_NUMBER = "5491153290690";
const BASE_URL = import.meta.env.BASE_URL;

// URL del Google Apps Script (te la genera Google al publicar el script).
// Mientras esté vacía, el modal igual funciona pero los datos solo se guardan
// localmente. Cuando publiques tu Apps Script, pegá la URL acá.
const SUBSCRIPTION_ENDPOINT = "https://script.google.com/macros/s/AKfycbyazKz-uSFg6rLxGaDJLBVPeF10B2yMlDptybHyHcNokLwG9Qu5iAIc41eeAzIBaBbsNg/exec";

// Cuántos segundos esperar antes de mostrar el modal de suscripción
const SUBSCRIPTION_MODAL_DELAY_MS = 8000;

// URL pública del sitio (aparece en el footer del template de venta)
const SITE_URL = "ominizz23.github.io/gcwm-web";

// Próximo evento de cosplay
const NEXT_EVENT = {
  name: "Cosmo Buenos Aires 2026",
  date: new Date("2026-11-07T10:00:00-03:00"),
  location: "Buenos Aires, AR",
};

// Arquetipos para el Build Wizard
const BUILD_ARCHETYPES = [
  { id: "armored", label: "Guerrero / Armadura", desc: "Piezas rígidas, armas y armaduras elaboradas.", categories: ["props", "electronica"] },
  { id: "fabric", label: "Traje de Tela", desc: "Costura, moldería y trajes ajustados al personaje.", categories: ["tela", "pelucas"] },
  { id: "tech", label: "Cyborg / Sci-Fi", desc: "LEDs reactivos, circuitos y efectos tecnológicos integrados.", categories: ["electronica", "props"] },
  { id: "fantasy", label: "Fantasy / Mágico", desc: "Peinados imposibles, telas vaporosas y accesorios mágicos.", categories: ["pelucas", "tela"] },
  { id: "full", label: "Full Build", desc: "El arsenal completo: tela, props, peluca y electrónica.", categories: ["tela", "props", "pelucas", "electronica"] },
];

// ───────────────────────────────────────────────────────
// Helper: enviar suscripción al endpoint de Google Sheets
// ───────────────────────────────────────────────────────
// Usado tanto por el modal como por el newsletter del footer.
// IMPORTANTE: usa Content-Type "text/plain" para evitar el preflight
// CORS que Apps Script no maneja bien con mode "no-cors".
async function sendSubscription({ name = "", instagram = "", email = "", source = "modal" }) {
  // Backup local siempre (por si la red falla o es modo incógnito)
  try {
    const existing = JSON.parse(localStorage.getItem("gcwm-subscriptions") || "[]");
    existing.push({ name, instagram, email, source, at: new Date().toISOString() });
    localStorage.setItem("gcwm-subscriptions", JSON.stringify(existing));
  } catch {
    // Falla silenciosa — algunas configuraciones de privacidad bloquean storage
  }

  // Si no hay endpoint configurado, salimos solo con el backup local
  if (!SUBSCRIPTION_ENDPOINT) return;

  try {
    // En nativo (Android) usa CapacitorHttp y evita el problema de CORS preflight.
    // En web sigue siendo fetch no-cors (los datos llegan al Sheet pero no se lee respuesta).
    await postJson(SUBSCRIPTION_ENDPOINT, {
      name,
      instagram,
      email,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Subscription send error:", err);
  }
}

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function formatPrice(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

// ═══════════════════════════════════════════════════════
// SUBSCRIPTION MODAL — aparece a los 8s, una sola vez
// ═══════════════════════════════════════════════════════
const SUBSCRIBED_KEY = "gcwm-subscribed";

function SubscriptionModal() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | sending | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState({ name: "", instagram: "", email: "" });

  // Mostrar después del delay, solo si nunca se mostró antes
  useEffect(() => {
    let alreadyShown = false;
    try {
      alreadyShown = localStorage.getItem(SUBSCRIBED_KEY) !== null;
    } catch {
      // Si localStorage falla, asumimos que no se mostró
    }
    if (alreadyShown) return;

    const timer = setTimeout(() => setOpen(true), SUBSCRIPTION_MODAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // Cerrar con Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && open) closeAndRemember("dismissed");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function closeAndRemember(reason) {
    try {
      localStorage.setItem(SUBSCRIBED_KEY, JSON.stringify({ reason, at: Date.now() }));
    } catch {
      // ignore
    }
    setOpen(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Validación mínima
    if (!form.name.trim() || !form.email.trim()) {
      setErrorMsg("Necesitamos al menos tu nombre y email.");
      setStatus("error");
      return;
    }

    setStatus("sending");
    setErrorMsg("");

    await sendSubscription({ ...form, source: "modal" });

    setStatus("success");
    setTimeout(() => closeAndRemember("subscribed"), 2200);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop (no cierra al click — solo bloquea el contenido detrás) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/85"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md overflow-hidden rounded-sm border border-[var(--eva-green)]/30 bg-gradient-to-b from-[var(--eva-charcoal)] to-black shadow-2xl shadow-black/80"
      >
        {/* Esquinas HUD */}
        <div className="pointer-events-none absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-[var(--eva-green)]" />
        <div className="pointer-events-none absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-[var(--eva-green)]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-[var(--eva-green)]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-[var(--eva-green)]" />

        {/* Botón cerrar */}
        <button
          type="button"
          onClick={() => closeAndRemember("dismissed")}
          className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-sm border border-white/10 bg-black/60 text-slate-400 transition hover:border-white/30 hover:text-white"
          aria-label="Cerrar modal"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative p-4 md:p-8">
          {/* Grid HUD de fondo */}
          <div className="absolute inset-0 eva-grid-bg opacity-30" />

          <div className="relative">
            {status === "success" ? (
              // ESTADO: ÉXITO
              <div className="py-6 text-center">
                <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full border border-[var(--eva-green)]/40 bg-[var(--eva-green)]/10">
                  <Sparkles className="h-7 w-7 text-[var(--eva-green)]" />
                </div>
                <p className="font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-green)]">
                  ▸ sync_complete
                </p>
                <h3 className="mt-3 font-display text-3xl text-white">
                  Bienvenido al sistema.
                </h3>
                <p className="mt-3 text-sm text-slate-400">
                  Te avisamos cuando lancemos cosas nuevas.
                </p>
              </div>
            ) : (
              // ESTADO: FORMULARIO
              <>
                <div className="mb-5">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-sm border border-[var(--eva-green)]/30 bg-black/60 px-2.5 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--eva-green)] eva-pulse" />
                    <span className="font-mono-tech text-[9px] uppercase tracking-[0.25em] text-[var(--eva-green)]">
                      ▸ pilot_signup
                    </span>
                  </div>
                  <h3 className="font-display text-3xl leading-tight text-white md:text-4xl">
                    Sumate al <br />
                    <span className="text-[var(--eva-green)] eva-glow-green">registro GCWM.</span>
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    Recibí los nuevos cursos, lanzamientos y descuentos antes que nadie.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Nombre */}
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-2 font-mono-tech text-[10px] uppercase tracking-[0.2em] text-slate-500">
                      <User className="h-3 w-3" />
                      Nombre
                    </span>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Tu nombre"
                      className="w-full rounded-sm border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--eva-green)]/50 focus:bg-black/80"
                      required
                    />
                  </label>

                  {/* Instagram */}
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-2 font-mono-tech text-[10px] uppercase tracking-[0.2em] text-slate-500">
                      <Instagram className="h-3 w-3" />
                      Instagram
                    </span>
                    <input
                      type="text"
                      value={form.instagram}
                      onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                      placeholder="@tuusuario"
                      className="w-full rounded-sm border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--eva-green)]/50 focus:bg-black/80"
                    />
                  </label>

                  {/* Email */}
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-2 font-mono-tech text-[10px] uppercase tracking-[0.2em] text-slate-500">
                      <Mail className="h-3 w-3" />
                      Email
                    </span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="tu@email.com"
                      className="w-full rounded-sm border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--eva-green)]/50 focus:bg-black/80"
                      required
                    />
                  </label>

                  {/* Error */}
                  {status === "error" && errorMsg && (
                    <div className="rounded-sm border border-[var(--eva-orange)]/40 bg-[var(--eva-orange)]/10 px-3 py-2 font-mono-tech text-[11px] text-[var(--eva-orange)]">
                      ▸ {errorMsg}
                    </div>
                  )}

                  {/* Botones */}
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => closeAndRemember("dismissed")}
                      className="flex-1 rounded-sm border border-white/10 bg-black/40 px-4 py-3 font-mono-tech text-xs uppercase tracking-[0.2em] text-slate-400 transition hover:bg-black/60"
                    >
                      Ahora no
                    </button>
                    <button
                      type="submit"
                      disabled={status === "sending"}
                      className="flex-[1.5] rounded-sm bg-[var(--eva-green)] px-4 py-3 font-mono-tech text-xs font-bold uppercase tracking-[0.2em] text-black shadow-[0_0_20px_var(--eva-green-glow)] transition hover:bg-white disabled:opacity-50"
                    >
                      {status === "sending" ? "Enviando..." : "Sumarme ▸"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PLATFORM DETECTION — EVA unit assigned by device OS
// ═══════════════════════════════════════════════════════
function detectPlatform() {
  const ua = navigator.userAgent || "";
  if (/iPhone|iPod/.test(ua)) return "ios";
  if (/iPad/.test(ua)) return "ios";
  // iPadOS 13+ reports as Macintosh but has touch points
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

const SYNC_VARIANTS = {
  // EVA-00 Prototype — Rei Ayanami — iOS/Apple
  ios: {
    unit: "00",
    class: "PROTOTYPE",
    pilot: "1ST CHILD",
    pilotName: "REI AYANAMI",
    accent: "#00CFFF",
    syncDuration: 3000,
    plateauEnd: 4200,
    spikeDuration: 500,
    bootStatus: "DORMANT",
    activeStatus: "AWAKENING",
    lclDisplay: "SOUL INFUSED",
    logLines: [
      "MAGI_01 BALTHASAR ........... ONLINE",
      "DUMMY SYSTEM ................ STANDBY",
      "SOUL INTEGRATION ............ PARTIAL",
      "REI INTERFACE ............... ACTIVE",
      "AWAKENING PROTOCOL: ARMED",
    ],
    exceededLog: [
      "!!! SOUL AWAKENING DETECTED !!!",
      "!!! DUMMY PLUG: OVERRIDE !!!",
      "!!! REI: AWAKENED !!!",
    ],
    exceededBanner: "⚠ SOUL AWAKENING — PROTOTYPE UNBOUNDED ⚠",
  },
  // EVA-02 Production Model — Asuka Langley — Android
  android: {
    unit: "02",
    class: "PRODUCTION",
    pilot: "2ND CHILD",
    pilotName: "ASUKA LANGLEY",
    accent: "#FF2244",
    syncDuration: 1400,
    plateauEnd: 2000,
    spikeDuration: 220,
    bootStatus: "STANDBY",
    activeStatus: "KAMPFBEREIT",
    lclDisplay: "NOMINAL",
    logLines: [
      "KAMPFEINHEIT ................ AKTIVIERT",
      "GERMAN INTERFACE ............ ONLINE",
      "SYNCHRONISATION ............. BEGINNT",
      "STOLZ DER MENSCHHEIT ........ AKTIV",
      "LEISTUNG: NOMINAL",
    ],
    exceededLog: [
      "!!! ICH BIN KEINE PUPPE !!!",
      "!!! PRIDE OVERFLOW CRITICAL !!!",
      "!!! ASUKA: ENTFESSELT !!!",
    ],
    exceededBanner: "⚠ ICH BIN KEINE PUPPE! — ENTFESSELT ⚠",
  },
  // EVA-01 — Shinji Ikari — Desktop
  desktop: {
    unit: "01",
    class: "EVANGELION",
    pilot: "3RD CHILD",
    pilotName: "SHINJI IKARI",
    accent: "#A8FF60",
    syncDuration: 2200,
    plateauEnd: 2900,
    spikeDuration: 400,
    bootStatus: "STANDBY",
    activeStatus: "BERSERKER",
    lclDisplay: "NOMINAL",
    logLines: [
      "MAGI_01 BALTHASAR ........... ONLINE",
      "MAGI_02 MELCHIOR ............ ONLINE",
      "MAGI_03 CASPER .............. ONLINE",
      "ENTRY PLUG: PRESSURIZATION OK",
      "NEURAL INTERFACE: ESTABLISHED",
    ],
    exceededLog: [
      "!!! ABSOLUTE BORDERLINE EXCEEDED !!!",
      "!!! BERSERKER MODE ACTIVE !!!",
      "!!! PILOT EJECT: FAILED !!!",
    ],
    exceededBanner: "⚠ ABSOLUTE BORDERLINE EXCEEDED ⚠",
  },
};

// ═══════════════════════════════════════════════════════
// SYNC MODAL — animación de sincronización EVA-01
// ═══════════════════════════════════════════════════════
function SyncModal({ onClose }) {
  const platform = useMemo(detectPlatform, []);
  const variant = SYNC_VARIANTS[platform];

  const [syncPct, setSyncPct] = useState(0);
  const [phase, setPhase] = useState("boot"); // boot | syncing | exceeded | complete
  const [log, setLog] = useState([]);
  const [bars, setBars] = useState({ at: 0, neural: 0, bio: 0 });
  const rafRef = useRef(null);
  const activeRef = useRef(true);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    activeRef.current = true;
    const timerIds = [];

    variant.logLines.forEach((line, i) => {
      timerIds.push(setTimeout(() => {
        setLog((prev) => [line, ...prev].slice(0, 6));
      }, i * 180));
    });

    // Animate sidebar bars while booting
    let barProgress = 0;
    const barInterval = setInterval(() => {
      barProgress = Math.min(barProgress + 2.5, 100);
      setBars({ at: barProgress * 0.68, neural: barProgress * 0.89, bio: barProgress * 0.714 });
      if (barProgress >= 100) clearInterval(barInterval);
    }, 20);

    // Start sync counter
    timerIds.push(setTimeout(() => {
      if (!activeRef.current) return;
      clearInterval(barInterval);
      setPhase("syncing");

      const { syncDuration, plateauEnd, spikeDuration } = variant;
      let startTime = null;

      function step(timestamp) {
        if (!activeRef.current) return;
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;

        if (elapsed < syncDuration) {
          const t = elapsed / syncDuration;
          const eased = 1 - Math.pow(1 - t, 2.5);
          setSyncPct(eased * 71.4);
          rafRef.current = requestAnimationFrame(step);
        } else if (elapsed < plateauEnd) {
          setSyncPct(71.4);
          rafRef.current = requestAnimationFrame(step);
        } else if (elapsed < plateauEnd + spikeDuration) {
          const t = (elapsed - plateauEnd) / spikeDuration;
          setSyncPct(71.4 + Math.pow(t, 0.4) * (400 - 71.4));
          rafRef.current = requestAnimationFrame(step);
        } else {
          setSyncPct(400);
          setBars({ at: 100, neural: 100, bio: 100 });
          setLog(() => [
            ...variant.exceededLog,
            variant.logLines[0],
            variant.logLines[1],
            variant.logLines[2],
          ]);
          setPhase("exceeded");

          timerIds.push(setTimeout(() => {
            if (!activeRef.current) return;
            setPhase("complete");
            timerIds.push(setTimeout(() => {
              if (activeRef.current) onCloseRef.current();
            }, 900));
          }, 2200));
        }
      }

      rafRef.current = requestAnimationFrame(step);
    }, 900));

    return () => {
      activeRef.current = false;
      timerIds.forEach(clearTimeout);
      clearInterval(barInterval);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isExceeded = phase === "exceeded";
  const isComplete = phase === "complete";
  const accent = isExceeded ? "#FF6B1A" : variant.accent;

  const displayPct = syncPct >= 400 ? "400.0" : syncPct.toFixed(1);
  const elapsedSec = Math.floor((syncPct / 400) * 300);
  const opTime = `T+${String(Math.floor(elapsedSec / 60)).padStart(2, "0")}:${String(elapsedSec % 60).padStart(2, "0")}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isComplete ? 0 : 1 }}
      transition={{ duration: isComplete ? 0.9 : 0.25 }}
      className="fixed inset-0 z-[200] overflow-hidden bg-black eva-scanline"
    >
      {/* Grid */}
      <div className="absolute inset-0 eva-grid-bg opacity-15" />

      {/* Orange alarm wash when exceeded */}
      {isExceeded && (
        <motion.div
          animate={{ opacity: [0.04, 0.12, 0.04, 0.14, 0.04] }}
          transition={{ duration: 0.35, repeat: Infinity }}
          className="absolute inset-0 bg-[var(--eva-orange)]"
        />
      )}

      {/* Large HUD corners */}
      {["left-4 top-4 border-l-[3px] border-t-[3px]", "right-4 top-4 border-r-[3px] border-t-[3px]", "bottom-4 left-4 border-b-[3px] border-l-[3px]", "bottom-4 right-4 border-b-[3px] border-r-[3px]"].map((cls, i) => (
        <div key={i} className={`pointer-events-none absolute h-14 w-14 transition-colors duration-500 ${cls}`} style={{ borderColor: accent }} />
      ))}

      {/* Top bar */}
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="absolute left-0 right-0 top-0 flex items-center justify-between px-6 py-3 border-b md:px-8"
        style={{ borderBottomColor: `${accent}30`, backgroundColor: `${accent}08` }}
      >
        <div className="flex items-center gap-3 md:gap-5">
          <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: accent }} />
          <span className="font-mono-tech text-[8px] uppercase tracking-[0.35em] md:text-[9px]" style={{ color: accent }}>
            NERV HQ // MAGI SYSTEM // CLR LVL 4
          </span>
          {isExceeded && (
            <motion.span
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 0.35, repeat: Infinity }}
              className="hidden rounded-sm border px-2 py-0.5 font-mono-tech text-[8px] uppercase tracking-[0.2em] text-[var(--eva-orange)] md:inline-block"
              style={{ borderColor: "#FF6B1A" }}
            >
              ⚠ EMERGENCY
            </motion.span>
          )}
        </div>
        <div className="flex items-center gap-3 md:gap-5">
          <span className="hidden font-mono-tech text-[8px] uppercase tracking-wider text-white/30 md:block">
            {new Date().toLocaleTimeString()}
          </span>
          <button type="button" onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-sm border border-white/10 bg-black/60 text-slate-500 transition hover:text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </motion.div>

      {/* Main layout */}
      <div className="absolute inset-0 flex items-center justify-center pt-14 pb-12">
        <div className="grid w-full max-w-5xl grid-cols-1 gap-4 px-5 md:grid-cols-[0.7fr_1fr_0.7fr] md:gap-5 md:px-8">

          {/* Left panel — desktop only */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="hidden space-y-4 md:block"
          >
            <div className="rounded-sm border border-white/10 bg-black/70 p-4 backdrop-blur">
              <p className="mb-3 font-mono-tech text-[8px] uppercase tracking-[0.4em]" style={{ color: accent }}>▸ unit_registry</p>
              <p className="font-display text-4xl leading-none text-white">UNIT</p>
              <p className="font-display text-5xl leading-none" style={{ color: accent, textShadow: `0 0 20px ${accent}60` }}>{variant.unit}</p>
              <div className="mt-4 space-y-2.5">
                {[
                  { k: "CLASS", v: variant.class },
                  { k: "PILOT", v: variant.pilot },
                  { k: "STATUS", v: isExceeded ? variant.activeStatus : phase === "boot" ? variant.bootStatus : "ACTIVE", alert: isExceeded },
                  { k: "LCL RATIO", v: variant.lclDisplay },
                  { k: "PLUG DEPTH", v: isExceeded ? "EXCEEDED" : phase === "boot" ? "CALIBRATING" : `${(syncPct * 0.18).toFixed(1)}m` },
                ].map(({ k, v, alert }) => (
                  <div key={k} className="flex items-center justify-between gap-2">
                    <span className="font-mono-tech text-[7px] uppercase tracking-[0.2em] text-white/30">{k}</span>
                    <span className="font-mono-tech text-[8px] uppercase" style={{ color: alert ? "#FF6B1A" : "rgba(255,255,255,0.7)" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-sm border border-white/5 bg-black/40 p-4">
              <p className="mb-3 font-mono-tech text-[8px] uppercase tracking-[0.3em] text-white/30">▸ sys_log</p>
              <div className="space-y-1.5">
                {(log.length ? log : ["...BOOTING..."]).map((line, i) => (
                  <p key={i} className="font-mono-tech text-[8px] leading-4"
                    style={{ color: line.startsWith("!!!") ? "#FF6B1A" : "rgba(255,255,255,0.3)" }}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Center — sync rate display */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.5 }}
            className="flex flex-col items-center justify-center gap-5"
          >
            <p className="font-mono-tech text-[9px] uppercase tracking-[0.5em] text-white/40">
              synchronization rate
            </p>

            {/* Big number */}
            <div
              className="relative rounded-sm border-2 px-8 py-5 text-center transition-all duration-500"
              style={{
                borderColor: accent,
                boxShadow: `0 0 60px ${accent}40, inset 0 0 40px ${accent}06`,
              }}
            >
              {/* Inner HUD tick marks */}
              {["absolute -left-px -top-px h-4 w-4 border-l border-t", "absolute -right-px -top-px h-4 w-4 border-r border-t", "absolute -bottom-px -left-px h-4 w-4 border-b border-l", "absolute -bottom-px -right-px h-4 w-4 border-b border-r"].map((cls, i) => (
                <div key={i} className={`pointer-events-none ${cls}`} style={{ borderColor: accent }} />
              ))}

              <motion.div
                className="font-display leading-none"
                animate={isExceeded ? { scale: [1, 1.015, 1] } : {}}
                transition={{ duration: 0.25, repeat: Infinity }}
                style={{
                  fontSize: "clamp(5rem, 14vw, 9.5rem)",
                  color: accent,
                  textShadow: `0 0 40px ${accent}, 0 0 80px ${accent}50`,
                  transition: "color 0.5s, text-shadow 0.5s",
                }}
              >
                {displayPct}
              </motion.div>
              <p className="font-mono-tech text-xs uppercase tracking-[0.4em]"
                style={{ color: accent, opacity: 0.6 }}>
                percent sync
              </p>
            </div>

            {/* EXCEEDED banner */}
            {isExceeded && (
              <motion.div
                initial={{ opacity: 0, scaleX: 0.6 }}
                animate={{ opacity: 1, scaleX: 1 }}
                className="w-full rounded-sm border border-[var(--eva-orange)]/50 bg-[var(--eva-orange)]/10 px-4 py-2 text-center"
              >
                <motion.p
                  animate={{ opacity: [1, 0.25, 1] }}
                  transition={{ duration: 0.45, repeat: Infinity }}
                  className="font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-orange)]"
                >
                  {variant.exceededBanner}
                </motion.p>
              </motion.div>
            )}

            {/* Progress bar */}
            <div className="w-full space-y-1.5">
              <div className="relative h-2 overflow-hidden rounded-full bg-white/5">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ backgroundColor: accent, boxShadow: `0 0 10px ${accent}` }}
                  animate={{ width: `${Math.min((syncPct / 400) * 100, 100)}%` }}
                  transition={{ duration: 0.06 }}
                />
                {/* 71.4% threshold marker */}
                <div className="absolute inset-y-0 w-px bg-white/50" style={{ left: `${(71.4 / 400) * 100}%` }} />
              </div>
              <div className="flex justify-between font-mono-tech text-[7px] uppercase tracking-wider text-white/25">
                <span>0%</span>
                <span style={{ color: `${accent}90` }}>71.4% limit</span>
                <span>400%</span>
              </div>
            </div>

            {/* Phase badge */}
            <div className="inline-flex items-center gap-2 rounded-sm border px-3 py-2 transition-all duration-500"
              style={{ borderColor: `${accent}40`, backgroundColor: `${accent}08` }}>
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: accent }} />
              <span className="font-mono-tech text-[9px] uppercase tracking-[0.3em]" style={{ color: accent }}>
                {phase === "boot" ? "▸ SYSTEM BOOT" :
                 phase === "syncing" ? "▸ SYNC IN PROGRESS" :
                 isExceeded ? `▸ ${variant.activeStatus} ALERT` : "▸ SYNC COMPLETE"}
              </span>
            </div>

            {/* Mobile log */}
            <div className="w-full rounded-sm border border-white/5 bg-black/40 p-3 md:hidden">
              {(log.length ? log : ["...BOOTING..."]).slice(0, 3).map((line, i) => (
                <p key={i} className="font-mono-tech text-[8px] leading-5"
                  style={{ color: line.startsWith("!!!") ? "#FF6B1A" : "rgba(255,255,255,0.3)" }}>
                  {line}
                </p>
              ))}
            </div>
          </motion.div>

          {/* Right panel — desktop only */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="hidden space-y-4 md:block"
          >
            <div className="rounded-sm border border-white/10 bg-black/70 p-4 backdrop-blur">
              <p className="mb-4 font-mono-tech text-[8px] uppercase tracking-[0.4em]" style={{ color: accent }}>▸ bio_metrics</p>
              {[
                { label: "A.T. FIELD", val: bars.at, target: 68 },
                { label: "NEURAL LINK", val: bars.neural, target: 89 },
                { label: "BIO-SIGNALS", val: bars.bio, target: 71.4 },
              ].map(({ label, val, target }) => (
                <div key={label} className="mb-4">
                  <div className="mb-1.5 flex justify-between">
                    <span className="font-mono-tech text-[7px] uppercase tracking-[0.2em] text-white/30">{label}</span>
                    <span className="font-mono-tech text-[8px] font-bold" style={{ color: accent }}>
                      {isExceeded ? "OVER" : `${Math.round(val)}%`}
                    </span>
                  </div>
                  <div className="relative h-1.5 overflow-hidden rounded-full bg-white/5">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: accent, boxShadow: `0 0 5px ${accent}` }}
                      animate={{ width: isExceeded ? "100%" : `${(val / target) * 100}%` }}
                      transition={{ duration: 0.15 }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-sm border border-white/5 bg-black/40 p-5 text-center">
              <p className="font-display text-5xl leading-none transition-colors duration-500"
                style={{ color: accent, textShadow: `0 0 20px ${accent}40`, opacity: 0.7 }}>
                NERV
              </p>
              <div className="mt-3 font-mono-tech text-[7px] uppercase tracking-[0.15em] text-white/20">
                <p>GOD'S IN HIS HEAVEN</p>
                <p>ALL'S RIGHT WITH THE WORLD</p>
              </div>
            </div>

            <div className="rounded-sm border border-white/5 bg-black/40 p-4">
              <p className="mb-2 font-mono-tech text-[7px] uppercase tracking-[0.3em] text-white/30">▸ op_time</p>
              <p className="font-display text-3xl transition-colors duration-500" style={{ color: accent }}>
                {opTime}
              </p>
            </div>
          </motion.div>

        </div>
      </div>

      {/* Bottom bar */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-6 py-3 border-t md:px-8"
        style={{ borderTopColor: `${accent}25`, backgroundColor: `${accent}05` }}
      >
        <span className="font-mono-tech text-[8px] uppercase tracking-[0.3em] text-white/25">
          unit_{variant.unit} ▸ {isExceeded ? `${variant.activeStatus} — SYSTEM OVERRIDE ACTIVE` : "eva synchronization sequence"}
        </span>
        <button type="button" onClick={onClose}
          className="font-mono-tech text-[8px] uppercase tracking-[0.3em] text-white/25 transition hover:text-white/50"
        >
          [ESC] abort
        </button>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════
// DISCIPLINES DROPDOWN — submenu que se abre con hover
// ═══════════════════════════════════════════════════════
function DisciplinesMenu({ openCategory, isCategoryActive }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);

  // Pequeño delay al cerrar para que no se cierre si el mouse pasa
  // brevemente fuera del menú al moverse hacia los items.
  function handleEnter() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
  }

  function handleLeave() {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  function handleSelect(categoryId) {
    setOpen(false);
    openCategory(categoryId);
  }

  // Cerrar con tecla Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 font-mono-tech text-xs uppercase tracking-[0.2em] transition",
          isCategoryActive || open
            ? "text-[var(--eva-green)]"
            : "text-slate-400 hover:text-[var(--eva-green)]"
        )}
        aria-haspopup="true"
        aria-expanded={open}
      >
        Disciplinas
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Panel dropdown */}
      <div
        className={cn(
          "absolute left-1/2 top-full z-50 mt-3 w-[420px] -translate-x-1/2 transition-all duration-200",
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
        )}
      >
        {/* Conector invisible para que el hover no se rompa entre botón y panel */}
        <div className="absolute -top-3 left-0 right-0 h-3" />

        <div className="overflow-hidden rounded-sm border border-[var(--eva-green)]/20 bg-[var(--eva-charcoal)]/95 shadow-2xl shadow-black/60 backdrop-blur-xl">
          {/* Esquinas HUD */}
          <div className="pointer-events-none absolute left-0 top-0 h-4 w-4 border-l-2 border-t-2 border-[var(--eva-green)]" />
          <div className="pointer-events-none absolute right-0 top-0 h-4 w-4 border-r-2 border-t-2 border-[var(--eva-green)]" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-[var(--eva-green)]" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-[var(--eva-green)]" />

          <div className="border-b border-white/5 px-4 py-3">
            <p className="font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-green)]">
              ▸ select_unit
            </p>
            <p className="mt-1 font-display text-sm text-white">
              Cuatro disciplinas disponibles
            </p>
          </div>

          <div className="grid grid-cols-2 gap-px bg-white/5">
            {categories.map((category, index) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleSelect(category.id)}
                  className="group relative flex flex-col items-start gap-2 bg-[var(--eva-charcoal)]/95 p-4 text-left transition hover:bg-black/80"
                >
                  <div className="flex w-full items-start justify-between gap-2">
                    <div
                      className={cn(
                        "grid h-9 w-9 place-items-center rounded-sm bg-gradient-to-br",
                        category.color
                      )}
                    >
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-mono-tech text-[9px] uppercase tracking-wider text-slate-600">
                      0{index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="font-display text-base leading-none text-white">
                      {category.label}
                    </p>
                    <p className="mt-1 font-mono-tech text-[9px] uppercase tracking-wider text-slate-500">
                      {category.shortLabel}
                    </p>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-[1.4] text-slate-400">
                    {category.description}
                  </p>
                  <span
                    className={cn(
                      "mt-1 flex items-center gap-1 font-mono-tech text-[9px] uppercase tracking-wider transition",
                      category.text
                    )}
                  >
                    Acceder
                    <ChevronRight className="h-2.5 w-2.5 transition group-hover:translate-x-0.5" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// HEADER — sticky + compacto al hacer scroll
// ═══════════════════════════════════════════════════════
function Header({ page, setPage, openCategory, cartCount, onOpenCart, onOpenSearch, onOpenBuild }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 16);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [page]);

  // Ctrl+K / Cmd+K abre la búsqueda global
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        onOpenSearch();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenSearch]);

  const navButton = (targetPage, label) => (
    <button
      type="button"
      onClick={() => setPage(targetPage)}
      className={cn(
        "font-mono-tech text-xs uppercase tracking-[0.2em] transition",
        page === targetPage
          ? "text-[var(--eva-green)]"
          : "text-slate-400 hover:text-[var(--eva-green)]"
      )}
    >
      {label}
    </button>
  );

  function handleMobileCategory(categoryId) {
    setMobileOpen(false);
    openCategory(categoryId);
  }

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40",
          // Solo animamos colores/opacidad — NO altura ni padding,
          // porque cambiar la altura mientras se scrollea causa "rebote"
          // y trabazón. El header mantiene siempre el mismo tamaño.
          "transition-colors duration-300",
          scrolled
            ? "border-b border-[var(--eva-green)]/15 bg-black/85 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl"
            : "border-b border-white/5 bg-black/40 backdrop-blur-md"
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 md:px-8">
          <button
            type="button"
            onClick={() => setPage("home")}
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <img
              src={`${BASE_URL}logo-gcwm.png`}
              alt="GCWM"
              className="h-11 w-auto object-contain md:h-12"
            />
            <div className="hidden flex-col leading-none md:flex">
              <span className="font-display text-lg text-white">GCWM</span>
              <span className="font-mono-tech text-[10px] uppercase tracking-[0.25em] text-[var(--eva-green)]">
                ▸ unit_01 active
              </span>
            </div>
          </button>

          <nav className="hidden items-center gap-5 lg:flex">
            {navButton("home", "Inicio")}
            <DisciplinesMenu openCategory={openCategory} isCategoryActive={page === "category"} />
            {navButton("shop", "Tienda")}
            {navButton("professionals", "Profesionales")}
            {navButton("community", "Comunidad")}
            {navButton("tools", "Herramientas")}
            <button
              type="button"
              onClick={onOpenBuild}
              className="font-mono-tech text-xs uppercase tracking-[0.2em] text-[var(--eva-orange)] transition-colors hover:text-white"
            >
              Build ▸
            </button>
          </nav>

          <div className="flex items-center gap-3">
            {/* Botón de búsqueda global */}
            <button
              type="button"
              onClick={onOpenSearch}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 p-2.5 transition-colors hover:border-[var(--eva-green)]/50 hover:bg-[var(--eva-green)]/5"
              aria-label="Buscar"
            >
              <Search className="h-4 w-4" />
              <span className="hidden font-mono-tech text-[10px] uppercase tracking-wider text-slate-500 md:inline">⌘K</span>
            </button>
            <button
              type="button"
              onClick={onOpenCart}
              className="relative rounded-lg border border-white/10 bg-black/40 p-2.5 transition-colors hover:border-[var(--eva-green)]/50 hover:bg-[var(--eva-green)]/5"
              aria-label="Abrir carrito"
            >
              <ShoppingBag className="h-4 w-4" />
              {cartCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[var(--eva-orange)] text-[10px] font-black text-black shadow-[0_0_12px_var(--eva-orange-glow)]">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSyncOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-[var(--eva-green)]/40 bg-[var(--eva-green)]/10 px-2.5 py-2.5 font-mono-tech text-xs uppercase tracking-[0.15em] text-[var(--eva-green)] transition-colors hover:bg-[var(--eva-green)]/20 md:px-4 md:py-2"
            >
              <Sparkles className="h-4 w-4 lg:hidden" />
              <span className="hidden lg:inline">Sync ▸</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="rounded-lg border border-white/10 bg-black/40 p-2.5 transition-colors hover:border-[var(--eva-green)]/50 hover:bg-[var(--eva-green)]/5 lg:hidden"
              aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {syncOpen && <SyncModal onClose={() => setSyncOpen(false)} />}

      {/* Menú móvil */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[45] md:hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="absolute right-0 top-0 flex h-full w-72 flex-col border-l border-[var(--eva-green)]/20 bg-[var(--eva-charcoal)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <span className="font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-green)]">
                ▸ navegación
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-sm border border-white/10 bg-black/60 text-slate-400 transition hover:text-white"
                aria-label="Cerrar menú"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto p-4">
              <button
                type="button"
                onClick={() => setPage("home")}
                className={cn(
                  "flex w-full items-center rounded-sm px-4 py-3 font-mono-tech text-xs uppercase tracking-[0.2em] transition",
                  page === "home"
                    ? "bg-[var(--eva-green)]/10 text-[var(--eva-green)]"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                Inicio
              </button>

              <div>
                <p className="px-4 py-2 font-mono-tech text-[10px] uppercase tracking-[0.25em] text-slate-600">
                  Disciplinas
                </p>
                {categories.map((cat) => {
                  const CatIcon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleMobileCategory(cat.id)}
                      className="flex w-full items-center gap-3 rounded-sm px-4 py-3 text-slate-400 transition hover:bg-white/5 hover:text-white"
                    >
                      <CatIcon className={cn("h-4 w-4", cat.text)} />
                      <span className="font-mono-tech text-xs uppercase tracking-[0.2em]">{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setPage("shop")}
                className={cn(
                  "flex w-full items-center rounded-sm px-4 py-3 font-mono-tech text-xs uppercase tracking-[0.2em] transition",
                  page === "shop"
                    ? "bg-[var(--eva-green)]/10 text-[var(--eva-green)]"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                Tienda
              </button>

              <button
                type="button"
                onClick={() => setPage("professionals")}
                className={cn(
                  "flex w-full items-center rounded-sm px-4 py-3 font-mono-tech text-xs uppercase tracking-[0.2em] transition",
                  page === "professionals"
                    ? "bg-[var(--eva-green)]/10 text-[var(--eva-green)]"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                Profesionales
              </button>

              <button
                type="button"
                onClick={() => setPage("community")}
                className={cn(
                  "flex w-full items-center rounded-sm px-4 py-3 font-mono-tech text-xs uppercase tracking-[0.2em] transition",
                  page === "community"
                    ? "bg-[var(--eva-green)]/10 text-[var(--eva-green)]"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                Comunidad
              </button>

              <button
                type="button"
                onClick={() => setPage("tools")}
                className={cn(
                  "flex w-full items-center gap-3 rounded-sm px-4 py-3 font-mono-tech text-xs uppercase tracking-[0.2em] transition",
                  page === "tools"
                    ? "bg-[var(--eva-green)]/10 text-[var(--eva-green)]"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <Wrench className="h-4 w-4" />
                Herramientas
              </button>

              <button
                type="button"
                onClick={() => { setMobileOpen(false); onOpenBuild(); }}
                className="flex w-full items-center gap-3 rounded-sm border border-[var(--eva-orange)]/30 bg-[var(--eva-orange)]/5 px-4 py-3 font-mono-tech text-xs uppercase tracking-[0.2em] text-[var(--eva-orange)] transition hover:bg-[var(--eva-orange)]/10"
              >
                <Wand2 className="h-4 w-4" />
                Armá tu build
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════
// COURSE CARD
// ═══════════════════════════════════════════════════════
function CourseCard({ tutorial }) {
  const category = getCategory(tutorial.category);
  const hasVideo = Boolean(tutorial.youtubeId);
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-white/5 bg-gradient-to-b from-[var(--eva-charcoal)] to-black transition hover:border-[var(--eva-green)]/30 hover:shadow-[0_0_30px_rgba(168,255,96,0.1)]">
      <div className={cn("relative aspect-video overflow-hidden bg-gradient-to-br p-4", category.color)}>
        <div className="absolute inset-0 eva-grid-bg opacity-40" />
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-sm bg-black/60 px-2 py-1 font-mono-tech text-[10px] uppercase tracking-wider text-[var(--eva-green)] backdrop-blur">
              {hasVideo ? tutorial.tag : "Próximamente"}
            </span>
            <span className="rounded-sm bg-black/40 px-2 py-1 font-mono-tech text-[10px] uppercase tracking-wider backdrop-blur">
              {tutorial.vibe}
            </span>
          </div>
          <PlayCircle className={cn("h-12 w-12 drop-shadow-lg transition", hasVideo ? "text-white group-hover:scale-110" : "text-white/40")} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-center gap-2 font-mono-tech text-[10px] uppercase tracking-wider text-slate-500">
          <span>{category.label}</span>
          <span className="text-slate-700">/</span>
          <span>{tutorial.duration}</span>
        </div>
        <h3 className="line-clamp-3 min-h-[3.5rem] font-display text-xl leading-tight text-white">{tutorial.title}</h3>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/5 pt-4">
          <span className="font-mono-tech text-[10px] uppercase tracking-wider text-slate-400">{tutorial.level}</span>
          <span className="font-mono-tech text-[10px] font-bold text-[var(--eva-orange)]">★ {tutorial.rating}</span>
        </div>
      </div>
    </article>
  );
}

// ═══════════════════════════════════════════════════════
// HOME PAGE
// ═══════════════════════════════════════════════════════
function HomePage({ setPage, openCategory }) {
  return (
    <>
      {/* HERO */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-20 pt-12 md:px-8 md:pb-32 md:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="mb-6 inline-flex items-center gap-3 rounded-sm border border-[var(--eva-green)]/30 bg-black/60 px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-[var(--eva-green)] eva-pulse shadow-[0_0_8px_var(--eva-green-glow)]" />
              <span className="font-mono-tech text-[10px] uppercase tracking-[0.25em] text-[var(--eva-green)]">
                gcwm.system ▸ online
              </span>
            </div>

            <h1 className="font-display text-4xl leading-[0.9] tracking-tight text-white sm:text-6xl md:text-8xl">
              Forjá tu <br />
              <span className="text-[var(--eva-green)] eva-glow-green">alter ego.</span>
            </h1>

            <p className="mt-8 max-w-xl text-base leading-7 text-slate-400 md:text-lg">
              Cosplay, props, pelucas y electrónica. Aprendé desde cero o llevá tu nivel a profesional.
              Materiales, expertos y comunidad — todo en un mismo lugar.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => openCategory("pelucas")}
                className="inline-flex items-center justify-center gap-2 rounded-sm bg-[var(--eva-green)] px-6 py-4 font-mono-tech text-xs font-bold uppercase tracking-[0.2em] text-black shadow-[0_0_30px_var(--eva-green-glow)] transition hover:-translate-y-0.5 hover:shadow-[0_0_40px_var(--eva-green-glow)]"
              >
                <PlayCircle className="h-4 w-4" />
                Iniciar entrenamiento
              </button>
              <button
                type="button"
                onClick={() => setPage("shop")}
                className="inline-flex items-center justify-center gap-2 rounded-sm border border-[var(--eva-orange)]/40 bg-[var(--eva-orange)]/5 px-6 py-4 font-mono-tech text-xs font-bold uppercase tracking-[0.2em] text-[var(--eva-orange)] transition hover:-translate-y-0.5 hover:bg-[var(--eva-orange)]/10"
              >
                Equipamiento
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-14 grid max-w-xl grid-cols-3 gap-px overflow-hidden rounded-sm border border-white/5 bg-white/5">
              {[
                { value: "+120", label: "cursos" },
                { value: "4.9/5", label: "rating" },
                { value: "+2K", label: "insumos" },
              ].map((stat) => (
                <div key={stat.label} className="bg-black/80 px-4 py-5 text-center">
                  <p className="font-display text-2xl text-[var(--eva-green)]">{stat.value}</p>
                  <p className="mt-1 font-mono-tech text-[10px] uppercase tracking-[0.2em] text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="relative"
          >
            <div className="absolute -inset-8 rounded-[2rem] bg-gradient-to-br from-[var(--eva-purple)]/40 via-transparent to-[var(--eva-green)]/20 blur-3xl" />

            <div className="relative overflow-hidden rounded-sm border border-[var(--eva-green)]/20 bg-black shadow-2xl shadow-black/60">
              <div className="pointer-events-none absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-[var(--eva-green)]" />
              <div className="pointer-events-none absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-[var(--eva-green)]" />
              <div className="pointer-events-none absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-[var(--eva-green)]" />
              <div className="pointer-events-none absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-[var(--eva-green)]" />

              <div className="relative aspect-video overflow-hidden bg-black">
                {/* Video de fondo */}
                <iframe
                  src="https://www.youtube.com/embed/CMF3qeu7fHY?autoplay=1&mute=1&loop=1&playlist=CMF3qeu7fHY&controls=0&rel=0&modestbranding=1"
                  className="absolute inset-0 h-full w-full scale-110"
                  allow="autoplay; encrypted-media; fullscreen"
                  allowFullScreen
                  title="GCWM — featured video"
                />
                {/* HUD encima */}
                <div className="absolute inset-0 bg-black/30 eva-scanline" />
                <div className="absolute inset-0 eva-grid-bg opacity-20" />
                <div className="relative flex h-full flex-col justify-between p-6 md:p-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 rounded-sm border border-[var(--eva-orange)]/40 bg-black/50 px-3 py-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--eva-orange)] eva-pulse" />
                      <span className="font-mono-tech text-[10px] uppercase tracking-[0.2em] text-[var(--eva-orange)]">REC ▸ destacado</span>
                    </div>
                    <PlayCircle className="h-7 w-7 text-[var(--eva-green)]" />
                  </div>

                  <div>
                    <p className="mb-3 font-mono-tech text-[11px] uppercase tracking-[0.25em] text-[var(--eva-green)]">
                      Curso gratuito · Tech Props
                    </p>
                    <h2 className="font-display text-3xl leading-none text-white drop-shadow-[0_0_20px_rgba(168,255,96,0.3)] md:text-5xl">
                      Forjá tu primer <br />
                      <span className="text-[var(--eva-green)]">prop con LEDs</span>
                    </h2>
                    <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300">
                      Luces, materiales, magia visual y armado paso a paso.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => openCategory("electronica")}
                    className="flex w-fit items-center gap-2 rounded-sm bg-[var(--eva-green)] px-4 py-3 font-mono-tech text-[11px] font-bold uppercase tracking-[0.2em] text-black transition hover:bg-white"
                  >
                    <PlayCircle className="h-4 w-4" />
                    Reproducir
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-sm border border-white/5 bg-black/60 px-4 py-3">
              <span className="font-mono-tech text-[10px] uppercase tracking-[0.2em] text-slate-500">▸ stream_active</span>
              <span className="flex items-center gap-1.5 font-mono-tech text-[10px] uppercase tracking-[0.2em] text-[var(--eva-orange)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--eva-orange)] eva-pulse" />
                live_preview
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* EVENTO PRÓXIMO */}
      <EventCountdown />

      {/* CATEGORÍAS */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="font-mono-tech text-[11px] uppercase tracking-[0.3em] text-[var(--eva-green)]">
              ▸ select_protocol
            </p>
            <h2 className="mt-2 font-display text-4xl tracking-tight text-white md:text-6xl">
              Cuatro disciplinas. <br />
              <span className="text-[var(--eva-orange)] eva-glow-orange">Un mismo taller.</span>
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-400">
            Cada categoría es un mundo: cursos, materiales y profesionales. Tocá una para entrar.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <motion.button
                key={category.id}
                type="button"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                onClick={() => openCategory(category.id)}
                className="group relative flex flex-col overflow-hidden rounded-sm border border-white/10 bg-gradient-to-b from-[var(--eva-charcoal)] to-black p-6 text-left transition hover:-translate-y-1"
                style={{ '--accent': category.accent }}
              >
                <div
                  className="absolute inset-0 rounded-sm opacity-100 transition md:opacity-0 md:group-hover:opacity-100"
                  style={{ boxShadow: `inset 0 0 0 1px ${category.accent}` }}
                />

                <p className="font-mono-tech text-[10px] uppercase tracking-[0.25em] text-slate-600">
                  ▸ unit_0{index + 1}
                </p>

                <div className={cn("mt-6 mb-6 grid h-14 w-14 place-items-center rounded-sm bg-gradient-to-br", category.color)}>
                  <Icon className="h-7 w-7 text-white drop-shadow-lg" />
                </div>

                <p className="font-mono-tech text-[10px] uppercase tracking-[0.25em] text-slate-500">
                  {category.shortLabel}
                </p>
                <h3 className="mt-1 font-display text-2xl text-white">{category.label}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{category.description}</p>

                <div className="mt-auto flex items-center gap-2 pt-6 font-mono-tech text-[11px] uppercase tracking-[0.2em] text-white/60 transition group-hover:text-white">
                  Acceder
                  <ChevronRight className="h-3 w-3 transition group-hover:translate-x-1" />
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* TUTORIALES DESTACADOS */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
        <div className="rounded-sm border border-white/5 bg-gradient-to-b from-[var(--eva-charcoal)]/60 to-black/60 p-6 md:p-10">
          <div className="mb-10 flex flex-col items-start justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="font-mono-tech text-[11px] uppercase tracking-[0.3em] text-[var(--eva-green)]">
                ▸ free_archive
              </p>
              <h2 className="mt-2 font-display text-4xl tracking-tight text-white md:text-6xl">
                Misiones destacadas
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                Tutoriales gratuitos curados por GCWM. Empezá por acá.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openCategory("electronica")}
              className="rounded-sm border border-[var(--eva-green)]/40 bg-[var(--eva-green)]/5 px-5 py-3 font-mono-tech text-xs uppercase tracking-[0.2em] text-[var(--eva-green)] transition hover:bg-[var(--eva-green)]/10"
            >
              Ver todas ▸
            </button>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {tutorials.slice(0, 4).map((tutorial) => (
              <CourseCard key={tutorial.title} tutorial={tutorial} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

// ═══════════════════════════════════════════════════════
// CATEGORY PAGE
// ═══════════════════════════════════════════════════════
function CategoryPage({ activeCategoryId, setPage, openCategory }) {
  const category = getCategory(activeCategoryId);
  const Icon = category.icon;
  const categoryTutorials = tutorials.filter((item) => item.category === category.id);
  const categoryProducts = shopItems.filter((item) => item.category === category.id);
  const categoryPros = professionals.filter((item) => item.category === category.id);

  return (
    <section className="relative z-10 mx-auto max-w-7xl px-5 pb-20 pt-8 md:px-8">
      <button
        type="button"
        onClick={() => setPage("home")}
        className="mb-8 font-mono-tech text-[11px] uppercase tracking-[0.25em] text-slate-500 transition hover:text-[var(--eva-green)]"
      >
        ◂ volver al sistema
      </button>

      <div className={cn("relative overflow-hidden rounded-sm border border-white/10 bg-gradient-to-br p-8 shadow-2xl shadow-black/40 md:p-12", category.color)}>
        <div className="absolute inset-0 eva-grid-bg opacity-30" />
        <div className="pointer-events-none absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-white/40" />
        <div className="pointer-events-none absolute right-0 top-0 h-8 w-8 border-r-2 border-t-2 border-white/40" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-white/40" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-white/40" />

        <div className="relative grid gap-8 lg:grid-cols-[1fr_0.75fr] lg:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-sm border border-white/30 bg-black/40 px-3 py-1.5 backdrop-blur">
              <Icon className="h-3.5 w-3.5" />
              <span className="font-mono-tech text-[10px] uppercase tracking-[0.25em] text-white">
                ▸ {category.shortLabel}
              </span>
            </div>
            <h1 className="font-display text-4xl leading-none tracking-tight drop-shadow-[0_0_20px_rgba(0,0,0,0.6)] sm:text-6xl md:text-8xl">
              {category.label}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-white/90 md:text-lg">{category.longDescription}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#categoria-cursos"
                className="inline-flex items-center justify-center gap-2 rounded-sm bg-white px-5 py-3.5 font-mono-tech text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:bg-[var(--eva-green)]"
              >
                <PlayCircle className="h-4 w-4" />
                Ver cursos
              </a>
              <button
                type="button"
                onClick={() => setPage("shop")}
                className="inline-flex items-center justify-center gap-2 rounded-sm border border-white/30 bg-black/30 px-5 py-3.5 font-mono-tech text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-black/50"
              >
                <ShoppingBag className="h-4 w-4" />
                Insumos
              </button>
            </div>
          </div>

          <div className="rounded-sm border border-white/20 bg-black/40 p-5 backdrop-blur">
            <div className="grid aspect-video place-items-center rounded-sm bg-black/40">
              <Icon className="h-20 w-20 text-white drop-shadow-2xl" />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-sm bg-white/10">
              <div className="bg-black/60 p-3 text-center">
                <p className="font-display text-2xl text-white">{categoryTutorials.length}</p>
                <p className="font-mono-tech text-[9px] uppercase tracking-wider text-white/60">cursos</p>
              </div>
              <div className="bg-black/60 p-3 text-center">
                <p className="font-display text-2xl text-white">{categoryProducts.length}</p>
                <p className="font-mono-tech text-[9px] uppercase tracking-wider text-white/60">productos</p>
              </div>
              <div className="bg-black/60 p-3 text-center">
                <p className="font-display text-2xl text-white">4.9</p>
                <p className="font-mono-tech text-[9px] uppercase tracking-wider text-white/60">rating</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-4">
        {categories.map((item) => {
          const ItemIcon = item.icon;
          const isActive = item.id === category.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => openCategory(item.id)}
              className={cn(
                "rounded-sm border p-4 text-left transition hover:-translate-y-0.5",
                isActive ? cn(item.border, item.bg) : "border-white/5 bg-black/40 hover:border-white/20"
              )}
            >
              <ItemIcon className={cn("mb-2 h-5 w-5 shrink-0", isActive ? item.text : "text-slate-500")} />
              <p className="line-clamp-1 font-display text-lg text-white">{item.label}</p>
              <p className="truncate font-mono-tech text-[10px] uppercase tracking-wider text-slate-500">{item.shortLabel}</p>
            </button>
          );
        })}
      </div>

      <div id="categoria-cursos" className="mt-12 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-sm border border-white/5 bg-gradient-to-b from-[var(--eva-charcoal)]/60 to-black/60 p-6 md:p-8">
          <p className={cn("font-mono-tech text-[11px] uppercase tracking-[0.3em]", category.text)}>▸ cursos</p>
          <h2 className="mt-2 mb-8 font-display text-3xl text-white md:text-4xl">Rutas de aprendizaje</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {categoryTutorials.map((tutorial) => (
              <CourseCard key={tutorial.title} tutorial={tutorial} />
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-sm border border-white/5 bg-gradient-to-b from-[var(--eva-charcoal)]/60 to-black/60 p-6">
            <p className={cn("font-mono-tech text-[11px] uppercase tracking-[0.3em]", category.text)}>▸ shop</p>
            <h3 className="mt-2 font-display text-2xl text-white">Insumos para {category.shortLabel}</h3>
            <div className="mt-5 space-y-2">
              {categoryProducts.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPage("shop")}
                  className="flex w-full items-center justify-between gap-3 rounded-sm border border-white/5 bg-black/40 p-3 text-left transition hover:border-white/20 hover:bg-black/60"
                >
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-bold text-white">{item.name}</p>
                    <p className="line-clamp-2 text-xs text-slate-500">{item.description}</p>
                  </div>
                  <span className="shrink-0 whitespace-nowrap font-mono-tech text-xs font-bold text-[var(--eva-green)]">{formatPrice(item.price)}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-sm border border-white/5 bg-gradient-to-b from-[var(--eva-charcoal)]/60 to-black/60 p-6">
            <p className={cn("font-mono-tech text-[11px] uppercase tracking-[0.3em]", category.text)}>▸ profesionales</p>
            <h3 className="mt-2 font-display text-2xl text-white">Especialistas</h3>
            <div className="mt-5 space-y-3">
              {(categoryPros.length ? categoryPros : professionals.slice(0, 2)).map((pro) => (
                <div key={pro.name} className="flex items-center gap-3 rounded-sm border border-white/5 bg-black/40 p-3">
                  <div className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-sm bg-gradient-to-br font-display text-lg text-white", category.color)}>
                    {pro.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-bold text-white">{pro.name}</p>
                    <p className="truncate font-mono-tech text-[10px] uppercase tracking-wider text-slate-500">{pro.role}</p>
                    <p className="font-mono-tech text-[10px] font-bold text-[var(--eva-orange)]">★ {pro.rating}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════
// SHOP PAGE
// ═══════════════════════════════════════════════════════
function ShopPage({ cart, setCart, wishlist, toggleWishlist }) {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("todos");

  const filteredProducts = useMemo(() => {
    return shopItems.filter((item) => {
      const matchesQuery = item.name.toLowerCase().includes(query.toLowerCase());
      const matchesSector = sector === "todos" || item.category === sector;
      return matchesQuery && matchesSector;
    });
  }, [query, sector]);

  const cartLines = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const product = shopItems.find((item) => item.id === id);
        return product ? { ...product, qty } : null;
      })
      .filter(Boolean);
  }, [cart]);

  const total = cartLines.reduce((sum, item) => sum + item.price * item.qty, 0);
  const itemCount = cartLines.reduce((sum, item) => sum + item.qty, 0);
  const lineBreak = String.fromCharCode(10);
  const whatsappMessage = encodeURIComponent([
    "Hola! Quiero hacer este pedido en GCWM:",
    "",
    ...cartLines.map((item) => `- ${item.qty} x ${item.name} (${formatPrice(item.price)})`),
    "",
    `Total estimado: ${formatPrice(total)}`,
    "",
    "Me confirmas stock y envio?",
  ].join(lineBreak));

  function addToCart(productId) {
    setCart((current) => ({ ...current, [productId]: (current[productId] || 0) + 1 }));
  }

  function changeQty(productId, delta) {
    setCart((current) => {
      const nextQty = (current[productId] || 0) + delta;
      const next = { ...current };
      if (nextQty <= 0) delete next[productId];
      else next[productId] = nextQty;
      return next;
    });
  }

  return (
    <section className="relative z-10 mx-auto max-w-7xl px-5 pb-20 pt-8 md:px-8">
      <div className="mb-10 grid gap-6 lg:grid-cols-[1fr_0.45fr] lg:items-end">
        <div>
          <div className="mb-5 inline-flex items-center gap-3 rounded-sm border border-[var(--eva-green)]/30 bg-black/60 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-[var(--eva-green)] eva-pulse" />
            <span className="font-mono-tech text-[10px] uppercase tracking-[0.25em] text-[var(--eva-green)]">
              ▸ shop_terminal
            </span>
          </div>
          <h1 className="font-display text-4xl tracking-tight text-white sm:text-6xl md:text-8xl">
            Equipamiento <br />
            <span className="text-[var(--eva-orange)] eva-glow-orange">de combate.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400">
            Materiales seleccionados por GCWM. Carrito directo a WhatsApp para confirmar stock, pago y envío.
          </p>
        </div>
        <div className="rounded-sm border border-[var(--eva-green)]/20 bg-gradient-to-br from-[var(--eva-charcoal)] to-black p-5">
          <p className="font-mono-tech text-[10px] uppercase tracking-[0.25em] text-[var(--eva-green)]">▸ carrito_activo</p>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="font-display text-4xl text-white">{itemCount}</p>
              <p className="font-mono-tech text-[10px] uppercase tracking-wider text-slate-500">items</p>
            </div>
            <p className="font-display text-2xl text-[var(--eva-green)] eva-glow-green">{formatPrice(total)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.7fr_1.45fr_0.85fr]">
        <aside className="h-fit rounded-sm border border-white/5 bg-gradient-to-b from-[var(--eva-charcoal)]/60 to-black/60 p-5">
          <p className="mb-4 font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-green)]">▸ sectores</p>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setSector("todos")}
              className={cn(
                "flex w-full items-center gap-3 rounded-sm border px-4 py-3 text-left transition",
                sector === "todos"
                  ? "border-[var(--eva-green)]/40 bg-[var(--eva-green)]/5 text-[var(--eva-green)]"
                  : "border-white/5 bg-black/40 text-slate-400 hover:border-white/20"
              )}
            >
              <div className="flex-1">
                <p className="text-sm font-bold text-white">Todos</p>
                <p className="font-mono-tech text-[10px] uppercase tracking-wider text-slate-500">sectores</p>
              </div>
              <span className="font-mono-tech text-xs text-slate-400">{shopItems.length}</span>
            </button>
            {categories.map((cat) => {
              const Icon = cat.icon;
              const count = shopItems.filter((item) => item.category === cat.id).length;
              const isActive = sector === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSector(cat.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-sm border px-4 py-3 text-left transition",
                    isActive ? cn(cat.border, cat.bg) : "border-white/5 bg-black/40 hover:border-white/20"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? cat.text : "text-slate-500")} />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{cat.label}</p>
                    <p className="font-mono-tech text-[10px] uppercase tracking-wider text-slate-500">{cat.shortLabel}</p>
                  </div>
                  <span className="font-mono-tech text-xs text-slate-400">{count}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <div>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 items-center gap-3 rounded-sm border border-white/10 bg-black/60 px-4 py-3">
              <Search className="h-4 w-4 text-[var(--eva-green)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar: peluca, LED, EVA, pintura..."
                className="w-full bg-transparent font-mono-tech text-xs uppercase tracking-wider outline-none placeholder:text-slate-600"
              />
            </div>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="rounded-sm border border-white/10 bg-black/40 px-4 py-3 font-mono-tech text-xs uppercase tracking-wider text-slate-400 transition hover:bg-black/60"
            >
              Limpiar
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((item) => {
              const cat = getCategory(item.category);
              return (
                <article
                  key={item.id}
                  className="flex flex-col rounded-sm border border-white/5 bg-gradient-to-b from-[var(--eva-charcoal)] to-black p-4 transition hover:-translate-y-1 hover:border-white/20"
                >
                  <div className={cn("relative mb-4 aspect-square overflow-hidden rounded-sm bg-gradient-to-br p-3", cat.color)}>
                    <div className="absolute inset-0 eva-grid-bg opacity-30" />
                    <div className="relative flex h-full flex-col justify-between">
                      <span className="w-fit rounded-sm bg-black/60 px-2 py-1 font-mono-tech text-[9px] uppercase tracking-wider text-white backdrop-blur">
                        {item.badge}
                      </span>
                      <ShoppingBag className="h-10 w-10 text-white/80" />
                    </div>
                    {/* Botón wishlist */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleWishlist(item.id); }}
                      className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-sm border border-white/20 bg-black/60 text-white/60 transition hover:text-white"
                      aria-label={wishlist.has(item.id) ? "Quitar de guardados" : "Guardar"}
                    >
                      <Heart
                        className="h-3.5 w-3.5"
                        fill={wishlist.has(item.id) ? "var(--eva-orange)" : "none"}
                        stroke={wishlist.has(item.id) ? "var(--eva-orange)" : "currentColor"}
                      />
                    </button>
                  </div>
                  <p className={cn("font-mono-tech text-[10px] uppercase tracking-[0.2em]", cat.text)}>{item.sector}</p>
                  <h3 className="mt-2 line-clamp-2 min-h-[2.5rem] text-base font-bold leading-tight text-white">{item.name}</h3>
                  <p className="mt-2 flex-1 text-xs leading-5 text-slate-500">{item.description}</p>

                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/5 pt-4">
                    <span className="whitespace-nowrap font-display text-xl text-[var(--eva-green)]">{formatPrice(item.price)}</span>
                    <button
                      type="button"
                      onClick={() => addToCart(item.id)}
                      className="shrink-0 rounded-sm bg-[var(--eva-green)] px-3 py-2 font-mono-tech text-[10px] font-bold uppercase tracking-wider text-black transition hover:bg-white"
                    >
                      Agregar +
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="rounded-sm border border-dashed border-white/10 bg-black/40 p-12 text-center">
              <p className="font-mono-tech text-xs uppercase tracking-[0.25em] text-slate-500">▸ sin resultados</p>
              <p className="mt-2 text-sm text-slate-400">Probá con otra búsqueda o cambiá el sector.</p>
            </div>
          )}
        </div>

        <aside className="h-fit rounded-sm border border-[var(--eva-green)]/20 bg-gradient-to-b from-[var(--eva-charcoal)] to-black p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-green)]">▸ pedido</p>
              <h2 className="mt-1 font-display text-2xl text-white">Carrito</h2>
            </div>
            <ShoppingBag className="h-5 w-5 text-[var(--eva-green)]" />
          </div>

          {cartLines.length === 0 ? (
            <div className="rounded-sm border border-dashed border-white/10 bg-black/40 p-5 text-center">
              <p className="font-display text-lg text-white">Carrito vacío</p>
              <p className="mt-2 font-mono-tech text-[10px] uppercase tracking-wider text-slate-500">
                agregá items para empezar
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {cartLines.map((item) => (
                <div key={item.id} className="rounded-sm border border-white/5 bg-black/40 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white">{item.name}</p>
                      <p className="font-mono-tech text-[10px] text-slate-500">{formatPrice(item.price)} c/u</p>
                    </div>
                    <p className="font-mono-tech text-xs font-bold text-[var(--eva-green)]">
                      {formatPrice(item.price * item.qty)}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => changeQty(item.id, -1)}
                        className="grid h-7 w-7 place-items-center rounded-sm border border-white/10 bg-black/60 font-bold text-white hover:border-white/30"
                      >
                        −
                      </button>
                      <span className="w-6 text-center font-mono-tech text-xs text-white">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => changeQty(item.id, 1)}
                        className="grid h-7 w-7 place-items-center rounded-sm border border-white/10 bg-black/60 font-bold text-white hover:border-white/30"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => changeQty(item.id, -item.qty)}
                      className="font-mono-tech text-[10px] uppercase tracking-wider text-slate-500 hover:text-[var(--eva-orange)]"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 border-t border-white/10 pt-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono-tech text-[10px] uppercase tracking-[0.25em] text-slate-400">total</span>
              <span className="font-display text-2xl text-[var(--eva-green)] eva-glow-green">{formatPrice(total)}</span>
            </div>
            <a
              href={cartLines.length ? `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}` : undefined}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "flex items-center justify-center gap-2 rounded-sm px-4 py-4 font-mono-tech text-xs font-bold uppercase tracking-[0.2em] transition",
                cartLines.length
                  ? "bg-[var(--eva-green)] text-black shadow-[0_0_30px_var(--eva-green-glow)] hover:bg-white"
                  : "pointer-events-none bg-white/5 text-slate-600"
              )}
            >
              <MessageCircle className="h-4 w-4" />
              Enviar por WhatsApp
            </a>
          </div>
        </aside>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════
// LIGHTBOX — foto en grande con navegación
// ═══════════════════════════════════════════════════════
function Lightbox({ images, startIndex, onClose }) {
  const [index, setIndex] = useState(startIndex);

  const go = (delta) => {
    setIndex((prev) => {
      const next = prev + delta;
      if (next < 0) return images.length - 1;
      if (next >= images.length) return 0;
      return next;
    });
  };

  // Navegación con teclado
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop — click cierra el lightbox (vuelve a la galería) */}
      <button
        type="button"
        aria-label="Cerrar foto"
        onClick={onClose}
        className="absolute inset-0 bg-black/95"
      />

      {/* Contador */}
      <div className="absolute left-1/2 top-5 z-10 -translate-x-1/2 rounded-sm border border-white/10 bg-black/70 px-3 py-1.5 font-mono-tech text-[11px] uppercase tracking-[0.25em] text-[var(--eva-green)] backdrop-blur">
        {index + 1} / {images.length}
      </div>

      {/* Botón cerrar */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 z-10 grid h-10 w-10 place-items-center rounded-sm border border-white/10 bg-black/70 text-white transition hover:border-[var(--eva-green)]/50 hover:bg-black/90 hover:text-[var(--eva-green)]"
        aria-label="Cerrar"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Foto en grande */}
      <div className="relative z-10 max-h-[85vh] max-w-[90vw]">
        <img
          src={images[index]}
          alt={`Foto ${index + 1}`}
          className="max-h-[85vh] max-w-[90vw] object-contain"
        />
      </div>

      {/* Flechas de navegación (solo si hay más de 1 foto) */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); go(-1); }}
            className="absolute left-2 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-sm border border-white/10 bg-black/70 text-white transition hover:border-[var(--eva-green)]/50 hover:bg-black/90 hover:text-[var(--eva-green)] md:left-5 md:h-12 md:w-12"
            aria-label="Foto anterior"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); go(1); }}
            className="absolute right-2 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-sm border border-white/10 bg-black/70 text-white transition hover:border-[var(--eva-green)]/50 hover:bg-black/90 hover:text-[var(--eva-green)] md:right-5 md:h-12 md:w-12"
            aria-label="Foto siguiente"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// GALLERY MODAL — grid de todas las fotos del profesional
// ═══════════════════════════════════════════════════════
function GalleryModal({ pro, onClose }) {
  const [lightboxIndex, setLightboxIndex] = useState(null); // null = cerrado, n = abierto en foto n
  const images = pro.gallery || [];
  const category = getCategory(pro.category);

  // Cerrar con Escape (solo el modal, si el lightbox está abierto se ocupa él)
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && lightboxIndex === null) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, onClose]);

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop — click cierra la galería */}
        <button
          type="button"
          aria-label="Cerrar galería"
          onClick={onClose}
          className="absolute inset-0 bg-black/90"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-sm border border-[var(--eva-green)]/30 bg-gradient-to-b from-[var(--eva-charcoal)] to-black shadow-2xl shadow-black/80"
        >
          {/* Esquinas HUD */}
          <div className="pointer-events-none absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-[var(--eva-green)]" />
          <div className="pointer-events-none absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-[var(--eva-green)]" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-[var(--eva-green)]" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-[var(--eva-green)]" />

          {/* Header del modal */}
          <div className="flex items-center justify-between border-b border-white/5 bg-black/40 px-6 py-4">
            <div>
              <p className={cn("font-mono-tech text-[10px] uppercase tracking-[0.3em]", category.text)}>
                ▸ work_archive
              </p>
              <h3 className="mt-0.5 font-display text-2xl text-white">{pro.name}</h3>
              {images.length > 0 && (
                <p className="mt-1 font-mono-tech text-[10px] uppercase tracking-wider text-slate-500">
                  {images.length} {images.length === 1 ? "foto" : "fotos"}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-sm border border-white/10 bg-black/60 text-slate-400 transition hover:border-white/30 hover:text-white"
              aria-label="Cerrar galería"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Grid de fotos */}
          <div className="flex-1 overflow-y-auto p-6">
            {images.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {images.map((src, i) => (
                  <button
                    key={src + i}
                    type="button"
                    onClick={() => setLightboxIndex(i)}
                    className="group relative aspect-square overflow-hidden rounded-sm border border-white/5 bg-black transition hover:border-[var(--eva-green)]/40"
                  >
                    <img
                      src={src}
                      alt={`Trabajo ${i + 1}`}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            ) : (
              // Placeholder cuando no hay fotos
              <div className="grid place-items-center py-16 text-center">
                <div className={cn("mb-5 grid h-16 w-16 place-items-center rounded-sm bg-gradient-to-br", category.color)}>
                  <Images className="h-7 w-7 text-white" />
                </div>
                <p className="font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-green)]">
                  ▸ awaiting_uploads
                </p>
                <p className="mt-3 font-display text-2xl text-white">
                  Galería en preparación
                </p>
                <p className="mt-2 max-w-sm text-sm text-slate-400">
                  {pro.name} todavía no subió fotos de su trabajo. Volvé pronto para verlas.
                </p>
                {pro.socials?.instagram && (
                  <a
                    href={pro.socials.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex items-center gap-2 rounded-sm border border-[var(--eva-green)]/40 bg-[var(--eva-green)]/5 px-4 py-2.5 font-mono-tech text-[11px] uppercase tracking-wider text-[var(--eva-green)] transition hover:bg-[var(--eva-green)]/10"
                  >
                    <Instagram className="h-3.5 w-3.5" />
                    Ver en Instagram
                  </a>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Lightbox encima de la galería (z-110 > z-100) */}
      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════
// CAROUSEL — carrusel de fotos con auto-rotación al hover
// ═══════════════════════════════════════════════════════
function Carousel({ images, fallback }) {
  const [index, setIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  // Rastrea qué índices ya fueron cargados para no re-descargar al volver atrás
  const [loaded, setLoaded] = useState(() => new Set([0]));

  // Auto-rotación solo al hacer hover
  useEffect(() => {
    if (!isHovering || images.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isHovering, images.length]);

  // Al cambiar de foto, marcar la actual y la siguiente como "a cargar"
  useEffect(() => {
    setLoaded((prev) => {
      const next = new Set(prev);
      next.add(index);
      next.add((index + 1) % images.length);
      return next;
    });
  }, [index, images.length]);

  // Si no hay imágenes, devuelve el fallback (placeholder)
  if (!images || images.length === 0) {
    return fallback;
  }

  const go = (delta, e) => {
    e?.stopPropagation();
    setIndex((prev) => {
      const next = prev + delta;
      if (next < 0) return images.length - 1;
      if (next >= images.length) return 0;
      return next;
    });
  };

  return (
    <div
      className="relative h-full w-full"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Solo se asigna src a imágenes ya "desbloqueadas" — el resto no se descarga */}
      {images.map((src, i) => (
        <img
          key={i}
          src={loaded.has(i) ? src : undefined}
          alt={`Foto ${i + 1}`}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
            i === index ? "opacity-100" : "opacity-0"
          )}
        />
      ))}

      {/* Flechas (solo si hay más de 1 foto) */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => go(-1, e)}
            className="absolute left-2 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-sm border border-white/20 bg-black/50 text-white opacity-100 transition md:opacity-0 md:group-hover:opacity-100 hover:border-[var(--eva-green)]/60 hover:bg-black/80 hover:text-[var(--eva-green)]"
            aria-label="Foto anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => go(1, e)}
            className="absolute right-2 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-sm border border-white/20 bg-black/50 text-white opacity-100 transition md:opacity-0 md:group-hover:opacity-100 hover:border-[var(--eva-green)]/60 hover:bg-black/80 hover:text-[var(--eva-green)]"
            aria-label="Foto siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Puntitos abajo */}
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => { e.stopPropagation(); setIndex(i); }}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index
                    ? "w-6 bg-[var(--eva-green)] shadow-[0_0_8px_var(--eva-green-glow)]"
                    : "w-1.5 bg-white/40 hover:bg-white/70"
                )}
                aria-label={`Ir a foto ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PROFESSIONAL CARD — formato vertical estilo IG (4:5)
// ═══════════════════════════════════════════════════════
function ProfessionalCard({ pro, index, onOpenGallery }) {
  const category = getCategory(pro.category);
  const Icon = category.icon;
  const initial = pro.name.charAt(0);

  // Determinar qué fotos van en el carrusel:
  // - Si hay carousel definido, usar eso (max 5).
  // - Si no, pero hay image, mostrar esa única.
  // - Si no hay nada, mostrar el placeholder.
  const carouselImages = pro.carousel && pro.carousel.length > 0
    ? pro.carousel.slice(0, 5)
    : pro.image ? [pro.image] : [];

  const placeholder = (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <div className="grid h-24 w-24 place-items-center rounded-sm border border-white/30 bg-black/40 font-display text-6xl text-white backdrop-blur">
        {initial}
      </div>
      <p className="mt-4 font-mono-tech text-[9px] uppercase tracking-[0.25em] text-white/60">
        ▸ awaiting upload
      </p>
    </div>
  );

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: (index % 4) * 0.08 }}
      className="group relative flex flex-col overflow-hidden rounded-sm border border-white/5 bg-gradient-to-b from-[var(--eva-charcoal)] to-black transition hover:-translate-y-1 hover:border-[var(--eva-green)]/30 hover:shadow-[0_0_30px_rgba(168,255,96,0.08)]"
    >
      {/* Index NERV en esquina */}
      <span className="absolute right-3 top-3 z-20 font-mono-tech text-[9px] uppercase tracking-wider text-white/60">
        ▸ pro_{String(index + 1).padStart(2, "0")}
      </span>

      {/* Carrusel 4:5 (aspect ratio Instagram retrato) */}
      <div className={cn("relative aspect-[4/5] overflow-hidden bg-gradient-to-br", category.color)}>
        {/* Grid HUD */}
        <div className="absolute inset-0 eva-grid-bg opacity-30" />

        {/* Esquinas HUD */}
        <div className="pointer-events-none absolute left-2 top-2 z-10 h-4 w-4 border-l-2 border-t-2 border-white/40" />
        <div className="pointer-events-none absolute right-2 top-2 z-10 h-4 w-4 border-r-2 border-t-2 border-white/40" />
        <div className="pointer-events-none absolute bottom-2 left-2 z-10 h-4 w-4 border-b-2 border-l-2 border-white/40" />
        <div className="pointer-events-none absolute bottom-2 right-2 z-10 h-4 w-4 border-b-2 border-r-2 border-white/40" />

        <Carousel images={carouselImages} fallback={placeholder} />

        {/* Rating badge */}
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-sm bg-black/70 px-2 py-1 backdrop-blur">
          <span className="text-[var(--eva-orange)]">★</span>
          <span className="font-mono-tech text-[10px] font-bold text-white">{pro.rating}</span>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-3.5 w-3.5 shrink-0", category.text)} />
          <p className={cn("min-w-0 truncate font-mono-tech text-[10px] uppercase tracking-[0.25em]", category.text)}>
            {pro.role}
          </p>
        </div>

        <h3 className="mt-2 line-clamp-2 font-display text-2xl leading-tight text-white">{pro.name}</h3>

        <p className="mt-3 line-clamp-4 text-xs leading-5 text-slate-400">{pro.bio}</p>

        {/* Socials + botón — siempre anclados al fondo */}
        <div className="mt-auto">
          <div className="mt-5 flex items-center justify-between gap-2 border-t border-white/5 pt-4">
            <span className="font-mono-tech text-[9px] uppercase tracking-[0.25em] text-slate-600">
              ▸ contact
            </span>
            <div className="flex items-center gap-2">
              {pro.socials?.instagram && (
                <a
                  href={pro.socials.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="grid h-8 w-8 place-items-center rounded-sm border border-white/10 bg-black/60 text-slate-400 transition hover:border-[var(--eva-green)]/50 hover:bg-[var(--eva-green)]/10 hover:text-[var(--eva-green)]"
                  aria-label={`Instagram de ${pro.name}`}
                >
                  <Instagram className="h-3.5 w-3.5" />
                </a>
              )}
              {pro.socials?.linktree && (
                <a
                  href={pro.socials.linktree}
                  target="_blank"
                  rel="noreferrer"
                  className="grid h-8 w-8 place-items-center rounded-sm border border-white/10 bg-black/60 text-slate-400 transition hover:border-[var(--eva-green)]/50 hover:bg-[var(--eva-green)]/10 hover:text-[var(--eva-green)]"
                  aria-label={`Linktree de ${pro.name}`}
                >
                  <Link2 className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenGallery(pro)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-sm border border-[var(--eva-green)]/30 bg-[var(--eva-green)]/5 px-4 py-2.5 font-mono-tech text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--eva-green)] transition hover:bg-[var(--eva-green)]/15 hover:shadow-[0_0_20px_rgba(168,255,96,0.15)]"
            aria-label={`Ver galería de ${pro.name}`}
          >
            <Images className="h-3.5 w-3.5" />
            Ver galería
          </button>
        </div>
      </div>
    </motion.article>
  );
}

// ═══════════════════════════════════════════════════════
// PROFESSIONALS PAGE
// ═══════════════════════════════════════════════════════
function ProfessionalsPage() {
  const [filter, setFilter] = useState("todos");
  const [galleryPro, setGalleryPro] = useState(null); // pro abierto en galería, o null

  const filtered = useMemo(() => {
    if (filter === "todos") return professionals;
    return professionals.filter((p) => p.category === filter);
  }, [filter]);

  return (
    <section className="relative z-10 mx-auto max-w-7xl px-5 pb-20 pt-8 md:px-8">
      {/* Hero compacto */}
      <div className="mb-10 grid gap-6 lg:grid-cols-[1fr_0.45fr] lg:items-end">
        <div>
          <div className="mb-5 inline-flex items-center gap-3 rounded-sm border border-[var(--eva-green)]/30 bg-black/60 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-[var(--eva-green)] eva-pulse" />
            <span className="font-mono-tech text-[10px] uppercase tracking-[0.25em] text-[var(--eva-green)]">
              ▸ pilot_registry
            </span>
          </div>
          <h1 className="font-display text-4xl tracking-tight text-white sm:text-6xl md:text-8xl">
            Pilotos <br />
            <span className="text-[var(--eva-green)] eva-glow-green">certificados.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400">
            Especialistas que colaboran con GCWM. Filtrá por disciplina y conectá directo con su Instagram o Linktree.
          </p>
        </div>
        <div className="rounded-sm border border-[var(--eva-green)]/20 bg-gradient-to-br from-[var(--eva-charcoal)] to-black p-5">
          <p className="font-mono-tech text-[10px] uppercase tracking-[0.25em] text-[var(--eva-green)]">
            ▸ active_pilots
          </p>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="font-display text-4xl text-white">{filtered.length}</p>
              <p className="font-mono-tech text-[10px] uppercase tracking-wider text-slate-500">
                {filter === "todos" ? "totales" : "en disciplina"}
              </p>
            </div>
            <Users className="h-6 w-6 text-[var(--eva-green)]" />
          </div>
        </div>
      </div>

      {/* Filtro por disciplina */}
      <div className="mb-8 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter("todos")}
          className={cn(
            "rounded-sm border px-4 py-2.5 font-mono-tech text-xs uppercase tracking-wider transition",
            filter === "todos"
              ? "border-[var(--eva-green)]/40 bg-[var(--eva-green)]/10 text-[var(--eva-green)]"
              : "border-white/5 bg-black/40 text-slate-400 hover:border-white/20"
          )}
        >
          Todos
          <span className="ml-2 text-slate-600">{professionals.length}</span>
        </button>
        {categories.map((cat) => {
          const Icon = cat.icon;
          const count = professionals.filter((p) => p.category === cat.id).length;
          const isActive = filter === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilter(cat.id)}
              className={cn(
                "flex items-center gap-2 rounded-sm border px-4 py-2.5 font-mono-tech text-xs uppercase tracking-wider transition",
                isActive ? cn(cat.border, cat.bg, cat.text) : "border-white/5 bg-black/40 text-slate-400 hover:border-white/20"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {cat.label}
              <span className={cn("ml-1", isActive ? "" : "text-slate-600")}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Grid de tarjetas */}
      {filtered.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((pro, index) => (
            <ProfessionalCard
              key={pro.id}
              pro={pro}
              index={index}
              onOpenGallery={setGalleryPro}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-sm border border-dashed border-white/10 bg-black/40 p-12 text-center">
          <p className="font-mono-tech text-xs uppercase tracking-[0.25em] text-slate-500">
            ▸ sin pilotos en esta disciplina
          </p>
          <p className="mt-2 text-sm text-slate-400">Probá con otra disciplina o seleccioná "Todos".</p>
        </div>
      )}

      {/* CTA final */}
      <div className="mt-12 rounded-sm border border-white/5 bg-gradient-to-br from-[var(--eva-charcoal)] to-black p-8 md:p-12">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-green)]">
              ▸ join_the_unit
            </p>
            <h3 className="mt-2 font-display text-3xl text-white md:text-4xl">
              ¿Sos profesional cosplay y querés sumarte?
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Si enseñás, fabricás props, hacés wigs, costura o electrónica para cosplay, podés formar parte del registro GCWM.
            </p>
          </div>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hola GCWM! Me gustaria sumarme al registro de profesionales.")}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-sm bg-[var(--eva-green)] px-6 py-4 font-mono-tech text-xs font-bold uppercase tracking-[0.2em] text-black shadow-[0_0_30px_var(--eva-green-glow)] transition hover:bg-white"
          >
            <MessageCircle className="h-4 w-4" />
            Postularme
          </a>
        </div>
      </div>

      {/* Modal de galería (se abre al click en el botón Images de una tarjeta) */}
      {galleryPro && (
        <GalleryModal pro={galleryPro} onClose={() => setGalleryPro(null)} />
      )}
    </section>
  );
}

// ═══════════════════════════════════════════════════════
// CART MODAL — resumen del pedido con doble confirmación
// ═══════════════════════════════════════════════════════
function CartModal({ cart, setCart, onClose, wishlist, toggleWishlist }) {
  const [confirming, setConfirming] = useState(false);

  const cartLines = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const product = shopItems.find((item) => item.id === id);
        return product ? { ...product, qty } : null;
      })
      .filter(Boolean);
  }, [cart]);

  const total = cartLines.reduce((sum, item) => sum + item.price * item.qty, 0);
  const itemCount = cartLines.reduce((sum, item) => sum + item.qty, 0);

  const upsellItems = useMemo(() => {
    const inCart = new Set(Object.keys(cart));
    const candidates = shopItems.filter((item) => !inCart.has(item.id));
    return [...candidates].sort(() => Math.random() - 0.5).slice(0, 3);
  }, [cart]);

  const lineBreak = String.fromCharCode(10);
  const whatsappMessage = encodeURIComponent(
    [
      "Hola! Quiero hacer este pedido en GCWM:",
      "",
      ...cartLines.map((item) => `- ${item.qty} x ${item.name} (${formatPrice(item.price)})`),
      "",
      `Total estimado: ${formatPrice(total)}`,
      "",
      "Me confirmas stock y envio?",
    ].join(lineBreak)
  );

  function addToCart(productId) {
    setCart((current) => ({ ...current, [productId]: (current[productId] || 0) + 1 }));
  }

  function changeQty(productId, delta) {
    setCart((current) => {
      const nextQty = (current[productId] || 0) + delta;
      const next = { ...current };
      if (nextQty <= 0) delete next[productId];
      else next[productId] = nextQty;
      return next;
    });
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/85"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex w-full max-w-md max-h-[90vh] flex-col overflow-hidden rounded-t-sm border border-[var(--eva-green)]/30 bg-gradient-to-b from-[var(--eva-charcoal)] to-black shadow-2xl shadow-black/80 sm:rounded-sm"
      >
        {/* Esquinas HUD */}
        <div className="pointer-events-none absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-[var(--eva-green)]" />
        <div className="pointer-events-none absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-[var(--eva-green)]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-[var(--eva-green)]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-[var(--eva-green)]" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div>
            <p className="font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-green)]">▸ pedido_activo</p>
            <h2 className="mt-0.5 font-display text-2xl text-white">
              Carrito{itemCount > 0 && <span className="ml-2 text-[var(--eva-green)]">({itemCount})</span>}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-sm border border-white/10 bg-black/60 text-slate-400 transition hover:border-white/30 hover:text-white"
            aria-label="Cerrar carrito"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5">
            {cartLines.length === 0 ? (
              <div className="rounded-sm border border-dashed border-white/10 bg-black/40 p-8 text-center">
                <ShoppingBag className="mx-auto mb-3 h-8 w-8 text-slate-600" />
                <p className="font-display text-lg text-white">Carrito vacío</p>
                <p className="mt-1 font-mono-tech text-[10px] uppercase tracking-wider text-slate-500">
                  agregá items para empezar
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {cartLines.map((item) => (
                  <div key={item.id} className="rounded-sm border border-white/5 bg-black/40 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white">{item.name}</p>
                        <p className="font-mono-tech text-[10px] text-slate-500">{formatPrice(item.price)} c/u</p>
                      </div>
                      <p className="shrink-0 font-mono-tech text-xs font-bold text-[var(--eva-green)]">
                        {formatPrice(item.price * item.qty)}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => changeQty(item.id, -1)}
                          className="grid h-7 w-7 place-items-center rounded-sm border border-white/10 bg-black/60 font-bold text-white hover:border-white/30"
                        >
                          −
                        </button>
                        <span className="w-6 text-center font-mono-tech text-xs text-white">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => changeQty(item.id, 1)}
                          className="grid h-7 w-7 place-items-center rounded-sm border border-white/10 bg-black/60 font-bold text-white hover:border-white/30"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => changeQty(item.id, -item.qty)}
                        className="font-mono-tech text-[10px] uppercase tracking-wider text-slate-500 hover:text-[var(--eva-orange)]"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Guardados (wishlist items not in cart) */}
          {(() => {
            const savedItems = shopItems.filter((i) => wishlist && wishlist.has(i.id) && !cart[i.id]);
            if (!savedItems.length) return null;
            return (
              <div className="border-t border-white/5 px-5 py-4">
                <div className="mb-3 flex items-center gap-2">
                  <Heart className="h-3.5 w-3.5 text-[var(--eva-orange)]" fill="var(--eva-orange)" />
                  <p className="font-mono-tech text-[10px] uppercase tracking-[0.2em] text-[var(--eva-orange)]">▸ guardados</p>
                </div>
                <div className="space-y-2">
                  {savedItems.map((item) => {
                    const cat = getCategory(item.category);
                    return (
                      <div key={item.id} className="flex items-center gap-3 rounded-sm border border-white/5 bg-black/40 p-3">
                        <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-sm bg-gradient-to-br", cat.color)}>
                          <ShoppingBag className="h-4 w-4 text-white/70" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-xs font-bold text-white">{item.name}</p>
                          <p className="font-mono-tech text-[10px] text-[var(--eva-green)]">{formatPrice(item.price)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => addToCart(item.id)}
                          className="shrink-0 rounded-sm border border-[var(--eva-green)]/40 bg-[var(--eva-green)]/10 px-2.5 py-1.5 font-mono-tech text-[10px] font-bold text-[var(--eva-green)] transition hover:bg-[var(--eva-green)] hover:text-black"
                        >
                          Agregar +
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Upsell */}
          {upsellItems.length > 0 && (
            <div className="border-t border-white/5 px-5 py-4">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-[var(--eva-orange)]" />
                <p className="font-mono-tech text-[10px] uppercase tracking-[0.2em] text-[var(--eva-orange)]">
                  No termines sin agregar esto
                </p>
              </div>
              <div className="space-y-2">
                {upsellItems.map((item) => {
                  const cat = getCategory(item.category);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-sm border border-white/5 bg-black/40 p-3"
                    >
                      <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-sm bg-gradient-to-br", cat.color)}>
                        <ShoppingBag className="h-4 w-4 text-white/70" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-xs font-bold text-white">{item.name}</p>
                        <p className="font-mono-tech text-[10px] text-[var(--eva-green)]">{formatPrice(item.price)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addToCart(item.id)}
                        className="shrink-0 rounded-sm border border-[var(--eva-green)]/40 bg-[var(--eva-green)]/10 px-2.5 py-1.5 font-mono-tech text-[10px] font-bold text-[var(--eva-green)] transition hover:bg-[var(--eva-green)] hover:text-black"
                      >
                        + Agregar
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer del modal */}
        {cartLines.length > 0 && (
          <div className="border-t border-white/10 p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono-tech text-[10px] uppercase tracking-[0.25em] text-slate-400">
                total estimado
              </span>
              <span className="font-display text-2xl text-[var(--eva-green)] eva-glow-green">
                {formatPrice(total)}
              </span>
            </div>

            {confirming ? (
              <div className="overflow-hidden rounded-sm border border-[var(--eva-orange)]/40 bg-[var(--eva-orange)]/5">
                <div className="border-b border-[var(--eva-orange)]/20 px-4 py-3">
                  <p className="font-mono-tech text-[10px] uppercase tracking-[0.2em] text-[var(--eva-orange)]">
                    ▸ confirmar pedido
                  </p>
                  <p className="mt-1 text-sm leading-5 text-slate-300">
                    Se abrirá WhatsApp con tu pedido de{" "}
                    <span className="font-bold text-[var(--eva-green)]">{formatPrice(total)}</span>.
                    Coordinamos stock, pago y envío.
                  </p>
                </div>
                <div className="flex gap-2 p-3">
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="flex-1 rounded-sm border border-white/10 bg-black/40 py-3 font-mono-tech text-xs uppercase tracking-wider text-slate-400 transition hover:bg-black/60"
                  >
                    ← Volver
                  </button>
                  <a
                    href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={onClose}
                    className="flex flex-[1.5] items-center justify-center gap-2 rounded-sm bg-[var(--eva-green)] py-3 font-mono-tech text-xs font-bold uppercase tracking-[0.2em] text-black shadow-[0_0_20px_var(--eva-green-glow)] transition hover:bg-white"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Sí, confirmar ▸
                  </a>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="flex w-full items-center justify-center gap-2 rounded-sm bg-[var(--eva-green)] px-4 py-4 font-mono-tech text-xs font-bold uppercase tracking-[0.2em] text-black shadow-[0_0_30px_var(--eva-green-glow)] transition hover:bg-white"
              >
                <ShoppingBag className="h-4 w-4" />
                Realizar pedido ▸
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// FAQ MODAL
// ═══════════════════════════════════════════════════════
const FAQ_ITEMS = [
  {
    q: "¿Cómo funcionan los cursos?",
    a: "Los cursos son tutoriales en video. Algunos son gratuitos y otros de pago. Podés verlos a tu ritmo, cuantas veces quieras, desde cualquier dispositivo.",
  },
  {
    q: "¿Cómo compro en la tienda?",
    a: "Agregá los productos al carrito y hacé click en 'Realizar pedido'. Se abrirá WhatsApp para coordinar stock, forma de pago y envío directamente con nosotros.",
  },
  {
    q: "¿Hacen envíos a todo el país?",
    a: "Sí, trabajamos con correos nacionales. El costo y tiempo de envío se coordinan al confirmar el pedido por WhatsApp, dependiendo de tu localidad.",
  },
  {
    q: "¿Puedo sumarme al registro de profesionales?",
    a: "Por supuesto. Si enseñás, fabricás props, hacés wigs, costura o electrónica para cosplay, escribinos por WhatsApp o Instagram y coordinamos tu incorporación.",
  },
  {
    q: "¿Qué métodos de pago aceptan?",
    a: "Transferencia bancaria, Mercado Pago y efectivo. Todos los detalles se coordinan directamente por WhatsApp al confirmar el pedido.",
  },
];

function FAQModal({ onClose }) {
  const [openIndex, setOpenIndex] = useState(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/85"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-sm border border-[var(--eva-green)]/30 bg-gradient-to-b from-[var(--eva-charcoal)] to-black shadow-2xl shadow-black/80"
      >
        {/* Esquinas HUD */}
        <div className="pointer-events-none absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-[var(--eva-green)]" />
        <div className="pointer-events-none absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-[var(--eva-green)]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-[var(--eva-green)]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-[var(--eva-green)]" />

        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div>
            <p className="font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-green)]">▸ soporte</p>
            <h2 className="mt-0.5 font-display text-2xl text-white">Preguntas frecuentes</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-sm border border-white/10 bg-black/60 text-slate-400 transition hover:border-white/30 hover:text-white"
            aria-label="Cerrar FAQ"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-2">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="overflow-hidden rounded-sm border border-white/5 bg-black/40">
                <button
                  type="button"
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                >
                  <p className="text-sm font-bold text-white">{item.q}</p>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-[var(--eva-green)] transition-transform",
                      openIndex === i && "rotate-180"
                    )}
                  />
                </button>
                {openIndex === i && (
                  <div className="border-t border-white/5 px-4 pb-4 pt-3">
                    <p className="text-sm leading-6 text-slate-400">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// CONTACT MODAL
// ═══════════════════════════════════════════════════════
function ContactModal({ onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/85"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative w-full max-w-sm overflow-hidden rounded-sm border border-[var(--eva-green)]/30 bg-gradient-to-b from-[var(--eva-charcoal)] to-black shadow-2xl shadow-black/80"
      >
        {/* Esquinas HUD */}
        <div className="pointer-events-none absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-[var(--eva-green)]" />
        <div className="pointer-events-none absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-[var(--eva-green)]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-[var(--eva-green)]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-[var(--eva-green)]" />

        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div>
            <p className="font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-green)]">▸ contact</p>
            <h2 className="mt-0.5 font-display text-2xl text-white">Contacto</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-sm border border-white/10 bg-black/60 text-slate-400 transition hover:border-white/30 hover:text-white"
            aria-label="Cerrar contacto"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-6">
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-4 rounded-sm border border-white/5 bg-black/40 px-4 py-4 transition hover:border-[var(--eva-green)]/40 hover:bg-[var(--eva-green)]/5"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-sm border border-[var(--eva-green)]/30 bg-[var(--eva-green)]/10">
              <MessageCircle className="h-5 w-5 text-[var(--eva-green)]" />
            </div>
            <div>
              <p className="font-mono-tech text-[10px] uppercase tracking-[0.2em] text-[var(--eva-green)]">WhatsApp</p>
              <p className="mt-0.5 text-sm text-white">Consultas, pedidos y soporte</p>
            </div>
          </a>

          <a
            href="https://instagram.com/gcwm_ar"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-4 rounded-sm border border-white/5 bg-black/40 px-4 py-4 transition hover:border-white/20 hover:bg-black/60"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-sm border border-white/10 bg-black/60">
              <Instagram className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <p className="font-mono-tech text-[10px] uppercase tracking-[0.2em] text-slate-400">Instagram</p>
              <p className="mt-0.5 text-sm text-white">@gcwm_ar</p>
            </div>
          </a>

          <a
            href="mailto:contacto@gcwm.ar"
            className="flex items-center gap-4 rounded-sm border border-white/5 bg-black/40 px-4 py-4 transition hover:border-white/20 hover:bg-black/60"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-sm border border-white/10 bg-black/60">
              <Mail className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <p className="font-mono-tech text-[10px] uppercase tracking-[0.2em] text-slate-400">Email</p>
              <p className="mt-0.5 text-sm text-white">contacto@gcwm.ar</p>
            </div>
          </a>
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SEARCH MODAL — búsqueda global ⌘K / Ctrl+K
// ═══════════════════════════════════════════════════════
function SearchModal({ onClose, setPage, openCategory }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const products = shopItems
      .filter((i) => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q))
      .slice(0, 4);
    const tuts = tutorials
      .filter((t) => t.title.toLowerCase().includes(q) || t.tag.toLowerCase().includes(q))
      .slice(0, 3);
    const pros = professionals
      .filter((p) => p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q) || (p.bio && p.bio.toLowerCase().includes(q)))
      .slice(0, 3);
    return { products, tuts, pros };
  }, [query]);

  const hasResults = results && (results.products.length + results.tuts.length + results.pros.length) > 0;

  function handleProductClick(item) {
    setPage("shop");
    onClose();
  }

  function handleTutorialClick(t) {
    openCategory(t.category);
    onClose();
  }

  function handleProClick() {
    setPage("professionals");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-start justify-center pt-20 p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/85"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-2xl overflow-hidden rounded-sm border border-[var(--eva-green)]/30 bg-gradient-to-b from-[var(--eva-charcoal)] to-black shadow-2xl shadow-black/80"
      >
        {/* Esquinas HUD */}
        <div className="pointer-events-none absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-[var(--eva-green)]" />
        <div className="pointer-events-none absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-[var(--eva-green)]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-[var(--eva-green)]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-[var(--eva-green)]" />

        {/* Input */}
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <Search className="h-4 w-4 shrink-0 text-[var(--eva-green)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar productos, tutoriales, profesionales..."
            className="min-w-0 flex-1 bg-transparent font-mono-tech text-sm text-white outline-none placeholder:text-slate-500"
          />
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-sm border border-white/10 bg-black/60 text-slate-400 transition hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Resultados */}
        <div className="max-h-[60vh] overflow-y-auto p-3">
          {!query.trim() ? (
            <div>
              <p className="mb-3 px-2 font-mono-tech text-[10px] uppercase tracking-[0.3em] text-slate-500">▸ acceso rápido</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Tienda", sub: "productos y materiales", icon: ShoppingBag, action: () => { setPage("shop"); onClose(); } },
                  { label: "Profesionales", sub: "expertos certificados", icon: Users, action: () => { setPage("professionals"); onClose(); } },
                  { label: "Tutoriales", sub: "cursos gratuitos", icon: PlayCircle, action: () => { openCategory("electronica"); onClose(); } },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.label}
                      type="button"
                      onClick={s.action}
                      className="flex flex-col items-start gap-2 rounded-sm border border-white/5 bg-black/40 p-4 text-left transition hover:border-[var(--eva-green)]/30 hover:bg-[var(--eva-green)]/5"
                    >
                      <Icon className="h-5 w-5 text-[var(--eva-green)]" />
                      <div>
                        <p className="text-sm font-bold text-white">{s.label}</p>
                        <p className="font-mono-tech text-[10px] uppercase tracking-wider text-slate-500">{s.sub}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : !hasResults ? (
            <div className="py-10 text-center">
              <p className="font-mono-tech text-sm text-slate-400">▸ sin resultados para "{query}"</p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.products.length > 0 && (
                <div>
                  <p className="mb-2 px-2 font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-green)]">▸ productos</p>
                  <div className="space-y-1">
                    {results.products.map((item) => {
                      const cat = getCategory(item.category);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleProductClick(item)}
                          className="flex w-full items-center gap-3 rounded-sm border border-white/5 bg-black/40 px-3 py-3 text-left transition hover:border-[var(--eva-green)]/30 hover:bg-[var(--eva-green)]/5"
                        >
                          <ShoppingBag className="h-4 w-4 shrink-0 text-slate-400" />
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-sm font-bold text-white">{item.name}</p>
                            <p className={cn("font-mono-tech text-[10px] uppercase tracking-wider", cat.text)}>{cat.label}</p>
                          </div>
                          <span className="shrink-0 font-mono-tech text-xs font-bold text-[var(--eva-green)]">{formatPrice(item.price)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {results.tuts.length > 0 && (
                <div>
                  <p className="mb-2 px-2 font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-green)]">▸ tutoriales</p>
                  <div className="space-y-1">
                    {results.tuts.map((t) => {
                      const cat = getCategory(t.category);
                      return (
                        <button
                          key={t.title}
                          type="button"
                          onClick={() => handleTutorialClick(t)}
                          className="flex w-full items-center gap-3 rounded-sm border border-white/5 bg-black/40 px-3 py-3 text-left transition hover:border-[var(--eva-green)]/30 hover:bg-[var(--eva-green)]/5"
                        >
                          <PlayCircle className="h-4 w-4 shrink-0 text-slate-400" />
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-sm font-bold text-white">{t.title}</p>
                            <p className={cn("font-mono-tech text-[10px] uppercase tracking-wider", cat.text)}>{t.tag}</p>
                          </div>
                          <span className="shrink-0 font-mono-tech text-[10px] uppercase tracking-wider text-slate-500">{t.level}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {results.pros.length > 0 && (
                <div>
                  <p className="mb-2 px-2 font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-green)]">▸ profesionales</p>
                  <div className="space-y-1">
                    {results.pros.map((p) => {
                      const cat = getCategory(p.category);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={handleProClick}
                          className="flex w-full items-center gap-3 rounded-sm border border-white/5 bg-black/40 px-3 py-3 text-left transition hover:border-[var(--eva-green)]/30 hover:bg-[var(--eva-green)]/5"
                        >
                          <Users className="h-4 w-4 shrink-0 text-slate-400" />
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-sm font-bold text-white">{p.name}</p>
                            <p className={cn("font-mono-tech text-[10px] uppercase tracking-wider", cat.text)}>{p.role}</p>
                          </div>
                          <span className="shrink-0 font-mono-tech text-[10px] text-[var(--eva-orange)]">★ {p.rating}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// EVENT COUNTDOWN — banner de contador para próximo evento
// ═══════════════════════════════════════════════════════
function EventCountdown() {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    function calc() {
      const diff = NEXT_EVENT.date - Date.now();
      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ d, h, m, s });
    }
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, []);

  if (!timeLeft) return null;

  const units = [
    { value: String(timeLeft.d).padStart(2, "0"), label: "días" },
    { value: String(timeLeft.h).padStart(2, "0"), label: "hs" },
    { value: String(timeLeft.m).padStart(2, "0"), label: "min" },
    { value: String(timeLeft.s).padStart(2, "0"), label: "seg" },
  ];

  return (
    <div className="relative z-10 mx-auto max-w-7xl px-5 pb-8 md:px-8">
      <div className="flex flex-col items-start justify-between gap-4 rounded-sm border border-[var(--eva-orange)]/20 bg-gradient-to-r from-[var(--eva-orange)]/5 to-transparent px-5 py-4 sm:flex-row sm:items-center">
        {/* Left side */}
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--eva-orange)] eva-pulse" />
          <div>
            <p className="font-mono-tech text-[10px] uppercase tracking-[0.25em] text-[var(--eva-orange)]">▸ próximo evento</p>
            <p className="font-display text-lg text-white leading-tight">{NEXT_EVENT.name}</p>
            <p className="font-mono-tech text-[10px] uppercase tracking-wider text-slate-500">{NEXT_EVENT.location}</p>
          </div>
        </div>
        {/* Right side — countdown blocks */}
        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 shrink-0 text-[var(--eva-orange)]" />
          <div className="flex items-center gap-2">
            {units.map((u) => (
              <div key={u.label} className="flex flex-col items-center rounded-sm border border-[var(--eva-orange)]/30 bg-black/60 px-3 py-2 min-w-[3rem] text-center">
                <span className="font-display text-xl leading-none text-[var(--eva-orange)]">{u.value}</span>
                <span className="font-mono-tech text-[9px] uppercase tracking-wider text-slate-500">{u.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// BUILD WIZARD — asistente "Armá tu build"
// ═══════════════════════════════════════════════════════
function difficultyBadge(difficulty) {
  if (difficulty === "Fácil") return "bg-[var(--eva-green)]/15 text-[var(--eva-green)]";
  if (difficulty === "Medio") return "bg-[var(--eva-orange)]/15 text-[var(--eva-orange)]";
  if (difficulty === "Avanzado") return "bg-[var(--eva-purple)]/30 text-violet-300";
  return "bg-red-500/15 text-red-400";
}

function archetypeIcon(id) {
  if (id === "armored") return Zap;
  if (id === "fabric") return Scissors;
  if (id === "tech") return Wand2;
  if (id === "fantasy") return Sparkles;
  return Users;
}

function BuildWizard({ onClose, setPage, openCategory }) {
  const [step, setStep] = useState(1);
  const [charQuery, setCharQuery] = useState("");
  const [selectedChar, setSelectedChar] = useState(null);
  const [useArchetype, setUseArchetype] = useState(false);
  const [archetype, setArchetype] = useState(null);
  const [selectedCats, setSelectedCats] = useState(new Set());

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filteredChars = useMemo(() => {
    const q = charQuery.trim().toLowerCase();
    if (!q) return characters;
    return characters.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.franchise.toLowerCase().includes(q)
    );
  }, [charQuery]);

  function selectCharacter(char) {
    try {
      const stats = JSON.parse(localStorage.getItem("gcwm-char-stats") || "{}");
      stats[char.id] = (stats[char.id] || 0) + 1;
      localStorage.setItem("gcwm-char-stats", JSON.stringify(stats));
    } catch {}
    setSelectedChar(char);
    setSelectedCats(new Set(char.tags));
    setUseArchetype(false);
    setStep(2);
  }

  function selectArchetype(arch) {
    setArchetype(arch);
    setSelectedCats(new Set(arch.categories));
    setSelectedChar(null);
    setStep(2);
  }

  function toggleCat(catId) {
    setSelectedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }

  function goToArchetypeMode() {
    const q = charQuery.trim().toLowerCase();
    if (q) {
      try {
        const misses = JSON.parse(localStorage.getItem("gcwm-char-misses") || "[]");
        misses.push(q);
        localStorage.setItem("gcwm-char-misses", JSON.stringify(misses.slice(-200)));
      } catch {}
    }
    setUseArchetype(true);
    setSelectedChar(null);
    setArchetype(null);
    setSelectedCats(new Set());
    setStep(2);
  }

  const recommendedProducts = useMemo(() => {
    if (!selectedCats.size) return [];
    return [...selectedCats].flatMap((catId) =>
      shopItems.filter((i) => i.category === catId).slice(0, 2)
    );
  }, [selectedCats]);

  const recommendedPros = useMemo(() => {
    if (!selectedCats.size) return [];
    return professionals.filter((p) => selectedCats.has(p.category)).slice(0, 4);
  }, [selectedCats]);

  const recommendedTutorials = useMemo(() => {
    if (!selectedCats.size) return [];
    return tutorials.filter((t) => selectedCats.has(t.category)).slice(0, 4);
  }, [selectedCats]);

  const prices = recommendedProducts.map((i) => i.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.round(Math.min(...prices) * 2.2) : 0;

  const stepTitles = ["¿A quién querés hacer?", "Tu breakdown", "Tu build"];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/85"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-sm border border-[var(--eva-green)]/30 bg-gradient-to-b from-[var(--eva-charcoal)] to-black shadow-2xl shadow-black/80 max-h-[90vh]"
      >
        {/* Esquinas HUD */}
        <div className="pointer-events-none absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-[var(--eva-green)]" />
        <div className="pointer-events-none absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-[var(--eva-green)]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-[var(--eva-green)]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-[var(--eva-green)]" />

        {/* Progress bar — 3 segmentos */}
        <div className="flex h-1 w-full overflow-hidden">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className="flex-1 transition-colors duration-300"
              style={{ backgroundColor: s <= step ? "var(--eva-green)" : "rgba(255,255,255,0.08)" }}
            />
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div>
            <p className="font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-green)]">▸ paso {step}/3</p>
            <h2 className="mt-0.5 font-display text-2xl text-white">{stepTitles[step - 1]}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-sm border border-white/10 bg-black/60 text-slate-400 transition hover:border-white/30 hover:text-white"
            aria-label="Cerrar wizard"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── STEP 1: búsqueda de personaje ── */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={charQuery}
                  onChange={(e) => setCharQuery(e.target.value)}
                  placeholder="Buscar personaje..."
                  className="w-full rounded-sm border border-white/10 bg-black/40 py-3 pl-10 pr-4 font-mono-tech text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-[var(--eva-green)]/50"
                />
              </div>

              {filteredChars.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredChars.map((char) => (
                    <button
                      key={char.id}
                      type="button"
                      onClick={() => selectCharacter(char)}
                      className="group flex flex-col items-start gap-2 rounded-sm border border-white/5 bg-black/40 p-3 text-left transition hover:border-[var(--eva-green)]/40 hover:bg-[var(--eva-green)]/5"
                    >
                      <div className="flex w-full items-start justify-between gap-2">
                        <p className="font-display text-base leading-tight text-white">{char.name}</p>
                        <span className={cn("shrink-0 rounded-sm px-2 py-0.5 font-mono-tech text-[9px] uppercase tracking-wider", difficultyBadge(char.difficulty))}>
                          {char.difficulty}
                        </span>
                      </div>
                      <p className="font-mono-tech text-[10px] uppercase tracking-wider text-slate-500 line-clamp-1">{char.franchise}</p>
                      <div className="flex flex-wrap gap-1">
                        {char.tags.map((catId) => {
                          const cat = getCategory(catId);
                          return (
                            <span key={catId} className={cn("rounded-sm px-2 py-0.5 font-mono-tech text-[9px] uppercase tracking-wider", cat.bg, cat.text)}>
                              {cat.shortLabel}
                            </span>
                          );
                        })}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-center font-mono-tech text-xs uppercase tracking-wider text-slate-500 py-4">
                  Sin resultados para "{charQuery}"
                </p>
              )}

              <div className="border-t border-white/5 pt-3">
                <button
                  type="button"
                  onClick={goToArchetypeMode}
                  className="w-full rounded-sm border border-white/10 bg-black/40 py-3 font-mono-tech text-xs uppercase tracking-wider text-slate-400 transition hover:border-[var(--eva-green)]/30 hover:text-[var(--eva-green)]"
                >
                  ¿No está tu personaje? → Elegir por tipo de cosplay
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: breakdown del personaje o selección de arquetipo ── */}
          {step === 2 && (
            <div className="space-y-4">

              {/* Modo personaje: mostrar info del personaje + toggles de categoría */}
              {selectedChar && (
                <>
                  {/* Header del personaje */}
                  <div className="rounded-sm border border-[var(--eva-green)]/20 bg-[var(--eva-green)]/5 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-2xl text-white">{selectedChar.name}</h3>
                      <span className={cn("rounded-sm px-2 py-0.5 font-mono-tech text-[9px] uppercase tracking-wider", difficultyBadge(selectedChar.difficulty))}>
                        {selectedChar.difficulty}
                      </span>
                    </div>
                    <p className="mt-1 font-mono-tech text-[10px] uppercase tracking-wider text-slate-500">{selectedChar.franchise}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selectedChar.tags.map((catId) => {
                        const cat = getCategory(catId);
                        return (
                          <span key={catId} className={cn("rounded-sm px-2 py-0.5 font-mono-tech text-[9px] uppercase tracking-wider", cat.bg, cat.text)}>
                            {cat.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Lo que vas a necesitar */}
                  <div>
                    <p className="mb-2 font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-green)]">▸ lo que vas a necesitar</p>
                    <ul className="space-y-1.5">
                      {selectedChar.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--eva-green)]" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Consejo clave */}
                  <div className="rounded-sm border border-[var(--eva-orange)]/30 bg-[var(--eva-orange)]/5 p-4">
                    <p className="mb-1.5 font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-orange)]">▸ consejo clave</p>
                    <p className="text-sm leading-6 text-slate-300">{selectedChar.tip}</p>
                  </div>

                  {/* Materiales clave */}
                  <div>
                    <p className="mb-2 font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-green)]">▸ materiales clave</p>
                    <ul className="space-y-1.5">
                      {selectedChar.materials.map((m, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--eva-orange)]" />
                          {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {/* Modo arquetipo: si no se eligió arquetipo aún, mostrar la grilla */}
              {useArchetype && !archetype && (
                <>
                  <p className="text-sm text-slate-400">Elegí el tipo de cosplay que querés armar.</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {BUILD_ARCHETYPES.map((arch) => {
                      const Icon = archetypeIcon(arch.id);
                      return (
                        <button
                          key={arch.id}
                          type="button"
                          onClick={() => selectArchetype(arch)}
                          className="group flex flex-col items-start gap-3 rounded-sm border border-white/5 bg-black/40 p-4 text-left transition hover:border-[var(--eva-green)]/40 hover:bg-[var(--eva-green)]/5"
                        >
                          <div className="grid h-10 w-10 place-items-center rounded-sm border border-[var(--eva-green)]/30 bg-[var(--eva-green)]/10">
                            <Icon className="h-5 w-5 text-[var(--eva-green)]" />
                          </div>
                          <div>
                            <p className="font-display text-base text-white">{arch.label}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-400">{arch.desc}</p>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {arch.categories.map((catId) => {
                              const cat = getCategory(catId);
                              return (
                                <span key={catId} className={cn("rounded-sm px-2 py-0.5 font-mono-tech text-[9px] uppercase tracking-wider", cat.bg, cat.text)}>
                                  {cat.label}
                                </span>
                              );
                            })}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Mostrar toggles de categoría cuando hay personaje seleccionado o arquetipo elegido */}
              {(selectedChar || (useArchetype && archetype)) && (
                <>
                  <div>
                    <p className="mb-2 font-mono-tech text-[10px] uppercase tracking-[0.3em] text-slate-500">▸ ajustá las categorías</p>
                    <div className="grid grid-cols-2 gap-3">
                      {categories.map((cat) => {
                        const Icon = cat.icon;
                        const active = selectedCats.has(cat.id);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => toggleCat(cat.id)}
                            className={cn(
                              "flex items-center gap-3 rounded-sm border p-3 text-left transition",
                              active ? cn(cat.border, cat.bg) : "border-white/5 bg-black/40 hover:border-white/20"
                            )}
                          >
                            <Icon className={cn("h-5 w-5 shrink-0", active ? cat.text : "text-slate-500")} />
                            <div>
                              <p className="font-display text-base text-white">{cat.label}</p>
                              <p className="font-mono-tech text-[10px] uppercase tracking-wider text-slate-500">{cat.shortLabel}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 rounded-sm border border-white/10 bg-black/40 py-3 font-mono-tech text-xs uppercase tracking-wider text-slate-400 transition hover:bg-black/60"
                    >
                      ← Atrás
                    </button>
                    <button
                      type="button"
                      disabled={selectedCats.size === 0}
                      onClick={() => setStep(3)}
                      className="flex-[1.5] rounded-sm bg-[var(--eva-green)] py-3 font-mono-tech text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:bg-white disabled:opacity-40"
                    >
                      Ver recomendaciones ▸
                    </button>
                  </div>
                </>
              )}

              {/* Mientras no hay arquetipo elegido en modo fallback, solo mostrar el botón volver */}
              {useArchetype && !archetype && (
                <button
                  type="button"
                  onClick={() => { setUseArchetype(false); setStep(1); }}
                  className="w-full rounded-sm border border-white/10 bg-black/40 py-3 font-mono-tech text-xs uppercase tracking-wider text-slate-400 transition hover:bg-black/60"
                >
                  ← Volver a búsqueda
                </button>
              )}
            </div>
          )}

          {/* ── STEP 3: recomendaciones ── */}
          {step === 3 && (
            <div className="space-y-5">

              {/* Consejo del personaje como callout en el tope */}
              {selectedChar && (
                <div className="rounded-sm border border-[var(--eva-orange)]/30 bg-[var(--eva-orange)]/5 p-4">
                  <p className="mb-1 font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-orange)]">▸ consejo para {selectedChar.name}</p>
                  <p className="text-xs leading-5 text-slate-300">{selectedChar.tip}</p>
                </div>
              )}

              {/* Presupuesto estimado */}
              <div className="rounded-sm border border-[var(--eva-orange)]/30 bg-[var(--eva-orange)]/5 p-4">
                <p className="font-mono-tech text-[10px] uppercase tracking-[0.25em] text-[var(--eva-orange)]">▸ presupuesto estimado</p>
                <p className="mt-2 font-display text-3xl text-white">
                  {formatPrice(minPrice)} — {formatPrice(maxPrice)}
                </p>
                <p className="mt-1 text-xs text-slate-400">Rango orientativo según materiales seleccionados.</p>
              </div>

              {/* Materiales recomendados */}
              {recommendedProducts.length > 0 && (
                <div>
                  <p className="mb-3 font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-green)]">▸ materiales recomendados</p>
                  <div className="space-y-2">
                    {recommendedProducts.slice(0, 6).map((item) => {
                      const cat = getCategory(item.category);
                      const Icon = cat.icon;
                      return (
                        <div key={item.id} className="flex items-center gap-3 rounded-sm border border-white/5 bg-black/40 p-3">
                          <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-gradient-to-br", cat.color)}>
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-sm font-bold text-white">{item.name}</p>
                            <p className={cn("font-mono-tech text-[10px] uppercase tracking-wider", cat.text)}>{cat.label}</p>
                          </div>
                          <span className="shrink-0 font-mono-tech text-xs font-bold text-[var(--eva-green)]">{formatPrice(item.price)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Profesionales recomendados */}
              {recommendedPros.length > 0 && (
                <div>
                  <p className="mb-3 font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-green)]">▸ profesionales recomendados</p>
                  <div className="grid grid-cols-2 gap-2">
                    {recommendedPros.map((pro) => {
                      const cat = getCategory(pro.category);
                      return (
                        <div key={pro.id} className="flex items-center gap-3 rounded-sm border border-white/5 bg-black/40 p-3">
                          <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-sm bg-gradient-to-br font-display text-base text-white", cat.color)}>
                            {pro.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="line-clamp-1 text-xs font-bold text-white">{pro.name}</p>
                            <p className="font-mono-tech text-[9px] uppercase tracking-wider text-[var(--eva-orange)]">★ {pro.rating}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tutoriales relacionados */}
              {recommendedTutorials.length > 0 && (
                <div>
                  <p className="mb-3 font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-green)]">▸ tutoriales relacionados</p>
                  <div className="space-y-2">
                    {recommendedTutorials.map((tut, i) => {
                      const cat = getCategory(tut.category);
                      return (
                        <div key={i} className="flex items-center gap-3 rounded-sm border border-white/5 bg-black/40 p-3">
                          <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-gradient-to-br", cat.color)}>
                            <PlayCircle className="h-4 w-4 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-sm font-bold text-white">{tut.title}</p>
                            <p className="font-mono-tech text-[10px] uppercase tracking-wider text-slate-500">{tut.teacher} · {tut.duration}</p>
                          </div>
                          {tut.youtubeId ? (
                            <a
                              href={`https://www.youtube.com/watch?v=${tut.youtubeId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="shrink-0 font-mono-tech text-[9px] uppercase tracking-wider text-[var(--eva-green)] hover:underline"
                            >
                              Ver ▸
                            </a>
                          ) : (
                            <span className="shrink-0 font-mono-tech text-[9px] uppercase tracking-wider text-slate-600">Pronto</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 rounded-sm border border-white/10 bg-black/40 py-3 font-mono-tech text-xs uppercase tracking-wider text-slate-400 transition hover:bg-black/60"
                >
                  ← Ajustar
                </button>
                <button
                  type="button"
                  onClick={() => { setPage("shop"); onClose(); }}
                  className="flex-[1.5] rounded-sm bg-[var(--eva-green)] py-3 font-mono-tech text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:bg-white"
                >
                  Ir a la tienda ▸
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════════════════
function Footer({ setPage }) {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState("idle"); // idle | sending | success | error
  const [faqOpen, setFaqOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  async function handleNewsletter(e) {
    e.preventDefault();
    if (!newsletterEmail.trim() || !newsletterEmail.includes("@")) {
      setNewsletterStatus("error");
      return;
    }
    setNewsletterStatus("sending");
    await sendSubscription({
      name: "(newsletter)",
      email: newsletterEmail,
      source: "footer",
    });
    setNewsletterStatus("success");
    setNewsletterEmail("");
    // Volver a "idle" después de unos segundos para que puedan mandar otro
    setTimeout(() => setNewsletterStatus("idle"), 4000);
  }

  return (
    <>
    <footer className="relative z-10 mt-20 border-t border-white/5">
      <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        <div className="grid items-start gap-6 md:gap-10 md:grid-cols-[1.4fr_0.7fr_0.7fr_1fr]">
          {/* Columna brand */}
          <div>
            <p className="font-display text-3xl text-white">GCWM</p>
            <p className="mt-1 font-mono-tech text-[10px] uppercase tracking-[0.25em] text-[var(--eva-green)]">
              ▸ get_cosplayer_with_me
            </p>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
              Tu plataforma para aprender, crear y vivir el cosplay.
            </p>
            <div className="mt-5 flex gap-3">
              <a href="#" className="grid h-9 w-9 place-items-center rounded-sm border border-white/10 bg-black/40 text-slate-400 transition hover:border-[var(--eva-green)]/40 hover:text-[var(--eva-green)]">
                <Camera className="h-4 w-4" />
              </a>
              <a href="#" className="grid h-9 w-9 place-items-center rounded-sm border border-white/10 bg-black/40 text-slate-400 transition hover:border-[var(--eva-green)]/40 hover:text-[var(--eva-green)]">
                <PlayCircle className="h-4 w-4" />
              </a>
              <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-sm border border-white/10 bg-black/40 text-slate-400 transition hover:border-[var(--eva-green)]/40 hover:text-[var(--eva-green)]">
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Nav + Soporte: side-by-side en mobile, columnas separadas en md+ */}
          <div className="grid grid-cols-2 gap-6 md:contents">
            <div>
              <p className="mb-4 font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-green)]">▸ navegación</p>
              <div className="space-y-2 text-sm">
                <button type="button" onClick={() => setPage("home")} className="block text-slate-400 hover:text-white">Inicio</button>
                <button type="button" onClick={() => setPage("shop")} className="block text-slate-400 hover:text-white">Tienda</button>
                <button type="button" onClick={() => setPage("professionals")} className="block text-slate-400 hover:text-white">Profesionales</button>
              </div>
            </div>

            <div>
              <p className="mb-4 font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-green)]">▸ soporte</p>
              <div className="space-y-2 text-sm">
                <button type="button" onClick={() => setFaqOpen(true)} className="block text-slate-400 transition hover:text-white">FAQ</button>
                <button type="button" onClick={() => setContactOpen(true)} className="block text-slate-400 transition hover:text-white">Contacto</button>
              </div>
            </div>
          </div>

          {/* Newsletter */}
          <div>
            <p className="mb-4 font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-green)]">▸ newsletter</p>

            {newsletterStatus === "success" ? (
              <div className="rounded-sm border border-[var(--eva-green)]/30 bg-[var(--eva-green)]/5 px-3 py-3 font-mono-tech text-[11px] uppercase tracking-wider text-[var(--eva-green)]">
                ▸ sync_complete · gracias!
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-400">Novedades, lanzamientos y descuentos.</p>
                <form onSubmit={handleNewsletter} className="mt-3 flex overflow-hidden rounded-sm border border-white/10 bg-black/40 transition focus-within:border-[var(--eva-green)]/40">
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => {
                      setNewsletterEmail(e.target.value);
                      if (newsletterStatus === "error") setNewsletterStatus("idle");
                    }}
                    placeholder="tu@email.com"
                    className="min-w-0 flex-1 bg-transparent px-3 py-2.5 font-mono-tech text-xs outline-none placeholder:text-slate-600"
                    required
                    disabled={newsletterStatus === "sending"}
                  />
                  <button
                    type="submit"
                    disabled={newsletterStatus === "sending"}
                    className="shrink-0 bg-[var(--eva-green)] px-4 font-mono-tech text-xs font-bold text-black hover:bg-white disabled:opacity-50"
                  >
                    {newsletterStatus === "sending" ? "..." : "▸"}
                  </button>
                </form>
                {newsletterStatus === "error" && (
                  <p className="mt-2 font-mono-tech text-[10px] uppercase tracking-wider text-[var(--eva-orange)]">
                    ▸ email inválido
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-6 md:flex-row">
          <p className="font-mono-tech text-[10px] uppercase tracking-[0.25em] text-slate-600">
            © 2026 gcwm ▸ all systems operational
          </p>
          <p className="font-mono-tech text-[10px] uppercase tracking-[0.25em] text-slate-600">
            unit_01 ▸ buenos aires, ar
          </p>
        </div>
      </div>
    </footer>
    {faqOpen && <FAQModal onClose={() => setFaqOpen(false)} />}
    {contactOpen && <ContactModal onClose={() => setContactOpen(false)} />}
    </>
  );
}

// ═══════════════════════════════════════════════════════
// TOOLS PAGE — Generador de templates de venta
// ═══════════════════════════════════════════════════════
const SALE_CONDITIONS = ["Nuevo", "Como nuevo", "Usado", "Para piezas"];

const TEMPLATE_THEMES = {
  eva: {
    label: "EVA-01",
    gridBg: "#050507",
    cellBg: "#0d0d10",
    gridGap: 3,
    cellIconStroke: "rgba(255,255,255,0.07)",
    dataBg: "#050507",
    dataBorder: "2px solid rgba(168,255,96,0.3)",
    igColor: "#94a3b8",
    descColor: "#cbd5e1",
    priceLabel: "#64748b",
    priceColor: "#A8FF60",
    footerBorder: "rgba(255,255,255,0.05)",
    footerUrlColor: "#334155",
    footerDotColor: "#A8FF60",
    footerTagColor: "#A8FF60",
    conditions: {
      "Nuevo":       { bg: "#A8FF60", color: "#000" },
      "Como nuevo":  { bg: "#7acc44", color: "#000" },
      "Usado":       { bg: "#FF6B1A", color: "#000" },
      "Para piezas": { bg: "#dc2626", color: "#fff" },
    },
  },
  cute: {
    label: "Cute",
    gridBg: "#fde8f0",
    cellBg: "#fff0f7",
    gridGap: 4,
    cellIconStroke: "rgba(200,100,150,0.15)",
    dataBg: "#fff5f9",
    dataBorder: "2px solid #f4b8d1",
    igColor: "#a07090",
    descColor: "#6b4f6b",
    priceLabel: "#c490b0",
    priceColor: "#9b59b6",
    footerBorder: "rgba(220,140,180,0.25)",
    footerUrlColor: "#d4a0c0",
    footerDotColor: "#f4a0c0",
    footerTagColor: "#b090c0",
    conditions: {
      "Nuevo":       { bg: "#b5ead7", color: "#2d5a47" },
      "Como nuevo":  { bg: "#c7ceea", color: "#3a3d6b" },
      "Usado":       { bg: "#ffb7b2", color: "#7a2020" },
      "Para piezas": { bg: "#ff9aa2", color: "#7a2020" },
    },
  },
};

const TEMPLATE_WIDTH = 600;

const CELL_BTN = {
  width: 24, height: 24,
  backgroundColor: "rgba(0,0,0,0.72)",
  border: "1px solid rgba(255,255,255,0.22)",
  borderRadius: 3, color: "#fff", cursor: "pointer",
  fontFamily: "monospace", fontSize: 14, fontWeight: "bold",
  display: "flex", alignItems: "center", justifyContent: "center",
  lineHeight: 1, padding: 0, flexShrink: 0,
};

function DraggablePhotoCell({ src, transform, onTransformChange, containerStyle }) {
  const containerRef = useRef(null);
  const naturalRef = useRef({ w: 0, h: 0 });
  const [, setLoaded] = useState(false);

  function computeLayout(s) {
    const el = containerRef.current;
    if (!el || !naturalRef.current.w) return null;
    const cW = el.offsetWidth, cH = el.offsetHeight;
    const iW = naturalRef.current.w, iH = naturalRef.current.h;
    const coverFactor = Math.max(cW / iW, cH / iH) * s;
    const rW = iW * coverFactor, rH = iH * coverFactor;
    const maxX = Math.max(0, (rW - cW) / 2);
    const maxY = Math.max(0, (rH - cH) / 2);
    return { cW, cH, rW, rH, maxX, maxY };
  }

  function handlePointerDown(e) {
    if (e.target.closest("[data-no-export]")) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const startMx = e.clientX, startMy = e.clientY;
    const startTx = transform.x, startTy = transform.y;
    const s = transform.scale;
    function onMove(ev) {
      const layout = computeLayout(s);
      if (!layout) return;
      const { maxX, maxY } = layout;
      const newX = Math.max(-maxX, Math.min(maxX, startTx + (ev.clientX - startMx)));
      const newY = Math.max(-maxY, Math.min(maxY, startTy + (ev.clientY - startMy)));
      onTransformChange({ x: newX, y: newY });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  const s = transform.scale;
  const layout = computeLayout(s);
  const cW = layout?.cW ?? 0, cH = layout?.cH ?? 0;
  const rW = layout?.rW ?? 0, rH = layout?.rH ?? 0;
  const maxX = layout?.maxX ?? 0, maxY = layout?.maxY ?? 0;
  const canPan = maxX > 0 || maxY > 0;
  const imgLeft = layout ? (cW - rW) / 2 + transform.x : 0;
  const imgTop = layout ? (cH - rH) / 2 + transform.y : 0;

  function zoom(delta) {
    const newS = Math.max(1, Math.min(4, s + delta));
    const nl = computeLayout(newS);
    if (nl) {
      onTransformChange({
        scale: newS,
        x: Math.max(-nl.maxX, Math.min(nl.maxX, transform.x)),
        y: Math.max(-nl.maxY, Math.min(nl.maxY, transform.y)),
      });
    } else {
      onTransformChange({ scale: newS });
    }
  }

  return (
    <div
      ref={containerRef}
      data-photo-cell="true"
      style={{ ...containerStyle, position: "relative", overflow: "hidden", cursor: canPan ? "grab" : "default" }}
      onPointerDown={handlePointerDown}
    >
      <img
        src={src} alt="" draggable={false}
        onLoad={(e) => {
          naturalRef.current = { w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight };
          setLoaded(true);
        }}
        style={{
          position: "absolute",
          left: layout ? imgLeft : 0,
          top: layout ? imgTop : 0,
          width: layout ? rW : "100%",
          height: layout ? rH : "100%",
          objectFit: layout ? "fill" : "cover",
          userSelect: "none", pointerEvents: "none", display: "block",
        }}
      />
      {/* Controles — excluidos del export */}
      <div data-no-export="true" style={{ position: "absolute", top: 5, right: 5, display: "flex", gap: 3, zIndex: 10 }}>
        <button style={CELL_BTN} title="Zoom +" onClick={(e) => { e.stopPropagation(); zoom(0.25); }}>+</button>
        <button style={CELL_BTN} title="Zoom −" onClick={(e) => { e.stopPropagation(); zoom(-0.25); }}>−</button>
        <button style={{ ...CELL_BTN, fontSize: 11 }} title="Resetear"
          onClick={(e) => { e.stopPropagation(); onTransformChange({ scale: 1, x: 0, y: 0 }); }}>↺</button>
      </div>
      {canPan && (
        <div data-no-export="true" style={{
          position: "absolute", bottom: 5, left: "50%", transform: "translateX(-50%)",
          fontSize: 8, color: "rgba(255,255,255,0.5)", fontFamily: "monospace",
          textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap", pointerEvents: "none",
        }}>arrastrá para mover</div>
      )}
    </div>
  );
}

function PhotoGrid({ photos, transforms, onTransformChange, theme }) {
  const g = theme.gridGap;
  const base = { backgroundColor: theme.gridBg, padding: g };
  const empty = (key) => (
    <div key={key} style={{ overflow: "hidden", backgroundColor: theme.cellBg, aspectRatio: "1/1", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={theme.cellIconStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
      </svg>
    </div>
  );
  const draggable = (url, i, extra = {}) => (
    <DraggablePhotoCell
      key={i} src={url}
      transform={transforms[i] || { scale: 1, x: 0, y: 0 }}
      onTransformChange={(u) => onTransformChange(i, u)}
      containerStyle={{ aspectRatio: "1/1", ...extra }}
    />
  );

  const count = photos.length;

  if (count === 0) return (
    <div style={{ ...base, display: "grid", gridTemplateColumns: "1fr 1fr", gap: g }}>
      {[0,1,2,3].map(i => empty(i))}
    </div>
  );
  if (count === 1) return (
    <div style={base}>{draggable(photos[0], 0)}</div>
  );
  if (count === 2) return (
    <div style={{ ...base, display: "grid", gridTemplateColumns: "1fr 1fr", gap: g }}>
      {photos.map((url, i) => draggable(url, i))}
    </div>
  );
  if (count === 3) return (
    <div style={{ ...base, display: "grid", gridTemplateColumns: "1fr 1fr", gap: g }}>
      {draggable(photos[0], 0)}
      {draggable(photos[1], 1)}
      <DraggablePhotoCell
        key={2} src={photos[2]}
        transform={transforms[2] || { scale: 1, x: 0, y: 0 }}
        onTransformChange={(u) => onTransformChange(2, u)}
        containerStyle={{ gridColumn: "1 / -1", aspectRatio: "2/1" }}
      />
    </div>
  );
  return (
    <div style={{ ...base, display: "grid", gridTemplateColumns: "1fr 1fr", gap: g }}>
      {photos.map((url, i) => draggable(url, i))}
    </div>
  );
}

function ToolsPage() {
  const [ig, setIg] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState("Nuevo");
  const [photos, setPhotos] = useState([]);
  const [photoTransforms, setPhotoTransforms] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [themeKey, setThemeKey] = useState("eva");
  const templateRef = useRef(null);

  const theme = TEMPLATE_THEMES[themeKey];

  function handlePhotoAdd(e) {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotos((prev) => {
          if (prev.length >= 4) return prev;
          return [...prev, ev.target.result];
        });
        setPhotoTransforms((prev) => {
          if (prev.length >= 4) return prev;
          return [...prev, { scale: 1, x: 0, y: 0 }];
        });
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  function removePhoto(index) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoTransforms((prev) => prev.filter((_, i) => i !== index));
  }

  function updateTransform(index, updates) {
    setPhotoTransforms((prev) => prev.map((t, i) => i === index ? { ...t, ...updates } : t));
  }

  async function handleExport() {
    if (!templateRef.current) return;
    setExporting(true);
    try {
      const template = templateRef.current;
      const pixelRatio = 2;

      // Snapshot img positions BEFORE rendering (DOM must be stable)
      const templateRect = template.getBoundingClientRect();
      const imgSnapshots = Array.from(template.querySelectorAll("[data-photo-cell] img")).map((img) => {
        const imgRect = img.getBoundingClientRect();
        const cellRect = img.closest("[data-photo-cell]").getBoundingClientRect();
        return { img, imgRect, cellRect };
      });

      // Render layout without <img> elements (avoids iOS SVG foreignObject bug)
      const canvas = await toCanvas(template, {
        pixelRatio,
        cacheBust: true,
        width: TEMPLATE_WIDTH,
        filter: (node) => {
          if (typeof node.getAttribute !== "function") return true;
          if (node.getAttribute("data-no-export") === "true") return false;
          if (node.tagName === "IMG") return false;
          return true;
        },
      });

      // Scale factor: CSS px → canvas px
      const scale = (TEMPLATE_WIDTH / templateRect.width) * pixelRatio;
      const ctx = canvas.getContext("2d");

      for (const { img, imgRect, cellRect } of imgSnapshots) {
        if (!img.complete || !img.naturalWidth) continue;

        // Clip canvas to the cell bounds so overflow stays hidden
        const cx = (cellRect.left - templateRect.left) * scale;
        const cy = (cellRect.top - templateRect.top) * scale;
        const cw = cellRect.width * scale;
        const ch = cellRect.height * scale;

        // Image destination on canvas
        const ix = (imgRect.left - templateRect.left) * scale;
        const iy = (imgRect.top - templateRect.top) * scale;
        const iw = imgRect.width * scale;
        const ih = imgRect.height * scale;

        ctx.save();
        ctx.beginPath();
        ctx.rect(cx, cy, cw, ch);
        ctx.clip();
        ctx.drawImage(img, ix, iy, iw, ih);
        ctx.restore();
      }

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `gcwm-venta-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExporting(false);
    }
  }

  const formattedPrice = price
    ? new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number(price))
    : "";

  const condStyle = theme.conditions[condition];
  const canExport = photos.length > 0 || price || description;

  return (
    <section className="relative z-10 mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="font-mono-tech text-[11px] uppercase tracking-[0.3em] text-[var(--eva-green)]">▸ gcwm_tools</p>
        <h1 className="mt-2 font-display text-5xl tracking-tight text-white md:text-7xl">Herramientas</h1>
        <p className="mt-4 max-w-lg text-sm leading-7 text-slate-400">
          Generá un template profesional para vender tus materiales, pelucas o piezas en grupos de Facebook e Instagram.
        </p>
      </motion.div>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        {/* ── FORMULARIO ── */}
        <div className="space-y-6">

          {/* Fotos — compacto, la edición pasa en el preview */}
          <div>
            <p className="mb-3 font-mono-tech text-[10px] uppercase tracking-[0.25em] text-slate-400">
              Fotos del producto <span className="text-slate-600">({photos.length}/4)</span>
            </p>
            {photos.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {photos.map((url, i) => (
                  <div key={i} className="group relative">
                    <img src={url} alt="" className="h-14 w-14 rounded-sm border border-white/10 object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-red-600 text-white"
                      aria-label="Eliminar foto"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {photos.length < 4 && (
              <label className="flex cursor-pointer items-center gap-3 rounded-sm border border-dashed border-white/20 px-4 py-3 text-slate-500 transition hover:border-[var(--eva-green)]/50 hover:text-[var(--eva-green)]">
                <Camera className="h-5 w-5 shrink-0" />
                <span className="font-mono-tech text-[10px] uppercase tracking-wider">
                  {photos.length === 0 ? "Agregar fotos (hasta 4)" : "Agregar más"}
                </span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoAdd} />
              </label>
            )}
            {photos.length > 0 && (
              <p className="mt-2 font-mono-tech text-[9px] uppercase tracking-[0.15em] text-slate-600">
                Usá + / − y arrastre en el preview para ajustar cada foto
              </p>
            )}
          </div>

          {/* Instagram */}
          <div>
            <label className="mb-2 block font-mono-tech text-[10px] uppercase tracking-[0.25em] text-slate-400">Instagram</label>
            <div className="flex items-center rounded-sm border border-white/10 bg-black/40 focus-within:border-[var(--eva-green)]/40">
              <span className="pl-3 font-mono-tech text-sm text-slate-500">@</span>
              <input
                type="text"
                value={ig}
                onChange={(e) => setIg(e.target.value.replace(/^@+/, ""))}
                placeholder="tu_usuario"
                className="flex-1 bg-transparent px-2 py-2.5 font-mono-tech text-sm text-white outline-none placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Precio */}
          <div>
            <label className="mb-2 block font-mono-tech text-[10px] uppercase tracking-[0.25em] text-slate-400">Precio (ARS)</label>
            <input
              type="number" min="0" value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="15000"
              className="w-full rounded-sm border border-white/10 bg-black/40 px-3 py-2.5 font-mono-tech text-sm text-white outline-none placeholder:text-slate-600 focus:border-[var(--eva-green)]/40"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="mb-2 block font-mono-tech text-[10px] uppercase tracking-[0.25em] text-slate-400">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Peluca de Asuka, naranja, usada dos veces, largo hasta la cintura. Acepto contraoferta."
              rows={4}
              className="w-full resize-none rounded-sm border border-white/10 bg-black/40 px-3 py-2.5 font-mono-tech text-sm text-white outline-none placeholder:text-slate-600 focus:border-[var(--eva-green)]/40"
            />
          </div>

          {/* Estado */}
          <div>
            <p className="mb-3 font-mono-tech text-[10px] uppercase tracking-[0.25em] text-slate-400">Estado del producto</p>
            <div className="flex flex-wrap gap-2">
              {SALE_CONDITIONS.map((c) => {
                const s = theme.conditions[c];
                const active = condition === c;
                return (
                  <button key={c} type="button" onClick={() => setCondition(c)}
                    style={active ? { backgroundColor: s.bg, color: s.color } : {}}
                    className={cn("rounded-sm px-4 py-2 font-mono-tech text-xs uppercase tracking-[0.15em] transition",
                      active ? "font-bold" : "border border-white/10 bg-black/40 text-slate-400 hover:border-white/30 hover:text-white")}>
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Estilo */}
          <div>
            <p className="mb-3 font-mono-tech text-[10px] uppercase tracking-[0.25em] text-slate-400">Estilo del template</p>
            <div className="flex gap-2">
              {Object.entries(TEMPLATE_THEMES).map(([key, t]) => (
                <button key={key} type="button" onClick={() => setThemeKey(key)}
                  className={cn("rounded-sm px-5 py-2 font-mono-tech text-xs uppercase tracking-[0.15em] transition",
                    themeKey === key
                      ? "bg-[var(--eva-green)] font-bold text-black"
                      : "border border-white/10 bg-black/40 text-slate-400 hover:border-white/30 hover:text-white")}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Exportar */}
          <button type="button" onClick={handleExport} disabled={exporting || !canExport}
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-[var(--eva-green)] px-6 py-3 font-mono-tech text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40">
            <Download className="h-4 w-4" />
            {exporting ? "Generando imagen..." : "Descargar imagen ▸"}
          </button>
        </div>

        {/* ── PREVIEW ── */}
        <div>
          <p className="mb-3 font-mono-tech text-[10px] uppercase tracking-[0.25em] text-slate-400">
            Vista previa — editá zoom y posición directo en cada foto
          </p>
          <div className="overflow-x-auto rounded-sm border border-white/10 shadow-2xl shadow-black/60">
            <div ref={templateRef} style={{ width: TEMPLATE_WIDTH, fontFamily: "monospace", flexShrink: 0 }}>
              <PhotoGrid
                photos={photos}
                transforms={photoTransforms}
                onTransformChange={updateTransform}
                theme={theme}
              />

              {/* BLOQUE DE DATOS */}
              <div style={{ borderTop: theme.dataBorder, backgroundColor: theme.dataBg, padding: "20px 24px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <span style={{
                    backgroundColor: condStyle.bg, color: condStyle.color,
                    fontFamily: "monospace", fontSize: 10, fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.15em",
                    padding: "4px 10px", borderRadius: 2,
                  }}>{condition}</span>
                  {ig && <span style={{ fontFamily: "monospace", fontSize: 11, color: theme.igColor }}>@{ig}</span>}
                </div>

                {description && (
                  <p style={{ fontFamily: "monospace", fontSize: 12, color: theme.descColor, lineHeight: 1.7, margin: "0 0 14px", whiteSpace: "pre-wrap" }}>
                    {description}
                  </p>
                )}

                {formattedPrice && (
                  <div style={{ marginBottom: 14 }}>
                    <span style={{ fontFamily: "monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: theme.priceLabel }}>Precio</span>
                    <p style={{ fontFamily: "monospace", fontSize: 26, fontWeight: 900, color: theme.priceColor, margin: "2px 0 0", letterSpacing: "-0.02em" }}>
                      {formattedPrice}
                    </p>
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${theme.footerBorder}`, paddingTop: 10, marginTop: 4 }}>
                  <span style={{ fontFamily: "monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.3em", color: theme.footerUrlColor }}>
                    {SITE_URL}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: theme.footerDotColor }} />
                    <span style={{ fontFamily: "monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.25em", color: theme.footerTagColor }}>
                      get cosplayer with me
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-3 font-mono-tech text-[9px] uppercase tracking-[0.2em] text-slate-600">
            Los botones de edición no aparecen en la imagen exportada.
          </p>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════
function getStateFromHash() {
  const h = window.location.hash.replace("#", "");
  if (h.startsWith("category-")) {
    const catId = h.replace("category-", "");
    return {
      page: "category",
      category: ["pelucas", "electronica", "tela", "props"].includes(catId) ? catId : "pelucas",
    };
  }
  return {
    page: ["home", "shop", "professionals", "community", "tools"].includes(h) ? h : "home",
    category: "pelucas",
  };
}

// ═══════════════════════════════════════════════════════
// COMUNIDAD — dashboard "próximamente"
// ═══════════════════════════════════════════════════════
const COMMUNITY_CATEGORIES = [
  "Stand", "Evento", "Cosplayer", "Artista", "Cosmaker", "Wigmaker", "Propmaker",
];

function CommunityPage() {
  const features = [
    { icon: Clock,     label: "Eventos",        desc: "Convenciones, meet-ups y actividades cosplay en Argentina.", color: "text-[var(--eva-green)]",  border: "border-[var(--eva-green)]/20",  bg: "bg-[var(--eva-green)]/5" },
    { icon: ShoppingBag, label: "Stores",        desc: "Tiendas oficiales y vendedores de materiales e insumos.",   color: "text-[var(--eva-orange)]", border: "border-[var(--eva-orange)]/20", bg: "bg-[var(--eva-orange)]/5" },
    { icon: Zap,       label: "Emprendimientos", desc: "Proyectos y marcas emergentes dentro del mundo cosplay.",   color: "text-[var(--eva-purple)]", border: "border-[var(--eva-purple)]/20", bg: "bg-[var(--eva-purple)]/5" },
    { icon: Sparkles,  label: "Artistas",        desc: "Ilustradores, diseñadores y creadores de contenido.",       color: "text-[var(--eva-green)]",  border: "border-[var(--eva-green)]/20",  bg: "bg-[var(--eva-green)]/5" },
    { icon: Users,     label: "Cosplayers",      desc: "Perfiles de la comunidad: builds, fotos y proyectos.",      color: "text-[var(--eva-orange)]", border: "border-[var(--eva-orange)]/20", bg: "bg-[var(--eva-orange)]/5" },
    { icon: Wand2,     label: "Novedades",       desc: "Anuncios, lanzamientos y actualizaciones de la plataforma.", color: "text-[var(--eva-purple)]", border: "border-[var(--eva-purple)]/20", bg: "bg-[var(--eva-purple)]/5" },
  ];

  const [formOpen, setFormOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [email, setInstagram] = useState("");
  const [igHandle, setIgHandle] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | success

  async function handleSubmit(e) {
    e.preventDefault();
    if (!category || !name.trim() || !email.trim()) return;
    setStatus("sending");
    await sendSubscription({ name: name.trim(), instagram: igHandle.trim(), email: email.trim(), source: `community-${category.toLowerCase()}` });
    setStatus("success");
  }

  return (
    <section className="relative z-10 mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="font-mono-tech text-[11px] uppercase tracking-[0.3em] text-[var(--eva-green)]">▸ gcwm_network</p>
        <h1 className="mt-2 font-display text-5xl tracking-tight text-white md:text-7xl">Comunidad</h1>
        <p className="mt-4 max-w-lg text-sm leading-7 text-slate-400">
          El espacio donde se va a reunir todo el ecosistema cosplay argentino. Esto es lo que está por venir.
        </p>
      </motion.div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className={cn("relative overflow-hidden rounded-sm border p-6", f.border, f.bg)}
            >
              <div className="pointer-events-none absolute left-0 top-0 h-4 w-4 border-l-2 border-t-2 border-current opacity-30" />
              <div className="pointer-events-none absolute right-0 top-0 h-4 w-4 border-r-2 border-t-2 border-current opacity-30" />
              <div className={cn("mb-4 flex h-12 w-12 items-center justify-center rounded-sm border", f.border)}>
                <Icon className={cn("h-6 w-6", f.color)} />
              </div>
              <h3 className="font-display text-2xl text-white">{f.label}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{f.desc}</p>
              <div className="mt-5">
                <span className="rounded-sm border border-white/10 bg-black/40 px-2.5 py-1 font-mono-tech text-[9px] uppercase tracking-[0.2em] text-slate-500">
                  Próximamente
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* CTA con formulario inline */}
      <div className="mt-10 rounded-sm border border-[var(--eva-green)]/20 bg-[var(--eva-green)]/5">
        {/* Header del CTA */}
        <div className="flex flex-col items-start gap-4 p-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-green)]">▸ en desarrollo</p>
            <p className="mt-1 font-display text-2xl text-white">¿Querés formar parte?</p>
            <p className="mt-1 text-sm text-slate-400">Dejanos tus datos y te avisamos cuando abramos tu sección.</p>
          </div>
          {!formOpen && status !== "success" && (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="shrink-0 rounded-sm bg-[var(--eva-green)] px-6 py-3 font-mono-tech text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:bg-white"
            >
              Avisame ▸
            </button>
          )}
        </div>

        {/* Formulario */}
        {formOpen && status !== "success" && (
          <form
            onSubmit={handleSubmit}
            className="border-t border-[var(--eva-green)]/10 px-8 pb-8 pt-6"
          >
            {/* Categoría */}
            <p className="mb-3 font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-green)]">▸ soy…</p>
            <div className="mb-5 flex flex-wrap gap-2">
              {COMMUNITY_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "rounded-sm border px-3 py-1.5 font-mono-tech text-[11px] uppercase tracking-[0.15em] transition",
                    category === cat
                      ? "border-[var(--eva-green)] bg-[var(--eva-green)] text-black"
                      : "border-white/10 bg-black/40 text-slate-400 hover:border-[var(--eva-green)]/40 hover:text-white"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Nombre e Instagram */}
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Nombre o alias *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="rounded-sm border border-white/10 bg-black/40 px-4 py-3 font-mono-tech text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-[var(--eva-green)]/50"
              />
              <input
                type="email"
                placeholder="Email *"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                required
                className="rounded-sm border border-white/10 bg-black/40 px-4 py-3 font-mono-tech text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-[var(--eva-green)]/50"
              />
            </div>
            <div className="mb-4">
              <input
                type="text"
                placeholder="@instagram (opcional)"
                value={igHandle}
                onChange={(e) => setIgHandle(e.target.value)}
                className="w-full rounded-sm border border-white/10 bg-black/40 px-4 py-3 font-mono-tech text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-[var(--eva-green)]/50"
              />
            </div>

            {/* Acciones */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-sm border border-white/10 bg-black/40 px-4 py-3 font-mono-tech text-xs uppercase tracking-wider text-slate-400 transition hover:bg-black/60"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!category || !name.trim() || !email.trim() || status === "sending"}
                className="flex-1 rounded-sm bg-[var(--eva-green)] py-3 font-mono-tech text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:bg-white disabled:opacity-40"
              >
                {status === "sending" ? "Enviando…" : "Enviar ▸"}
              </button>
            </div>
          </form>
        )}

        {/* Estado success */}
        {status === "success" && (
          <div className="border-t border-[var(--eva-green)]/10 px-8 pb-8 pt-6">
            <p className="font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-green)]">▸ recibido</p>
            <p className="mt-2 font-display text-xl text-white">¡Listo, {name}!</p>
            <p className="mt-1 text-sm text-slate-400">Te avisamos cuando abramos la sección de <span className="text-white">{category}</span>.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default function GCWMHomepageMockup() {
  const [page, setPage] = useState(() => getStateFromHash().page);
  const [activeCategory, setActiveCategory] = useState(() => getStateFromHash().category);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [buildOpen, setBuildOpen] = useState(false);

  // Carrito persistente: lee de localStorage al iniciar
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem("gcwm-cart");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Guardar cart cada vez que cambia
  useEffect(() => {
    try {
      localStorage.setItem("gcwm-cart", JSON.stringify(cart));
    } catch {
      // Si localStorage falla (modo incógnito, etc.) seguimos sin error
    }
  }, [cart]);

  // Wishlist persistente
  const [wishlist, setWishlist] = useState(() => {
    try {
      const s = localStorage.getItem("gcwm-wishlist");
      return s ? new Set(JSON.parse(s)) : new Set();
    } catch { return new Set(); }
  });
  useEffect(() => {
    try { localStorage.setItem("gcwm-wishlist", JSON.stringify([...wishlist])); } catch {}
  }, [wishlist]);
  function toggleWishlist(id) {
    setWishlist((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Sincronizar estado cuando el usuario navega con botones del navegador
  useEffect(() => {
    function onHashChange() {
      const { page: p, category: c } = getStateFromHash();
      setPage(p);
      setActiveCategory(c);
      window.scrollTo({ top: 0, behavior: "auto" });
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const cartCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  function changePage(nextPage) {
    setPage(nextPage);
    window.location.hash = nextPage;
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function openCategory(categoryId) {
    setActiveCategory(categoryId);
    setPage("category");
    window.location.hash = `category-${categoryId}`;
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  // Back button de Android: cierra modal → vuelve a home → sale de la app.
  // Es no-op en web.
  useAndroidBackButton(() => {
    if (buildOpen) return setBuildOpen(false);
    if (searchOpen) return setSearchOpen(false);
    if (cartOpen) return setCartOpen(false);
    if (page !== "home") return changePage("home");
    exitApp();
  });

  return (
    <main className="min-h-screen bg-[var(--eva-black)] text-white">
      {/* Wrapper de glows: overflow-hidden DENTRO de un fixed,
          asi no rompe el sticky del header */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 h-[500px] w-[500px] rounded-full bg-[var(--eva-purple)]/30 blur-[120px]" />
        <div className="absolute top-40 -right-20 h-[400px] w-[400px] rounded-full bg-[var(--eva-green)]/8 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-[var(--eva-orange)]/10 blur-[120px]" />
        <div className="absolute inset-0 eva-grid-bg opacity-50" />
      </div>

      <Header
        page={page}
        setPage={changePage}
        openCategory={openCategory}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenBuild={() => setBuildOpen(true)}
      />
      {page === "home" && <HomePage setPage={changePage} openCategory={openCategory} />}
      {page === "shop" && <ShopPage cart={cart} setCart={setCart} wishlist={wishlist} toggleWishlist={toggleWishlist} />}
      {page === "professionals" && <ProfessionalsPage />}
      {page === "category" && <CategoryPage activeCategoryId={activeCategory} setPage={changePage} openCategory={openCategory} />}
      {page === "community" && <CommunityPage />}
      {page === "tools" && <ToolsPage />}
      <Footer setPage={changePage} />
      <SubscriptionModal />
      {cartOpen && <CartModal cart={cart} setCart={setCart} onClose={() => setCartOpen(false)} wishlist={wishlist} toggleWishlist={toggleWishlist} />}
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} setPage={changePage} openCategory={openCategory} />}
      {buildOpen && <BuildWizard onClose={() => setBuildOpen(false)} setPage={changePage} openCategory={openCategory} />}
    </main>
  );
}
