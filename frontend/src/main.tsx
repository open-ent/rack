import React, { StrictMode } from "react";

import { EdificeThemeProvider } from "@open-ent/react";
import { createRoot } from "react-dom/client";

import { RouterProvider } from "react-router-dom";
import "./i18n";
import { Providers, queryClient } from "./providers";
import { router } from "./routes";

import "./index.css";

// Le bootstrap openent n'est PAS bundlé : il est chargé au runtime via
// <link href="/assets/themes/openent-bootstrap/index.css"> dans index.html, comme pour
// blog / wiki / calendar. Le bundler ne voit donc plus son `@import url("/theme/brand.css")`
// (chemin servi par l'hôte, que `vite build` prenait pour un fichier local → ENOENT).

const rootElement = document.getElementById("root");
const root = createRoot(rootElement!);

if (process.env.NODE_ENV !== "production") {
  import("@axe-core/react").then((axe) => {
    axe.default(React, root, 1000);
  });
}

root.render(
  <StrictMode>
    <Providers>
      <EdificeThemeProvider>
        <RouterProvider router={router(queryClient)} />
      </EdificeThemeProvider>
    </Providers>
  </StrictMode>,
);
