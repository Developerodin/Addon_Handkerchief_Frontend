"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import {
  getPwaInstallHelp,
  isStandalonePwa,
  promptPwaInstall,
  type PwaInstallHelp,
} from "./pwa-install";

/**
 * Header control that installs Addon as a PWA on this device.
 * Chromium gets the native install dialog. Other browsers get the steps that browser actually supports.
 */
export default function PwaInstallButton() {
  const helpId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [canPrompt, setCanPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState<PwaInstallHelp | null>(null);

  useEffect(() => {
    const sync = () => {
      setCanPrompt(Boolean(window.__addonPwaPrompt));
      setInstalled(isStandalonePwa());
    };

    const onInstalled = () => {
      setInstalled(true);
      setCanPrompt(false);
      setHelp(null);
    };

    sync();
    window.addEventListener("addon-pwa-prompt", sync);
    window.addEventListener("addon-pwa-installed", onInstalled);

    const media = window.matchMedia("(display-mode: standalone)");
    media.addEventListener("change", sync);

    return () => {
      window.removeEventListener("addon-pwa-prompt", sync);
      window.removeEventListener("addon-pwa-installed", onInstalled);
      media.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (!help) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setHelp(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHelp(null);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [help]);

  if (installed) return null;

  /**
   * Opens the native install dialog, or the manual steps when this browser has no dialog.
   */
  const onInstallClick = async () => {
    if (canPrompt) {
      const outcome = await promptPwaInstall();
      if (outcome !== "unavailable") {
        setHelp(null);
        return;
      }
    }
    setHelp((current) => (current ? null : getPwaInstallHelp()));
  };

  return (
    <div ref={rootRef} className="header-element relative py-[1rem] md:px-[0.65rem] px-2">
      <button
        type="button"
        aria-label="Install app"
        aria-haspopup="dialog"
        aria-expanded={help ? "true" : "false"}
        aria-controls={helpId}
        title="Install app"
        onClick={() => {
          void onInstallClick();
        }}
        className="inline-flex flex-shrink-0 justify-center items-center gap-2 !rounded-full font-medium dark:hover:bg-black/20 dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white dark:focus:ring-white/10 dark:focus:ring-offset-white/10"
      >
        <img
          src="/icons/icon-192.png"
          alt=""
          width={22}
          height={22}
          className="h-[1.375rem] w-[1.375rem] rounded-md"
        />
      </button>
      {help ? (
        <div
          id={helpId}
          role="dialog"
          aria-label={help.title}
          className="absolute end-0 top-full z-[80] mt-1 w-64 rounded-md border border-defaultborder bg-white p-3 text-start shadow-lg dark:border-white/10 dark:bg-bodybg"
        >
          <p className="mb-2 text-[0.8125rem] font-semibold text-defaulttextcolor dark:text-white/80">
            {help.title}
          </p>
          <ol className="list-decimal space-y-1 ps-4 text-[0.75rem] leading-snug text-[#536485] dark:text-white/70">
            {help.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
