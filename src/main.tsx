
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";


  if (typeof (window as any).global === 'undefined') {
    (window as any).global = window;
  }

  createRoot(document.getElementById("root")!).render(<App />);
  