import { Scissors, Zap, Shirt, Wand2 } from "lucide-react";

// Paleta EVA-01: violeta profundo (cuerpo), verde neón (ojos),
// magenta oscuro (sombras internas), naranja (franja del torso)

export const categories = [
  {
    id: "pelucas",
    label: "Wig Lab",
    shortLabel: "Pelucas",
    icon: Scissors,
    // Violeta profundo EVA — color del cuerpo
    color: "from-violet-700 via-purple-700 to-violet-900",
    text: "text-violet-300",
    border: "border-violet-400/40",
    bg: "bg-violet-500/10",
    accent: "#9D5BFF",
    description:
      "Corte, styling, lace front, volumen y peinados inspirados en personajes de anime y gaming.",
    longDescription:
      "Un laboratorio de pelucas para aprender preparación, corte, volumen, spikes, lace front, accesorios y mantenimiento.",
  },
  {
    id: "electronica",
    label: "Tech Props",
    shortLabel: "Electrónica",
    icon: Zap,
    // Verde neón EVA — el ojo, la señal viva
    color: "from-lime-400 via-green-500 to-emerald-600",
    text: "text-lime-300",
    border: "border-lime-400/40",
    bg: "bg-lime-500/10",
    accent: "#A8FF60",
    description:
      "LEDs, Arduino, baterías, sonido y efectos para props mágicos, futuristas o de fantasía.",
    longDescription:
      "Efectos LED, Arduino, alimentación segura, pantallas, sonido, sensores y electrónica aplicada a props cosplay.",
  },
  {
    id: "tela",
    label: "Costume Atelier",
    shortLabel: "Tela & costura",
    icon: Shirt,
    // Magenta/púrpura profundo — sombras internas de la armadura
    color: "from-fuchsia-800 via-purple-900 to-violet-950",
    text: "text-fuchsia-300",
    border: "border-fuchsia-400/30",
    bg: "bg-fuchsia-500/10",
    accent: "#C026D3",
    description:
      "Telas, moldes, costura, ajustes y terminaciones para trajes cosplay cómodos y fieles al personaje.",
    longDescription:
      "Un atelier digital para aprender telas, moldes, costuras, cierres, calce y detalles textiles de personaje.",
  },
  {
    id: "props",
    label: "Prop Forge",
    shortLabel: "Props",
    icon: Wand2,
    // Naranja vibrante — la franja del torso
    color: "from-orange-400 via-orange-600 to-red-700",
    text: "text-orange-300",
    border: "border-orange-400/40",
    bg: "bg-orange-500/10",
    accent: "#FF6B1A",
    description:
      "EVA, impresión 3D, lijado, pintura, weathering y acabados épicos para armaduras y accesorios.",
    longDescription:
      "La forja de props: foam, impresión 3D, masillado, lijado, pintura, weathering, sellado y armado.",
  },
];

export function getCategory(categoryId) {
  return categories.find((item) => item.id === categoryId) || categories[0];
}
