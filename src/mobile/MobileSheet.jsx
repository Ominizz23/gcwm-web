import React, { useEffect } from "react";
import { ChevronLeft, X } from "lucide-react";
import { haptic } from "../native.js";

// Sheet full-screen para modales en mobile (Cart, Search, BuildWizard).
// Mismo lenguaje visual que TopAppBar: back arrow + título + acción derecha.
// Bloquea scroll del body mientras está abierto.
export default function MobileSheet({
  title,
  onClose,
  children,
  rightAction,
  closeIcon = "back",
  footer,
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function handleClose() {
    haptic("light");
    onClose?.();
  }

  const Icon = closeIcon === "x" ? X : ChevronLeft;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--eva-black)] text-white">
      {/* Glow de fondo consistente con el resto del shell mobile */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 h-[500px] w-[500px] rounded-full bg-[var(--eva-purple)]/30 blur-[120px]" />
        <div className="absolute top-40 -right-20 h-[400px] w-[400px] rounded-full bg-[var(--eva-green)]/8 blur-[120px]" />
        <div className="absolute inset-0 eva-grid-bg opacity-50" />
      </div>

      <header className="relative z-10 sticky top-0 border-b border-[var(--eva-green)]/15 bg-black/90 backdrop-blur-xl pt-safe">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={handleClose}
            aria-label="Cerrar"
            className="-ml-2 grid h-10 w-10 place-items-center rounded-full text-white transition active:bg-white/10"
          >
            <Icon className="h-6 w-6" />
          </button>
          <h1 className="flex-1 truncate font-display text-xl uppercase tracking-wide text-white">
            {title}
          </h1>
          {rightAction}
        </div>
      </header>

      <div className="relative z-10 flex-1 overflow-y-auto">
        {children}
      </div>

      {footer && (
        <div className="relative z-10 border-t border-white/10 bg-black/95 backdrop-blur-xl pb-safe">
          {footer}
        </div>
      )}

      {!footer && <div className="pb-safe" />}
    </div>
  );
}
