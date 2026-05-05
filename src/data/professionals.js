// Profesionales que colaboran con GCWM.
//
// CAMPOS DE FOTOS (todos opcionales):
//
// - `image`: foto principal (la que aparece en la tarjeta cuando NO hay carrusel).
//    Si hay `carousel`, esta se ignora.
//
// - `carousel`: array de hasta 5 fotos destacadas. Aparecen como carrusel
//    en la tarjeta. Ejemplo: ["/pros/hana/featured-1.jpg", ...]
//
// - `gallery`: array de todas las fotos del trabajo. Aparecen en el modal
//    de galería al clickear el botón de la tarjeta. Puede tener cualquier
//    cantidad. Ejemplo: ["/pros/hana/work-1.jpg", ...]
//
// Cuando tengas las fotos:
// 1. Pegalas en /public/pros/hana-crafts/ (o como prefieras organizar).
// 2. Completá los arrays con las URLs estilo "/pros/hana-crafts/foto-1.jpg".
//
// Por ahora todos los arrays están vacíos — la app muestra placeholders
// elegantes que indican "próximamente".

export const professionals = [
  {
    id: "Hana-crafts",
    name: "Hana Crafts",
    role: "Costura & patronaje",
    category: "tela",
    bio: "Especialista en moldería y trajes ajustados. Convierte referencias 2D en patrones cómodos y fieles al personaje.",
    image: "",
    carousel: ["/pros/hana-crafts/featured-1.jpg",
    "/pros/hana-crafts/featured-2.jpg",
    "/pros/hana-crafts/featured-3.jpg"],
    gallery: ["/pros/hana-crafts/work-001.jpg",
    "/pros/hana-crafts/work-002.jpg",
    "/pros/hana-crafts/work-003.jpg"],
    rating: 5.0,
    socials: {
      instagram: "https://instagram.com/hanacrafts",
      linktree: "https://linktr.ee/hanacrafts",
    },
  },
  {
    id: "ryo-props",
    name: "Ryo Props",
    role: "Armas & armaduras",
    category: "props",
    bio: "Forja armas y armaduras en EVA foam y 3D print. Acabados con weathering pro y detalles que enloquecen al jurado.",
    image: "",
    carousel: [],
    gallery: [],
    rating: 4.9,
    socials: {
      instagram: "https://instagram.com/ryoprops",
      linktree: "https://linktr.ee/ryoprops",
    },
  },
  {
    id: "techmakers-studio",
    name: "Techmakers Studio",
    role: "Electrónica & LED",
    category: "electronica",
    bio: "Lleva props a otra dimensión con LEDs reactivos, Arduino y sensores. Magia tecnológica aplicada al cosplay.",
    image: "",
    carousel: [],
    gallery: [],
    rating: 5.0,
    socials: {
      instagram: "https://instagram.com/techmakersstudio",
      linktree: "https://linktr.ee/techmakersstudio",
    },
  },
  {
    id: "miu-wigs",
    name: "Miu Wigs",
    role: "Peinados & styling",
    category: "pelucas",
    bio: "Wig styling para personajes anime imposibles. Spikes que desafían la gravedad y volumen que no se mueve.",
    image: "",
    carousel: [],
    gallery: [],
    rating: 4.8,
    socials: {
      instagram: "https://instagram.com/miuwigs",
      linktree: "https://linktr.ee/miuwigs",
    },
  },
];
