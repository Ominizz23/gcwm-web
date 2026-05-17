import React from "react";
import {
  ChevronRight,
  Users,
  Wrench,
  Wand2,
  MessageCircle,
  Mail,
  Sparkles,
} from "lucide-react";
import { haptic, share } from "../native.js";
import { categories } from "../data/categories";

// Pantalla "Más": lista vertical de accesos secundarios.
// Reemplaza al footer + a los items del header web que no van en el tab bar.
export default function MoreScreen({
  setPage,
  openCategory,
  onOpenBuild,
  onOpenContact,
  onOpenFAQ,
}) {
  function row({ Icon, label, sub, onClick, accent }) {
    return (
      <button
        key={label}
        type="button"
        onClick={() => {
          haptic("light");
          onClick?.();
        }}
        className="flex w-full items-center gap-4 border-b border-white/5 px-5 py-4 text-left transition active:bg-white/5"
      >
        <span
          className={
            "grid h-10 w-10 shrink-0 place-items-center rounded-sm border " +
            (accent
              ? "border-[var(--eva-orange)]/40 bg-[var(--eva-orange)]/10 text-[var(--eva-orange)]"
              : "border-[var(--eva-green)]/30 bg-[var(--eva-green)]/5 text-[var(--eva-green)]")
          }
        >
          <Icon className="h-5 w-5" />
        </span>
        <span className="flex-1">
          <span className="block font-display text-base uppercase tracking-wide text-white">
            {label}
          </span>
          {sub && (
            <span className="font-mono-tech text-[10px] uppercase tracking-[0.2em] text-slate-500">
              {sub}
            </span>
          )}
        </span>
        <ChevronRight className="h-5 w-5 text-slate-600" />
      </button>
    );
  }

  return (
    <div className="pb-8">
      <section className="px-5 pt-6 pb-3">
        <p className="font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-green)]">
          ▸ disciplinas
        </p>
      </section>
      <div>
        {categories.map((cat) =>
          row({
            Icon: cat.icon,
            label: cat.label,
            sub: cat.shortLabel,
            onClick: () => openCategory(cat.id),
          })
        )}
      </div>

      <section className="px-5 pt-8 pb-3">
        <p className="font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-green)]">
          ▸ explorar
        </p>
      </section>
      <div>
        {row({
          Icon: Wand2,
          label: "Build Wizard",
          sub: "Diseñá tu próximo cosplay",
          accent: true,
          onClick: onOpenBuild,
        })}
        {row({
          Icon: Users,
          label: "Comunidad",
          sub: "Conectá con otros cosplayers",
          onClick: () => setPage("community"),
        })}
        {row({
          Icon: Wrench,
          label: "Herramientas",
          sub: "Generador de templates",
          onClick: () => setPage("tools"),
        })}
      </div>

      <section className="px-5 pt-8 pb-3">
        <p className="font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[var(--eva-green)]">
          ▸ soporte
        </p>
      </section>
      <div>
        {row({
          Icon: MessageCircle,
          label: "Contacto",
          sub: "Hablanos por WhatsApp o email",
          onClick: onOpenContact,
        })}
        {row({
          Icon: Mail,
          label: "FAQ",
          sub: "Preguntas frecuentes",
          onClick: onOpenFAQ,
        })}
        {row({
          Icon: Sparkles,
          label: "Compartir GCWM",
          sub: "Pasale la app a otros",
          onClick: () =>
            share({
              title: "GCWM — Get Cosplayer With Me",
              text: "Academia visual de cosplay, props, pelucas y electrónica.",
              url: "https://ominizz23.github.io/gcwm-web",
            }),
        })}
      </div>

      <p className="px-5 pt-10 text-center font-mono-tech text-[9px] uppercase tracking-[0.3em] text-slate-700">
        unit_01 ▸ all systems operational
      </p>
    </div>
  );
}
