# Migración de GCWM Web a app Android

Plan para llevar `gcwm-web` (React 19 + Vite + Tailwind v4, SPA de una sola página) a una app instalable en Android y publicable en Google Play.

---

## 1. Diagnóstico del estado actual

- **Tipo de app:** SPA estática. Todo el HTML lo monta React en `#app` desde `src/gcwm_homepage_boceto.jsx` (~4.7k líneas, un único archivo con todas las secciones).
- **Estado/persistencia:** sólo `localStorage` (clave `gcwm-subscribed`, carrito, wishlist).
- **Red:** una sola llamada saliente — `SUBSCRIPTION_ENDPOINT` (Google Apps Script) con `mode: "no-cors"` para evitar preflight.
- **Integraciones externas:** WhatsApp (`wa.me/5491153290690`) vía deep link, YouTube embed para tutoriales.
- **Assets pesados:** fotos de profesionales bajo `/public/pros/<id>/` (no versionadas).
- **Generador de templates:** usa `html-to-image` (`toCanvas`) para exportar imágenes desde DOM. Esto es el punto más sensible de la migración (depende de canvas/DOM del browser).
- **Animaciones:** Framer Motion.
- **Routing:** no hay — navegación por estado interno + `location.hash`.
- **Backend propio:** no existe. No hay auth, no hay sesión de servidor.

Conclusión: el 95% de la app es renderizado de contenido + UI estática + un par de modales. No hay nada que dependa de APIs de servidor propias. Eso abre todas las puertas.

---

## 2. Opciones de migración (comparadas)

| Opción | Esfuerzo | Resultado | Acceso a APIs nativas | Reutiliza código actual |
|---|---|---|---|---|
| **A. PWA + TWA** (Trusted Web Activity, Bubblewrap) | Muy bajo (1–3 días) | App instalable desde Play Store que abre la PWA en Chrome Custom Tab | Limitado (Web APIs) | 100% |
| **B. Capacitor** (recomendado) | Bajo (1–2 semanas) | APK/AAB nativo con WebView + puente a plugins nativos | Completo vía plugins | ~95% |
| **C. React Native / Expo** (rewrite) | Alto (2–4 meses) | App 100% nativa con componentes RN | Total | 0% en UI, ~70% en lógica/datos |
| **D. Flutter** (rewrite) | Muy alto | Nativa, otro stack | Total | 0% |

---

## 3. Recomendación: **Capacitor**

### Por qué

- La app ya es SPA estática → un `vite build` produce el bundle que Capacitor mete en el APK.
- No requiere reescribir nada de UI (Framer Motion, Tailwind, modales, generador de templates siguen funcionando — corren dentro de un WebView Chromium moderno).
- Permite ir agregando capacidades nativas de a poco (push, share nativo, cámara, deep links, in-app browser) con plugins oficiales.
- El equipo sigue trabajando con `npm run dev` como siempre; el build de Android es un paso aparte (`npx cap sync && npx cap open android`).
- Publicable en Play Store como app independiente (no atada al navegador del usuario, a diferencia de TWA).

### Por qué no React Native (todavía)

- Reescribir 4.7k líneas de UI con componentes propios + animaciones Framer + el wizard de generación de imágenes (`html-to-image`) implica meses sin entregar valor nuevo.
- Performance: el WebView de Android moderno renderiza esta app sin problemas — no hay listas infinitas, no hay 60fps continuos, no hay gráficos 3D. No se justifica el costo.
- Si en el futuro se necesita performance nativa (ej: editor de fotos pesado, AR, juego), se puede migrar **secciones puntuales** a RN dentro del shell de Capacitor o saltar a RN completo.

---

## 4. Plan de implementación con Capacitor (paso a paso)

### Fase 1 — Convertir la web en una app instalable

1. **Instalar dependencias**
   ```bash
   npm i @capacitor/core @capacitor/android
   npm i -D @capacitor/cli
   npx cap init "GCWM" "ar.com.gcwm.app" --web-dir=dist
   ```

2. **Build estática**
   - `npm run build` debe quedar 100% estática (ya lo está).
   - Verificar que **no** se use `BASE_URL` distinta a `/`. En Capacitor el bundle se sirve desde `capacitor://localhost`, así que `import.meta.env.BASE_URL` puede romper rutas. Ajustar `vite.config.js`:
     ```js
     export default defineConfig({ base: './' })
     ```
   - Revisar `gcwm_homepage_boceto.jsx:42` (`const BASE_URL = import.meta.env.BASE_URL`) y todas las concatenaciones tipo `${BASE_URL}pros/...` para que funcionen con base relativa.

3. **Agregar Android**
   ```bash
   npx cap add android
   npx cap sync
   npx cap open android
   ```
   Esto abre Android Studio con el proyecto nativo. Desde ahí: ícono, splash, signing key, build de AAB.

4. **Íconos y splash**
   - Usar `@capacitor/assets`:
     ```bash
     npm i -D @capacitor/assets
     # poner logo-gcwm.png (1024x1024) y splash en /assets
     npx capacitor-assets generate --android
     ```
   - Splash color de fondo `#050507` (eva-black), foreground el logo.

5. **Configurar `capacitor.config.ts`**
   ```ts
   {
     appId: 'ar.com.gcwm.app',
     appName: 'GCWM',
     webDir: 'dist',
     backgroundColor: '#050507',
     android: {
       allowMixedContent: false,
     },
     server: {
       androidScheme: 'https' // necesario para que localStorage persista entre updates
     }
   }
   ```

### Fase 2 — Adaptar la app a contexto nativo

Cosas del código actual que hay que tocar:

- **WhatsApp deep links** (`wa.me/...`): ya funcionan, abren WhatsApp nativo. Verificar que se abran con `target="_blank"` o usar `@capacitor/browser` para in-app browser cuando NO sea WhatsApp.
- **YouTube embeds** (tutoriales): siguen funcionando dentro del WebView. Si la experiencia molesta (controles, fullscreen raro), reemplazar por `@capacitor/browser` que abre el video en YouTube app si está instalada.
- **`html-to-image` (generador de templates en `ToolsPage`)**: probar en device real. El `toCanvas` funciona en WebView moderno, pero el "fix iOS export" del commit `77b2578` puede necesitar revisión análoga para Android (algunos WebViews tienen taint en imágenes cross-origin). Si las fotos del usuario vienen de su galería en lugar de un input file, hay que cambiar a `@capacitor/camera` + pickImages.
- **`SUBSCRIPTION_ENDPOINT` con `mode: "no-cors"`**: en WebView no aplica preflight de CORS como el browser, pero conviene mover a `mode: "cors"` o usar `@capacitor/core` `CapacitorHttp` que evita CORS por completo:
   ```js
   import { CapacitorHttp } from '@capacitor/core';
   await CapacitorHttp.post({ url: SUBSCRIPTION_ENDPOINT, data: form, headers: {...} });
   ```
- **`localStorage`**: sigue funcionando, pero para datos importantes (carrito persistente, suscripciones offline) usar `@capacitor/preferences` que es seguro entre updates y respaldos.
- **Hardware back button de Android**: agregar handler. Hoy la navegación usa `setPage`/hash; sin esto, el back cierra la app. Plugin: `@capacitor/app`:
   ```js
   import { App } from '@capacitor/app';
   App.addListener('backButton', ({ canGoBack }) => {
     if (modalAbierto) cerrarModal();
     else if (page !== 'home') setPage('home');
     else App.exitApp();
   });
   ```
- **Status bar / safe areas**: usar `@capacitor/status-bar` con `style: 'dark'` y color `#050507`. Tailwind ya maneja `safe-area-inset-*` si se agregan las utilidades.
- **Scroll/touch**: el comentario en CLAUDE.md sobre `scroll-behavior: smooth` también aplica acá — mantenerlo desactivado.

### Fase 3 — Capacidades nativas que agregan valor real

Por orden de impacto para GCWM:

1. **Notificaciones push** (`@capacitor/push-notifications` + Firebase Cloud Messaging) — para avisar lanzamientos de tutoriales, nuevos profesionales, ofertas del shop. Requiere backend mínimo (puede ser otro Apps Script o Firebase Functions) para gestionar tokens.
2. **Share nativo** (`@capacitor/share`) — compartir un profesional o tutorial al stack de share de Android. Reemplaza el botón actual de copiar link.
3. **App Links / Deep Links** (`@capacitor/app` + `intent-filter` en `AndroidManifest.xml`) — abrir `gcwm.app/pro/hana-crafts` directo en la app si está instalada.
4. **Cámara/Galería** (`@capacitor/camera`) — en el generador de templates, en vez de `<input type="file">` que en mobile abre un picker pobre, usar el picker nativo con preview.
5. **Haptics** (`@capacitor/haptics`) — feedback al agregar al carrito, al completar el wizard de build.

---

## 5. Cambios concretos en el repo

Estructura nueva tras `cap add android`:

```
gcwm-web/
├─ android/              # proyecto Gradle (generado, sí se commitea)
├─ capacitor.config.ts   # config
├─ dist/                 # build de vite (sin commit)
├─ src/                  # sin cambios estructurales
└─ scripts/
   └─ android-build.mjs  # opcional: npm run android = build + sync + open
```

`package.json` — scripts nuevos:
```json
{
  "scripts": {
    "android:dev": "vite build && cap sync android && cap run android",
    "android:open": "vite build && cap sync android && cap open android",
    "android:build": "vite build && cap sync android"
  }
}
```

Archivos del código a tocar:
- `vite.config.js` → `base: './'`
- `index.html` → meta `viewport-fit=cover` para safe areas, eliminar `apple-touch-icon` redundante
- `src/gcwm_homepage_boceto.jsx`:
  - `BASE_URL` (línea 42) → usar paths relativos
  - `sendSubscription` → migrar a `CapacitorHttp` cuando esté disponible (`if (Capacitor.isNativePlatform())`)
  - Wizard del template (`ToolsPage`, `DraggablePhotoCell`) → input file → `@capacitor/camera`
  - Botón "Compartir" si existe → `@capacitor/share`
  - Listener de `backButton` global cerca del estado de `page`

---

## 6. Publicación en Google Play

1. Crear cuenta de Google Play Console (USD 25, pago único).
2. Generar **upload keystore** y guardarlo fuera del repo (subir a 1Password / vault). NO commitear.
3. `./gradlew bundleRelease` en `android/` para generar el `.aab`.
4. Subir como **internal testing** primero (testers por email).
5. Pasar a **closed → open → production** una vez validado en devices reales.
6. Datos requeridos: política de privacidad (URL pública), capturas, descripción ES, ícono 512×512, banner 1024×500.

Tiempo de revisión típico: 1–7 días la primera vez.

---

## 7. Estimación y riesgos

**Esfuerzo total Fase 1 + 2:** ~5–10 días de trabajo (un dev). Fase 3 es incremental.

**Riesgos:**
- **`html-to-image` en Android WebView**: el export podría fallar si las fotos tienen taint cross-origin. Mitigación: convertir a base64 antes de pintar en canvas, o servir todo desde el propio bundle.
- **Tamaño del APK**: con todas las fotos de profesionales en `/public/pros/` el bundle puede crecer rápido. Mitigación: migrar las galerías a un CDN (Cloudflare R2, Bunny) y bajarlas on-demand, manteniendo en el APK sólo lo crítico (logo, hero, primer fold). El script `scripts/compress-images.mjs` ya está — usarlo siempre.
- **Política de Play sobre WebView apps**: Google rechaza apps que son "sólo un wrapper de una web". GCWM tiene contenido propio, carrito, wizard de build y generador de templates — está bien lejos del "mera webview". Igual, agregar al menos 1 feature nativa (push o share) refuerza el caso.
- **Mantenimiento dual**: cada feature web debe probarse también en Android. Recomendable: pipeline en GitHub Actions que corra `npm run build && cap sync` y genere un APK de debug por PR.

---

## 8. Camino alternativo más rápido (si el objetivo es sólo "estar en Play Store")

Si la urgencia es máxima y se acepta una experiencia 100% web:

1. Convertir la web actual en **PWA** (agregar `manifest.json` + service worker básico con Workbox).
2. Usar **Bubblewrap** de Google para empaquetar como TWA:
   ```bash
   npm i -g @bubblewrap/cli
   bubblewrap init --manifest=https://gcwm.app/manifest.json
   bubblewrap build
   ```
3. Subir el `.aab` resultante a Play Store.

**Pros:** 1–2 días totales, código 100% reutilizado, updates instantáneos (no hay que publicar nueva versión por cambio de UI).
**Contras:** requiere dominio HTTPS propio, no acceso a APIs nativas, depende de Chrome instalado en el device, ícono y UX se sienten "menos app".

Recomendable como **paso 0** mientras se trabaja la migración a Capacitor en paralelo.

---

## 9. Próximos pasos sugeridos

1. Decidir entre **Capacitor** (recomendado) o **PWA+TWA** (más rápido).
2. Registrar `appId` definitivo (`ar.com.gcwm.app` propuesto).
3. Conseguir dominio (`gcwm.app` o similar) — necesario para deep links y para TWA.
4. Generar keystore y guardarlo seguro.
5. Definir si la primera versión incluye push notifications (sí → necesita Firebase project + backend para tokens).

---

## 10. Setup local y gotchas verificados en práctica

Validado el 2026-05-17 compilando el primer APK debug (`app-debug.apk` 13.66 MB, instalado y corriendo en emulador).

### Requisitos verificados

- **Android Studio** Meerkat / Narwhal o más nuevo (soporta AGP 9.x). Versiones viejas como Iguana/Jellyfish fallan con `incompatible AGP version`.
- **JDK 21 LTS obligatorio**. Capacitor 8.x + sus plugins declaran Gradle toolchain `languageVersion=21`. Java 24 **NO sirve**: Gradle lo rechaza con `Cannot find a Java installation matching: {languageVersion=21}`. Solución más simple: usar el JBR (JetBrains Runtime) bundled de Studio en `C:\Program Files\Android\Android Studio\jbr`.
- **ANDROID_HOME** apuntando al SDK (`%LOCALAPPDATA%\Android\Sdk` por default en Windows).

### Setup mínimo en PowerShell para una sesión

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
```

Para persistir: *Editar las variables de entorno del sistema* en Windows.

### Gotchas al upgrade AGP 8 → 9

Capacitor 8.3.x scaffoldea para AGP 8.13. Cuando Studio actualiza a AGP 9.x, hay que aplicar:

1. **Proguard rename**: `android/app/build.gradle` — cambiar `getDefaultProguardFile('proguard-android.txt')` → `getDefaultProguardFile('proguard-android-optimize.txt')`. AGP 9 eliminó el archivo viejo porque incluye `-dontoptimize`.
2. **Studio agrega flags de compat** en `android/gradle.properties` (ej. `android.newDsl=false`, `android.builtInKotlin=false`) — necesarios mientras Capacitor 8 use APIs legacy. Dejar como vienen.
3. **Gradle wrapper** sube a 9.x automáticamente al sincronizar.

### Build + install + run desde CLI (sin abrir Studio)

```powershell
# 1. Build vite + sync plugins
npm run android:build

# 2. Compilar APK debug
cd android
.\gradlew.bat assembleDebug --no-daemon
# Resultado: android\app\build\outputs\apk\debug\app-debug.apk

# 3. Instalar en emulador o device conectado
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb install -r app\build\outputs\apk\debug\app-debug.apk
& $adb shell am start -n "ar.com.gcwm.app/.MainActivity"

# 4. Ver logs (Capacitor + crashes)
& $adb logcat -v brief Capacitor:V Capacitor/Console:V AndroidRuntime:E "*:S"
```

Primera build: ~2 min (descarga dependencias). Rebuilds incrementales: ~10-20 s.

### Verificado funcionando en emulador

- ✅ App arranca sin crashes, todos los plugins se registran (Camera, Haptics, Share, App, StatusBar, SplashScreen).
- ✅ Bundle carga desde `https://localhost` (base relativa OK).
- ✅ Status bar dark + eva-black aplicado al boot.
- ✅ Modal de suscripción aparece a los 8 s.
- ✅ Tipografías (Bebas Neue, Inter Tight) cargan de Google Fonts.
- ✅ Layout, colores y navegación idénticos al web.

### Pendientes de validar en device real

- Back button (cierra modal → home → exit) — wired pero no testeado interactivamente.
- Picker nativo de galería en el wizard de templates (`@capacitor/camera`).
- Share sheet nativo en el botón "Compartir texto".
- Haptics al agregar al carrito y al exportar template.
- `html-to-image` exportando el template (foco de riesgo histórico).
