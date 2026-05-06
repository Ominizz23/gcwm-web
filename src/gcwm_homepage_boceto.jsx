import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Images,
  Instagram,
  Link2,
  Mail,
  Menu,
  MessageCircle,
  PlayCircle,
  Search,
  ShoppingBag,
  Sparkles,
  User,
  Users,
  X,
} from "lucide-react";

import { categories, getCategory } from "./data/categories";
import { tutorials } from "./data/tutorials";
import { products as shopItems } from "./data/products";
import { professionals } from "./data/professionals";

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
    await fetch(SUBSCRIPTION_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        name,
        instagram,
        email,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (err) {
    // mode no-cors hace que no podamos leer la respuesta
    // pero los datos igual llegan a la sheet
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
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
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
function Header({ page, setPage, openCategory, cartCount }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 16);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [page]);

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

          <nav className="hidden items-center gap-8 md:flex">
            {navButton("home", "Inicio")}
            <DisciplinesMenu openCategory={openCategory} isCategoryActive={page === "category"} />
            {navButton("shop", "Tienda")}
            {navButton("professionals", "Profesionales")}
            <button
              type="button"
              onClick={() => setPage("home")}
              className="font-mono-tech text-xs uppercase tracking-[0.2em] text-slate-400 transition-colors hover:text-[var(--eva-green)]"
            >
              Comunidad
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPage("shop")}
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
              className="hidden rounded-lg border border-[var(--eva-green)]/40 bg-[var(--eva-green)]/10 px-4 py-2 font-mono-tech text-xs uppercase tracking-[0.15em] text-[var(--eva-green)] transition-colors hover:bg-[var(--eva-green)]/20 md:block"
            >
              Sync ▸
            </button>

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="rounded-lg border border-white/10 bg-black/40 p-2.5 transition-colors hover:border-[var(--eva-green)]/50 hover:bg-[var(--eva-green)]/5 md:hidden"
              aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

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

              <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-[var(--eva-purple-deep)] via-black to-[var(--eva-purple)]/50 p-6 md:p-8 eva-scanline">
                <div className="absolute inset-0 eva-grid-bg opacity-30" />

                <div className="relative flex h-full flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 rounded-sm border border-[var(--eva-orange)]/40 bg-black/60 px-3 py-1.5">
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
                    <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">
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
              <span className="font-mono-tech text-[10px] uppercase tracking-[0.2em] text-slate-500">▸ signal_locked</span>
              <span className="font-mono-tech text-[10px] uppercase tracking-[0.2em] text-[var(--eva-green)]">unit_01_ready</span>
            </div>
          </motion.div>
        </div>
      </section>

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
        <div className="rounded-sm border border-white/5 bg-gradient-to-b from-[var(--eva-charcoal)]/60 to-black/60 p-6 backdrop-blur-xl md:p-10">
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
        <div className="rounded-sm border border-white/5 bg-gradient-to-b from-[var(--eva-charcoal)]/60 to-black/60 p-6 backdrop-blur-xl md:p-8">
          <p className={cn("font-mono-tech text-[11px] uppercase tracking-[0.3em]", category.text)}>▸ cursos</p>
          <h2 className="mt-2 mb-8 font-display text-3xl text-white md:text-4xl">Rutas de aprendizaje</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {categoryTutorials.map((tutorial) => (
              <CourseCard key={tutorial.title} tutorial={tutorial} />
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-sm border border-white/5 bg-gradient-to-b from-[var(--eva-charcoal)]/60 to-black/60 p-6 backdrop-blur-xl">
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
          <div className="rounded-sm border border-white/5 bg-gradient-to-b from-[var(--eva-charcoal)]/60 to-black/60 p-6 backdrop-blur-xl">
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
function ShopPage({ cart, setCart }) {
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
        <aside className="h-fit rounded-sm border border-white/5 bg-gradient-to-b from-[var(--eva-charcoal)]/60 to-black/60 p-5 backdrop-blur-xl">
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

        <aside className="h-fit rounded-sm border border-[var(--eva-green)]/20 bg-gradient-to-b from-[var(--eva-charcoal)] to-black p-5 backdrop-blur-xl">
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
        className="absolute inset-0 bg-black/95 backdrop-blur-md"
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
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
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
// FOOTER
// ═══════════════════════════════════════════════════════
function Footer({ setPage }) {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState("idle"); // idle | sending | success | error

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
              <div className="space-y-2 text-sm text-slate-400">
                <p>FAQ</p>
                <p>Contacto</p>
                <p>Pagos</p>
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
  );
}

// ═══════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════
export default function GCWMHomepageMockup() {
  const [page, setPage] = useState("home");
  const [activeCategory, setActiveCategory] = useState("pelucas");

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

  const cartCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  function changePage(nextPage) {
    setPage(nextPage);
    // "auto" en vez de "smooth" para evitar el bug de rebote
    // que pasaba al cambiar de página rápido
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function openCategory(categoryId) {
    setActiveCategory(categoryId);
    setPage("category");
    window.scrollTo({ top: 0, behavior: "auto" });
  }

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
      />
      {page === "home" && <HomePage setPage={changePage} openCategory={openCategory} />}
      {page === "shop" && <ShopPage cart={cart} setCart={setCart} />}
      {page === "professionals" && <ProfessionalsPage />}
      {page === "category" && <CategoryPage activeCategoryId={activeCategory} setPage={changePage} openCategory={openCategory} />}
      <Footer setPage={changePage} />
      <SubscriptionModal />
    </main>
  );
}
