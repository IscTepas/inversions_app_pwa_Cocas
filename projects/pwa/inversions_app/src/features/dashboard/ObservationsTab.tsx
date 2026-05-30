// FIC: Canonical observations tab — shows canonical output string with copy/download options. (EN)
// FIC: Pestaña de observaciones canónicas — muestra el string canónico con opciones de copiar/descargar. (ES)

import React, { useState } from "react";
import type { ConfluenceSignalRow } from "../../services/signals/confluenceTableApi";
import {
  buildCanonicalOutputString,
  buildSignalContextMD,
} from "../../services/signals/confluenceTableApi";

interface Props {
  row: ConfluenceSignalRow;
  activeStrategy?: string;
}

export function ObservationsTab({ row, activeStrategy }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const canonicalStr = buildCanonicalOutputString(row);
  const mdStr = buildSignalContextMD(row, activeStrategy);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(canonicalStr);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch { /* ignore */ }
    setDropdownOpen(false);
  };

  const handleDownload = () => {
    const content = `# Observación Canónica\n\n${canonicalStr}\n\n---\n\n${mdStr}`;
    const filename = `${row.core}-${row.ticket ?? "ticker"}-${row.fecha}.md`;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setDropdownOpen(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", margin: 0 }}>
          Salida canónica según estándar de equipo. Formato auditable y comparable entre cores.
        </p>

        {/* FIC: Split button — copy or download / Botón dividido — copiar o descargar */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setDropdownOpen((o) => !o)}
            style={{ fontSize: "0.75rem", padding: "0.3rem 0.7rem" }}
          >
            {copyFeedback ? "✓ Copiado" : "Opciones ▾"}
          </button>

          {dropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                right: 0,
                background: "var(--color-surface-raised)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                zIndex: 20,
                minWidth: 140,
                boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
              }}
            >
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "0.5rem 0.9rem",
                  fontSize: "0.78rem",
                  background: "none",
                  border: "none",
                  color: "var(--color-text)",
                  cursor: "pointer",
                }}
              >
                Copiar texto
              </button>
              <button
                type="button"
                onClick={handleDownload}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "0.5rem 0.9rem",
                  fontSize: "0.78rem",
                  background: "none",
                  border: "none",
                  color: "var(--color-text)",
                  cursor: "pointer",
                }}
              >
                Descargar .md
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FIC: Bloque preformateado con la cadena canónica / Preformatted canonical string block */}
      <pre
        style={{
          background: "var(--color-bg)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          padding: "1rem",
          fontSize: "0.72rem",
          lineHeight: 1.6,
          overflowX: "auto",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          margin: 0,
          maxHeight: 420,
          overflowY: "auto",
        }}
      >
        {canonicalStr}
      </pre>
    </div>
  );
}

export default ObservationsTab;
