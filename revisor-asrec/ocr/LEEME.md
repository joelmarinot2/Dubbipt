# Lector de capturas del Revisor ASREC

Lo que hace falta para leer una captura sin internet. `construir.js` lo mete
comprimido en `revisor-asrec.html` y la pantalla solo lo abre cuando alguien
sube una captura.

| Archivo | Qué es | Licencia |
|---|---|---|
| `tesseract.min.js`, `worker.min.js` | Tesseract.js 5.1.1 | Apache 2.0 (`LICENCIA-tesseract.js.txt`) |
| `tesseract-core-simd-lstm.wasm.js.gz` | tesseract.js-core 5.1.1, núcleo WebAssembly con SIMD, solo LSTM (comprimido) | Apache 2.0 (`LICENCIA-tesseract.js-core.txt`) |
| `spa.traineddata.gz` | Español `4.0.0_best_int`, de @tesseract.js-data/spa 1.0.0 (datos de tesseract-ocr/tessdata) | Apache 2.0 los datos; MIT el paquete |

Para cambiar de versión: `npm pack tesseract.js@X tesseract.js-core@X
@tesseract.js-data/spa`, copiar estos mismos archivos (el núcleo, comprimido
con `gzip -9`) y reconstruir.
