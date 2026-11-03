import "./style.css";

import { createRoot } from "react-dom/client";

import App from "./App.js";
import { LocaleProvider } from "./i18n/locale.js";

createRoot(document.getElementById("root")!).render(
  <LocaleProvider>
    <App />
  </LocaleProvider>,
);
