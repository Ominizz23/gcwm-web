import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { haptic } from "../native.js";

// Bottom sheet: slide-up desde abajo con backdrop tappable.
// Para modales secundarios (suscripción, contacto, FAQ).
export default function BottomSheet({ title, onClose, children, open = true }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function handleClose() {
    haptic("light");
    onClose?.();
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <motion.button
            type="button"
            aria-label="Cerrar"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative max-h-[88vh] overflow-y-auto rounded-t-2xl border-t border-[var(--eva-green)]/30 bg-[var(--eva-black)] pb-safe shadow-[0_-20px_60px_rgba(0,0,0,0.8)]"
          >
            {/* Grab handle */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Cerrar"
              className="mx-auto block w-full pt-3 pb-1"
            >
              <span className="mx-auto block h-1 w-10 rounded-full bg-white/20" />
            </button>

            {title && (
              <div className="px-5 pb-2">
                <p className="font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-green)]">
                  ▸ {title}
                </p>
              </div>
            )}

            <div className="px-5 pb-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
