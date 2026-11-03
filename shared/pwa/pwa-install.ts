export type PwaInstallOutcome = "accepted" | "dismissed" | "unavailable";

export type PwaInstallHelp = {
  title: string;
  steps: string[];
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __addonPwaPrompt?: BeforeInstallPromptEvent | null;
  }
}

/**
 * True when this page is already running as an installed app window.
 */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    nav.standalone === true
  );
}

/**
 * Opens the Chromium install dialog captured by public/pwa-capture.js.
 * Safari and Firefox never expose that dialog, so the result is "unavailable".
 */
export async function promptPwaInstall(): Promise<PwaInstallOutcome> {
  const promptEvent = window.__addonPwaPrompt;
  if (!promptEvent) return "unavailable";

  window.__addonPwaPrompt = null;
  window.dispatchEvent(new Event("addon-pwa-prompt"));

  try {
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      window.dispatchEvent(new Event("addon-pwa-installed"));
    }
    return choice.outcome;
  } catch (error) {
    console.error("PWA install prompt failed", error);
    return "unavailable";
  }
}

/**
 * Manual install steps for the current device when the browser will not show a prompt.
 */
export function getPwaInstallHelp(): PwaInstallHelp {
  if (!window.isSecureContext) {
    return {
      title: "Install Addon",
      steps: [
        "Open this site over HTTPS. Browsers block app install on plain HTTP.",
        "Then use the install icon in the address bar, or this button again.",
      ],
    };
  }

  const ua = window.navigator.userAgent;
  const iOS =
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /android/i.test(ua);
  const safari = /safari/i.test(ua) && !/chrome|chromium|crios|fxios|edg|opr/i.test(ua);

  if (iOS) {
    return {
      title: "Add to Home Screen",
      steps: [
        "Tap the Share button in Safari.",
        "Tap Add to Home Screen.",
        "Tap Add. Addon is added to the home screen and opens full screen.",
      ],
    };
  }

  if (android) {
    return {
      title: "Install Addon",
      steps: [
        "Open the browser menu.",
        "Tap Install app or Add to Home screen.",
        "Confirm. The Addon icon is added to the home screen.",
      ],
    };
  }

  if (safari) {
    return {
      title: "Add to Dock",
      steps: [
        "In Safari, open the File menu.",
        "Choose Add to Dock.",
        "Confirm. Addon opens from the Dock like an app.",
      ],
    };
  }

  return {
    title: "Install Addon",
    steps: [
      "In Chrome or Edge, open the browser menu.",
      "Choose Install Addon Handkerchief, or click the install icon in the address bar.",
      "Confirm. A shortcut is added on Windows, Mac, or your tablet.",
    ],
  };
}
