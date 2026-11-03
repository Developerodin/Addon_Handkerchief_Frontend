"use client";

import { useState, type ReactNode } from "react";
import { Provider } from "react-redux";
import store from "@/shared/redux/store";
import PrelineScript from "./PrelineScript";
import { Initialload } from "@/shared/contextapi";
import AuthProvider from "@/shared/providers/AuthProvider";
import PwaRegistrar from "@/shared/pwa/PwaRegistrar";

type ProvidersProps = {
  children: ReactNode;
};

/**
 * Client providers that used to live in the root layout.
 * The layout itself stays a server component so the PWA manifest can be emitted in the document head.
 */
export default function Providers({ children }: ProvidersProps) {
  const [pageloading, setpageloading] = useState(false);

  return (
    <Provider store={store}>
      <AuthProvider>
        <Initialload.Provider value={{ pageloading, setpageloading }}>
          {children}
        </Initialload.Provider>
      </AuthProvider>
      <PwaRegistrar />
      <PrelineScript />
    </Provider>
  );
}
