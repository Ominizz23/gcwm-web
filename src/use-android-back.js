import { useEffect, useRef } from 'react';
import { addBackButtonListener } from './native';

// Registra el listener UNA SOLA VEZ al mount, pero siempre llama
// a la versión más reciente del handler vía ref. Esto evita reinstalar
// el listener nativo cada vez que cambia el estado de la UI.
export function useAndroidBackButton(handler) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });

  useEffect(() => {
    let dispose;
    let cancelled = false;
    addBackButtonListener(() => ref.current?.()).then((d) => {
      if (cancelled) d();
      else dispose = d;
    });
    return () => {
      cancelled = true;
      if (dispose) dispose();
    };
  }, []);
}
