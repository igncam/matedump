# matedump

![Logo de matedump](public/logo.svg)

App web 100% local para inspeccionar metadatos de archivos en el navegador. No usa backend, no hace fetch, no persiste datos y no envía archivos a ningún servicio.

Por el momento solo aceptamos archivos multimedia (imagenes, audio y video).

## Funcionalidades
- Drag & drop + botón para elegir archivo
- Visualización de metadatos en cards
- Exportar metadatos visibles a JSON y CSV

## Metadatos
**Básicos (siempre):**
- `name`
- `type` (MIME)
- `sizeBytes` (bytes)
- `sizeHuman` (formato humano)
- `lastModified` (timestamp)
- `lastModifiedReadable` (fecha legible)

**Opcionales (solo si el navegador los permite):**
- `SHA-256` usando Web Crypto API (`crypto.subtle.digest`)
- Imágenes: `width` y `height`
- Audio / video: `durationSeconds`

Si un tipo de archivo no expone metadatos extra sin librerías externas, la app no inventa valores.

## Stack
- React + Vite
- Tailwind CSS
- JavaScript (ESM)

## Uso local
1. Instalar dependencias:
```bash
npm install
```
2. Iniciar el servidor de desarrollo:
```bash
npm run dev
```

## Exportación
- **JSON:** descarga `metadata.json`
- **CSV:** descarga `metadata.csv`

La descarga se hace con `Blob` + `URL.createObjectURL`, y el URL se revoca luego de iniciar la descarga.

## Estructura
- `src/App.jsx`: UI y lógica principal
- `src/helpers.js`: formateo y utilidades de exportación
- `src/index.css`: Tailwind base

## Extensiones sugeridas
- Soporte para múltiples archivos
- Vista en tabla además de cards
- Validaciones por tipo de archivo

## Notas de privacidad
Todo ocurre localmente en el navegador. No hay fetch, APIs remotas, analíticas ni almacenamiento persistente.
