import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// `vite build --mode capacitor` → base relativa './' para empaquetar en APK (capacitor://localhost)
// `vite build`                  → base '/gcwm-web/' para GitHub Pages
export default defineConfig(({ mode }) => ({
  base: mode === 'capacitor' ? './' : '/gcwm-web/',
  plugins: [react(), tailwindcss()],
}))