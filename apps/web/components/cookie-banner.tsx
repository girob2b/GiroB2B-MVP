"use client";

import { useEffect, useState } from "react";
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

  return (
    <section className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4">
      <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-2xl backdrop-blur">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Cookies e permissoes
            </p>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-950">
                Voce decide como a plataforma pode usar cookies e armazenamento local
              </h2>
              <p className="text-sm leading-relaxed text-slate-600">
                Usamos esses recursos para manter sua sessao ativa, lembrar preferencias, entender o uso da
                plataforma e apoiar futuras acoes de comunicacao. Os essenciais ficam sempre ativos.
              </p>
            </div>

            {customizing && (
              <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Essenciais</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        Necessarios para login, seguranca, navegacao e preferencia minima da plataforma.
                      </p>
                    </div>
                    <Checkbox checked disabled />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Analiticos</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        Ajudam a entender como o produto esta sendo usado para melhorar a experiencia.
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

                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Marketing</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        Permitem campanhas, remarketing e comunicacoes promocionais mais relevantes.
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
            )}
          </div>

          <div className="flex flex-col gap-3 lg:min-w-72">
            <Button className="w-full btn-primary" onClick={acceptAll}>
              Aceitar todos
            </Button>
            <Button variant="outline" className="w-full" onClick={acceptOnlyEssential}>
              Somente essenciais
            </Button>
            {customizing ? (
              <Button variant="ghost" className="w-full" onClick={saveCustomPreferences}>
                Salvar preferencias
              </Button>
            ) : (
              <Button variant="ghost" className="w-full" onClick={() => setCustomizing(true)}>
                Personalizar permissoes
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
