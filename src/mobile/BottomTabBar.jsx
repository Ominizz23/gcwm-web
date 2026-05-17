import React from "react";
import { Home, ShoppingBag, Users, Menu } from "lucide-react";
import { haptic } from "../native.js";

// 4 tabs fijos: Inicio, Catálogo, Pros, Más.
// Sticky abajo con safe-area-inset-bottom para gesture nav bar.
const TABS = [
  { id: "home", label: "Inicio", Icon: Home },
  { id: "shop", label: "Catálogo", Icon: ShoppingBag },
  { id: "professionals", label: "Pros", Icon: Users },
  { id: "more", label: "Más", Icon: Menu },
];

export default function BottomTabBar({ active, onSelect }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--eva-green)]/15 bg-black/95 backdrop-blur-xl pb-safe">
      <div className="flex">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                if (!isActive) haptic("light");
                onSelect(id);
              }}
              className="flex flex-1 flex-col items-center gap-1 py-2.5 transition active:bg-white/5"
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={
                  "h-5 w-5 transition-colors " +
                  (isActive ? "text-[var(--eva-green)]" : "text-slate-500")
                }
              />
              <span
                className={
                  "font-mono-tech text-[9px] uppercase tracking-[0.18em] transition-colors " +
                  (isActive ? "text-[var(--eva-green)]" : "text-slate-500")
                }
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
