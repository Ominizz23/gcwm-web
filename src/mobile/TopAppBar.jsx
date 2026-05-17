import React from "react";
import { ChevronLeft, Search, ShoppingBag } from "lucide-react";
import { haptic } from "../native.js";

// Header mobile: back arrow contextual + título + acciones (search + cart).
// Sticky, con safe-area-inset-top para edge-to-edge.
export default function TopAppBar({
  title,
  showBack,
  onBack,
  cartCount = 0,
  onOpenCart,
  onOpenSearch,
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--eva-green)]/15 bg-black/90 backdrop-blur-xl pt-safe">
      <div className="flex items-center gap-3 px-4 py-3">
        {showBack ? (
          <button
            type="button"
            onClick={() => {
              haptic("light");
              onBack?.();
            }}
            aria-label="Volver"
            className="-ml-2 grid h-10 w-10 place-items-center rounded-full text-white transition active:bg-white/10"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        ) : (
          <div className="grid h-10 w-10 place-items-center">
            <span className="font-display text-[22px] leading-none text-white">G</span>
          </div>
        )}

        <h1 className="flex-1 truncate font-display text-xl uppercase tracking-wide text-white">
          {title}
        </h1>

        <button
          type="button"
          onClick={() => {
            haptic("light");
            onOpenSearch?.();
          }}
          aria-label="Buscar"
          className="grid h-10 w-10 place-items-center rounded-full text-slate-300 transition active:bg-white/10"
        >
          <Search className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => {
            haptic("light");
            onOpenCart?.();
          }}
          aria-label="Abrir carrito"
          className="relative grid h-10 w-10 place-items-center rounded-full text-slate-300 transition active:bg-white/10"
        >
          <ShoppingBag className="h-5 w-5" />
          {cartCount > 0 && (
            <span className="absolute right-1 top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-[var(--eva-orange)] px-1 text-[10px] font-black leading-none text-black shadow-[0_0_10px_var(--eva-orange-glow)]">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
