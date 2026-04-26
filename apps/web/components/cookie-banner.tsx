"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const CONSENT_STORAGE_KEY = "girob2b.cookie-consent";

type CookiePreferences = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

const defaultPreferences: CookiePreferences = {
  essential: true,
  analytics: false,
  marketing: false,
  updatedAt: "",
};

export default function CookieBanner() {
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const savedPreferences = window.localStorage.getItem(CONSENT_STORAGE_KEY);

      if (savedPreferences) {
        try {
          const parsedPreferences = JSON.parse(savedPreferences) as CookiePreferences;
          setPreferences(parsedPreferences);
          setReady(true);
          return;
        } catch {
          window.localStorage.removeItem(CONSENT_STORAGE_KEY);
        }
      }

      setVisible(true);
      setReady(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  function savePreferences(nextPreferences: CookiePreferences) {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(nextPreferences));
    setPreferences(nextPreferences);
    setVisible(false);
    setCustomizing(false);
  }

  function acceptAll() {
    savePreferences({
      essential: true,
      analytics: true,
      marketing: true,
      updatedAt: new Date().toISOString(),
    });
  }

  function acceptOnlyEssential() {
    savePreferences({
      essential: true,
      analytics: false,
      marketing: false,
      updatedAt: new Date().toISOString(),
    });
  }

  function saveCustomPreferences() {
    savePreferences({
      ...preferences,
      essential: true,
      updatedAt: new Date().toISOString(),
    });
  }

  if (!ready || !visible) {
    return null;
  }

  // ── Modo "personalizar" — modal central com overlay ──
  if (customizing) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center">
        <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="eyebrow">Cookies e permissões</p>
              <h2 className="text-xl font-semibold text-slate-950">
                Você decide como a plataforma usa cookies e armazenamento local
              </h2>
            </div>
            <button
              type="button"
              onClick={acceptOnlyEssential}
              className="text-slate-400 hover:text-slate-700"
              aria-label="Fechar (mantém só essenciais)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Essenciais</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Necessários para login, segurança, navegação e preferência mínima da plataforma.
                  </p>
                </div>
                <Checkbox checked disabled />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Analíticos</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Ajudam a entender como o produto está sendo usado para melhorar a experiência.
                  </p>
                </div>
                <Checkbox
                  checked={preferences.analytics}
                  onCheckedChange={(checked) =>
                    setPreferences((currentValue) => ({
                      ...currentValue,
                      analytics: Boolean(checked),
                    }))
                  }
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Marketing</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Permitem campanhas, remarketing e comunicações promocionais mais relevantes.
                  </p>
                </div>
                <Checkbox
                  checked={preferences.marketing}
                  onCheckedChange={(checked) =>
                    setPreferences((currentValue) => ({
                      ...currentValue,
                      marketing: Boolean(checked),
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={acceptOnlyEssential}>
              Somente essenciais
            </Button>
            <Button variant="outline" onClick={saveCustomPreferences}>
              Salvar preferências
            </Button>
            <Button className="btn-primary" onClick={acceptAll}>
              Aceitar todos
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Modo padrão — chip compacto bottom-right que não cobre CTAs centrais ──
  return (
    <aside
      role="region"
      aria-label="Preferências de cookies"
      className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">
          Cookies e privacidade
        </p>
        <button
          type="button"
          onClick={acceptOnlyEssential}
          className="-m-1 p-1 text-slate-400 hover:text-slate-700"
          aria-label="Fechar (mantém só essenciais)"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        Usamos cookies para manter sua sessão, lembrar preferências e melhorar a plataforma.{" "}
        <button
          type="button"
          onClick={() => setCustomizing(true)}
          className="font-semibold text-brand-700 hover:text-brand-800 underline-offset-2 hover:underline"
        >
          Personalizar
        </button>
        {" · "}
        <Link
          href="/privacidade"
          className="font-semibold text-brand-700 hover:text-brand-800 underline-offset-2 hover:underline"
        >
          Política
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          onClick={acceptOnlyEssential}
        >
          Só essenciais
        </Button>
        <Button size="sm" className="btn-primary flex-1 text-xs" onClick={acceptAll}>
          Aceitar todos
        </Button>
      </div>
    </aside>
  );
}
