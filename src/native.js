// Bridge a Capacitor. En web todas las funciones son no-op.
// Los plugins se cargan con dynamic import para que el bundle web no los incluya.

import { Capacitor, CapacitorHttp } from '@capacitor/core';

export const isNative = () => Capacitor.isNativePlatform();

export async function initNative() {
  if (!isNative()) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#050507' });
  } catch (err) {
    console.warn('StatusBar init failed:', err);
  }

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch (err) {
    console.warn('SplashScreen hide failed:', err);
  }
}

export async function exitApp() {
  if (!isNative()) return;
  const { App } = await import('@capacitor/app');
  return App.exitApp();
}

// Registra un listener del back button de Android.
// Devuelve una promesa con la función de cleanup.
export async function addBackButtonListener(handler) {
  if (!isNative()) return () => {};
  const { App } = await import('@capacitor/app');
  const sub = await App.addListener('backButton', handler);
  return () => sub.remove();
}

// Envía POST al endpoint con CapacitorHttp en nativo (evita CORS preflight).
// En web cae al fetch del navegador.
export async function postJson(url, body, { headers = {} } = {}) {
  if (isNative()) {
    return CapacitorHttp.post({
      url,
      headers: { 'Content-Type': 'text/plain;charset=utf-8', ...headers },
      data: typeof body === 'string' ? body : JSON.stringify(body),
    });
  }
  return fetch(url, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

// Comparte texto/url usando el share sheet nativo de Android.
// En web usa navigator.share si está disponible, sino copia la URL al clipboard.
// Devuelve true si se compartió/copió, false si el usuario canceló o falló.
export async function share({ title, text, url }) {
  if (isNative()) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title, text, url, dialogTitle: title });
      return true;
    } catch (err) {
      // El usuario canceló — no es error real
      return false;
    }
  }

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch {
      return false;
    }
  }

  // Último fallback: copiar al clipboard
  try {
    await navigator.clipboard.writeText(url || text || '');
    return true;
  } catch {
    return false;
  }
}

// Feedback táctil. style: 'light' | 'medium' | 'heavy'. No-op en web.
export async function haptic(style = 'light') {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
    await Haptics.impact({ style: map[style] || ImpactStyle.Light });
  } catch {
    // ignore
  }
}

// Devuelve un array de dataURLs de hasta `max` fotos.
// En nativo abre el picker de galería con `@capacitor/camera`.
// En web crea un input file dinámico (mismo flujo que el original).
export async function pickPhotos(max = 4) {
  if (max <= 0) return [];

  if (isNative()) {
    try {
      const { Camera } = await import('@capacitor/camera');
      const result = await Camera.pickImages({ quality: 90, limit: max });
      return Promise.all((result.photos || []).slice(0, max).map(async (p) => {
        const res = await fetch(p.webPath);
        const blob = await res.blob();
        return blobToDataURL(blob);
      }));
    } catch {
      return [];
    }
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = max > 1;
    input.onchange = async () => {
      const files = Array.from(input.files || []).slice(0, max);
      const urls = await Promise.all(files.map(fileToDataURL));
      resolve(urls);
    };
    input.oncancel = () => resolve([]);
    input.click();
  });
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(ev.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
