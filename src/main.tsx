
  import { createRoot } from "react-dom/client";
  import { DndProvider } from "react-dnd";
  import { HTML5Backend } from "react-dnd-html5-backend";
  import App from "./app/App.tsx";
  import "./styles/index.css";


  if (typeof (window as any).global === 'undefined') {
    (window as any).global = window;
  }

  createRoot(document.getElementById("root")!).render(
    <DndProvider backend={HTML5Backend}>
      <App />
    </DndProvider>
  );
  
