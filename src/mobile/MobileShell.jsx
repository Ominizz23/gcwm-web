import React, { useMemo } from "react";
import TopAppBar from "./TopAppBar.jsx";
import BottomTabBar from "./BottomTabBar.jsx";
import MoreScreen from "./MoreScreen.jsx";
import { getCategory } from "../data/categories";

// Mapea la "page" del state global a:
//  - tab activo del bottom bar (Inicio / Catálogo / Pros / Más)
//  - título mostrado en el top bar
//  - flag de mostrar back arrow
// Páginas web (community, tools, category) caen en el tab "Más" como sub-screens.
function deriveNav(page, activeCategoryId) {
  switch (page) {
    case "home":
      return { tab: "home", title: "GCWM", showBack: false };
    case "shop":
      return { tab: "shop", title: "Catálogo", showBack: false };
    case "professionals":
      return { tab: "professionals", title: "Profesionales", showBack: false };
    case "more":
      return { tab: "more", title: "Más", showBack: false };
    case "category": {
      const cat = getCategory(activeCategoryId);
      return { tab: "more", title: cat?.label || "Categoría", showBack: true };
    }
    case "community":
      return { tab: "more", title: "Comunidad", showBack: true };
    case "tools":
      return { tab: "more", title: "Herramientas", showBack: true };
    default:
      return { tab: "home", title: "GCWM", showBack: false };
  }
}

export default function MobileShell({
  page,
  setPage,
  activeCategoryId,
  openCategory,
  cartCount,
  onOpenCart,
  onOpenSearch,
  onOpenBuild,
  onOpenContact,
  onOpenFAQ,
  children,
}) {
  const { tab, title, showBack } = useMemo(
    () => deriveNav(page, activeCategoryId),
    [page, activeCategoryId]
  );

  function handleTabSelect(nextTab) {
    setPage(nextTab);
  }

  function handleBack() {
    // Volver al tab principal que corresponde a la sección actual.
    if (page === "category" || page === "community" || page === "tools") {
      setPage("more");
    } else {
      setPage("home");
    }
  }

  return (
    <div className="relative min-h-screen bg-[var(--eva-black)] text-white">
      {/* Wrapper de glows (igual que en web shell) */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 h-[500px] w-[500px] rounded-full bg-[var(--eva-purple)]/30 blur-[120px]" />
        <div className="absolute top-40 -right-20 h-[400px] w-[400px] rounded-full bg-[var(--eva-green)]/8 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-[var(--eva-orange)]/10 blur-[120px]" />
        <div className="absolute inset-0 eva-grid-bg opacity-50" />
      </div>

      <TopAppBar
        title={title}
        showBack={showBack}
        onBack={handleBack}
        cartCount={cartCount}
        onOpenCart={onOpenCart}
        onOpenSearch={onOpenSearch}
      />

      <main className="relative z-10 pb-20">
        {page === "more" ? (
          <MoreScreen
            setPage={setPage}
            openCategory={openCategory}
            onOpenBuild={onOpenBuild}
            onOpenContact={onOpenContact}
            onOpenFAQ={onOpenFAQ}
          />
        ) : (
          children
        )}
      </main>

      <BottomTabBar active={tab} onSelect={handleTabSelect} />
    </div>
  );
}
