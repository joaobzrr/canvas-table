import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

/*
import { GlyphAtlas } from "./KonvaTable/GlyphAtlas";
(async () => {
  const atlas = await GlyphAtlas.create("Courier New", "30px");
  const bitmap = atlas.getBitmap();

  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);

  const root = document.querySelector("#root")!;
  root.appendChild(canvas);
})();
*/

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
