// Genera los inputs que consume `@capacitor/assets` a partir de public/logo-gcwm.png.
// Produce en /assets:
//   - icon-only.png        1024×1024  logo escalado, fondo transparente
//   - icon-foreground.png  1024×1024  logo más chico (safe zone para adaptive icon)
//   - icon-background.png  1024×1024  eva-black sólido
//   - splash.png           2732×2732  logo centrado sobre eva-black
//   - splash-dark.png      2732×2732  igual al splash
//
// Después de correr esto: `npx capacitor-assets generate --android`

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOGO = resolve(ROOT, 'public/logo-gcwm.png');
const OUT = resolve(ROOT, 'assets');

const BG = { r: 5, g: 5, b: 7, alpha: 1 };

async function fitLogo(targetSize, padding) {
  const inner = Math.round(targetSize * (1 - padding * 2));
  return sharp(LOGO)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
}

async function composeOnBackground(targetSize, padding, background) {
  const logo = await fitLogo(targetSize, padding);
  return sharp({
    create: { width: targetSize, height: targetSize, channels: 4, background },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toBuffer();
}

async function main() {
  await mkdir(OUT, { recursive: true });

  // icon-only: logo sobre transparente (Capacitor lo usa para el ícono principal)
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: await fitLogo(1024, 0.1), gravity: 'center' }])
    .png()
    .toFile(resolve(OUT, 'icon-only.png'));

  // icon-foreground: logo MUY centrado (Material 3 safe zone exige ~66% interior)
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: await fitLogo(1024, 0.22), gravity: 'center' }])
    .png()
    .toFile(resolve(OUT, 'icon-foreground.png'));

  // icon-background: eva-black sólido
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: BG },
  })
    .png()
    .toFile(resolve(OUT, 'icon-background.png'));

  // splash: logo centrado en eva-black, padding generoso
  const splash = await composeOnBackground(2732, 0.32, BG);
  await sharp(splash).toFile(resolve(OUT, 'splash.png'));
  await sharp(splash).toFile(resolve(OUT, 'splash-dark.png'));

  console.log('✓ Assets generados en /assets');
  console.log('  Siguiente paso: npx capacitor-assets generate --android');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
