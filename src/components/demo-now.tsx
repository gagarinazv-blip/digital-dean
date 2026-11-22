"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const TICK_MILLISECONDS = 30_000;

const DemoNowContext = createContext<Date | null>(null);

// «Сейчас» приходит с сервера из getDemoNow. Браузер только добавляет к нему
// прошедшее время, а зафиксированная демо-дата остаётся неподвижной.
export function DemoNowProvider({
  nowIso,
  isFrozen,
  children,
}: {
  nowIso: string;
  isFrozen: boolean;
  children: ReactNode;
}) {
  const [elapsed, setElapsed] = useState({ nowIso, milliseconds: 0 });

  useEffect(() => {
    if (isFrozen) return;
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      setElapsed({ nowIso, milliseconds: performance.now() - startedAt });
    }, TICK_MILLISECONDS);
    return () => window.clearInterval(timer);
  }, [isFrozen, nowIso]);

  const milliseconds = elapsed.nowIso === nowIso ? elapsed.milliseconds : 0;
  return (
    <DemoNowContext value={new Date(Date.parse(nowIso) + milliseconds)}>
      {children}
    </DemoNowContext>
  );
}

export function useDemoNow(): Date | null {
  return useContext(DemoNowContext);
}
