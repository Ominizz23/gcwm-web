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
