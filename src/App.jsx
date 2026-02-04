import { useMemo, useRef, useState } from "react";
import { downloadTextFile, formatBytes, formatDate, toCsvRows } from "./helpers.js";

const BASE_FIELDS = [
  { key: "name", label: "Nombre" },
  { key: "type", label: "Tipo (MIME)" },
  { key: "sizeHuman", label: "Tamaño" },
  { key: "sizeBytes", label: "Tamaño (bytes)" },
  { key: "lastModified", label: "Last Modified (timestamp)" },
  { key: "lastModifiedReadable", label: "Last Modified (fecha)" },
];

const EXTRA_FIELDS = [
  { key: "sha256", label: "SHA-256" },
  { key: "width", label: "Ancho (px)" },
  { key: "height", label: "Alto (px)" },
  { key: "durationSeconds", label: "Duración (s)" },
];

function arrayBufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const data = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(data);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };

    img.src = url;
  });
}

function getMediaDuration(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const media = file.type.startsWith("video/")
      ? document.createElement("video")
      : document.createElement("audio");

    media.preload = "metadata";
    media.onloadedmetadata = () => {
      const duration = media.duration;
      URL.revokeObjectURL(url);
      resolve(duration);
    };

    media.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer el media"));
    };

    media.src = url;
  });
}

export default function App() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [extras, setExtras] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedField, setCopiedField] = useState("");
  const logoUrl = `${import.meta.env.BASE_URL}logo.svg`;

  const visibleMetadata = useMemo(() => {
    if (!metadata) return null;
    return { ...metadata, ...extras };
  }, [metadata, extras]);

  const handleFile = async (selectedFile) => {
    if (!selectedFile) {
      setError("No se selecciono ningun archivo.");
      return;
    }

    setError("");
    setFile(selectedFile);

    const base = {
      name: selectedFile.name,
      type: selectedFile.type || "sin tipo declarado",
      sizeBytes: selectedFile.size,
      sizeHuman: formatBytes(selectedFile.size),
      lastModified: selectedFile.lastModified,
      lastModifiedReadable: formatDate(selectedFile.lastModified),
    };

    setMetadata(base);
    setExtras({});
    setLoading(true);

    const nextExtras = {};

    if (window.crypto?.subtle) {
      try {
        const buffer = await selectedFile.arrayBuffer();
        const hash = await window.crypto.subtle.digest("SHA-256", buffer);
        nextExtras.sha256 = arrayBufferToHex(hash);
      } catch (err) {
        // El hash puede fallar con archivos muy grandes o restricciones del navegador.
      }
    }

    if (selectedFile.type.startsWith("image/")) {
      try {
        const { width, height } = await getImageDimensions(selectedFile);
        nextExtras.width = width;
        nextExtras.height = height;
      } catch (err) {
        // Algunas imagenes pueden no ser decodificables por el navegador.
      }
    }

    if (
      selectedFile.type.startsWith("audio/") ||
      selectedFile.type.startsWith("video/")
    ) {
      try {
        const duration = await getMediaDuration(selectedFile);
        if (Number.isFinite(duration)) {
          nextExtras.durationSeconds = duration.toFixed(2);
        }
      } catch (err) {
        // Si el navegador no puede leer metadata, no se agrega.
      }
    }

    setExtras(nextExtras);
    setLoading(false);
  };

  const handleInputChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    handleFile(selectedFile);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const droppedFile = event.dataTransfer.files?.[0] || null;
    handleFile(droppedFile);
  };

  const handleExportJson = () => {
    if (!visibleMetadata) {
      setError("Primero selecciona un archivo para exportar.");
      return;
    }
    const json = JSON.stringify(visibleMetadata, null, 2);
    downloadTextFile("metadata.json", json, "application/json");
  };

  const handleExportCsv = () => {
    if (!visibleMetadata) {
      setError("Primero selecciona un archivo para exportar.");
      return;
    }
    const csv = toCsvRows(visibleMetadata);
    downloadTextFile("metadata.csv", csv, "text/csv");
  };

  const handleCopySha = async (value) => {
    if (!value) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedField("sha256");
      window.setTimeout(() => setCopiedField(""), 1600);
    } catch (err) {
      setError("No se pudo copiar el SHA-256.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 px-6 py-12 text-slate-900">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="flex flex-col items-center gap-4 text-center">
          <img
            src={logoUrl}
            alt="Logo de matedump"
            className="h-36 w-36"
          />
          <h1 className="text-3xl font-semibold text-slate-900">matedump 🧉</h1>
          <p className="text-slate-600">
            Todo ocurre localmente: nada se sube, no hay backend y no se guardan
            datos.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xl shadow-slate-200/40">
          <div
            className={`flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${{
              true: "border-slate-300 bg-slate-100",
              false: "border-slate-200 bg-white/60",
            }[isDragging]}`}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <div className="flex flex-col gap-2">
              <p className="text-lg font-medium text-slate-900">
                Arrastra y suelta tu archivo
              </p>
              <p className="text-sm text-slate-500">
                o usa el boton para elegir un archivo desde tu equipo.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
                onClick={() => inputRef.current?.click()}
              >
                Elegir archivo
              </button>
              {file && (
                <span className="rounded-full bg-slate-100 px-4 py-2 text-xs text-slate-600">
                  {file.name}
                </span>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={handleInputChange}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              onClick={handleExportJson}
            >
              Exportar JSON
            </button>
            <button
              type="button"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
              onClick={handleExportCsv}
            >
              Exportar CSV
            </button>
            {loading && (
              <span className="text-sm text-slate-500">Procesando extras...</span>
            )}
          </div>

          {error && (
            <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/80 p-6">
           {visibleMetadata &&
          <div className="flex flex-wrap items-center justify-between gap-3">
           
            <h2 className="text-xl font-semibold text-slate-900">
              Metadatos detectados
            </h2>
             
            <p className="text-xs text-slate-500">
              puedo que el archivo contenga más metadatos.
            </p> 
          </div>}

          {!visibleMetadata && (
            <p className="mt-4 text-sm text-slate-500">
              Aun no hay datos. Selecciona un archivo para ver sus metadatos.
            </p>
          )}

          {visibleMetadata && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[...BASE_FIELDS, ...EXTRA_FIELDS]
                .filter((field) => visibleMetadata[field.key] !== undefined)
                .map((field) => (
                  <div
                    key={field.key}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        {field.label}
                      </p>
                      {field.key === "sha256" && (
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                          onClick={() =>
                            handleCopySha(visibleMetadata[field.key])
                          }
                        >
                          {copiedField === "sha256" ? "Copiado" : "Copiar"}
                        </button>
                      )}
                    </div>
                    <p className="mt-1 break-all text-sm text-slate-900">
                      {visibleMetadata[field.key]}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
