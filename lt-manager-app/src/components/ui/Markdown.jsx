'use client';

import React from 'react';

function escapar(texto) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escaparAttr(texto) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
}

// Convierte una línea en JSX aplicando inline markdown (negrita, cursiva, código, enlaces)
function renderInline(texto) {
  const tokens = [];
  const regex = /(\*\*(.+?)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(texto)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(texto.slice(lastIndex, match.index));
    }
    if (match[2]) {
      tokens.push(<strong key={tokens.length}>{match[2]}</strong>);
    } else if (match[3]) {
      tokens.push(<code key={tokens.length}>{match[3]}</code>);
    } else if (match[4] && match[5]) {
      tokens.push(
        <a key={tokens.length} href={escaparAttr(match[5])} target="_blank" rel="noreferrer noopener">
          {match[4]}
        </a>
      );
    } else if (match[6]) {
      tokens.push(<em key={tokens.length}>{match[6]}</em>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < texto.length) {
    tokens.push(texto.slice(lastIndex));
  }
  return tokens;
}

export default function Markdown({ content }) {
  const lineas = content.split('\n');
  const bloques = [];
  let lista = null;
  let listaOrdenada = null;
  let codigo = null;
  let tabla = null;
  let parrafo = [];

  function flushParrafo() {
    if (parrafo.length > 0) {
      bloques.push(<p key={bloques.length}>{parrafo.join(' ') ? renderInline(parrafo.join(' ')) : ''}</p>);
      parrafo = [];
    }
  }
  function flushLista() {
    if (lista) {
      bloques.push(<ul key={bloques.length}>{lista}</ul>);
      lista = null;
    }
    if (listaOrdenada) {
      bloques.push(<ol key={bloques.length}>{listaOrdenada}</ol>);
      listaOrdenada = null;
    }
  }
  function flushTabla() {
    if (tabla) {
      bloques.push(
        <div key={bloques.length} style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>{tabla.headers.map((h, i) => <th key={i}>{renderInline(h)}</th>)}</tr>
            </thead>
            <tbody>
              {tabla.rows.map((fila, i) => (
                <tr key={i}>{fila.map((celda, j) => <td key={j}>{renderInline(celda)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tabla = null;
    }
  }
  function flushCodigo() {
    if (codigo !== null) {
      bloques.push(<pre key={bloques.length}><code>{codigo}</code></pre>);
      codigo = null;
    }
  }

  for (const linea of lineas) {
    const trim = linea.trim();

    if (trim.startsWith('```')) {
      flushParrafo();
      flushLista();
      flushTabla();
      if (codigo !== null) {
        flushCodigo();
      } else {
        codigo = '';
      }
      continue;
    }

    if (codigo !== null) {
      codigo += (codigo ? '\n' : '') + linea;
      continue;
    }

    if (/^#{1,3}\s/.test(trim)) {
      flushParrafo();
      flushLista();
      flushTabla();
      const nivel = trim.match(/^(#{1,3})\s/)[1].length;
      const texto = trim.replace(/^#{1,3}\s/, '');
      if (nivel === 1) bloques.push(<h1 key={bloques.length}>{renderInline(texto)}</h1>);
      else if (nivel === 2) bloques.push(<h2 key={bloques.length}>{renderInline(texto)}</h2>);
      else bloques.push(<h3 key={bloques.length}>{renderInline(texto)}</h3>);
      continue;
    }

    // Tabla markdown: header, luego separador |---|, luego filas
    if (tabla !== null) {
      if (trim === '') {
        flushTabla();
        continue;
      }
      const celdas = trim.split('|').slice(1, -1).map((c) => c.trim());
      if (celdas.some((c) => c === '')) {
        flushTabla();
        parrafo.push(linea);
        continue;
      }
      tabla.rows.push(celdas);
      continue;
    }
    if (/^\|.+\|$/.test(trim) && trim.includes('-')) {
      const celdas = trim.split('|').slice(1, -1).map((c) => c.trim());
      if (celdas.some((c) => /^:?-+:?$/.test(c))) {
        flushParrafo();
        flushLista();
        tabla = { headers: [], rows: [] };
        continue;
      }
    }
    if (tabla === null && /^\|.+\|$/.test(trim)) {
      const headers = trim.split('|').slice(1, -1).map((c) => c.trim());
      if (headers.every(Boolean)) {
        flushParrafo();
        flushLista();
        tabla = { headers, rows: [] };
        continue;
      }
    }

    if (/^[-*]\s/.test(trim)) {
      flushParrafo();
      flushTabla();
      if (!lista) lista = [];
      const item = trim.replace(/^[-*]\s/, '');
      lista.push(<li key={lista.length}>{renderInline(item)}</li>);
      continue;
    }
    if (/^\d+\.\s/.test(trim)) {
      flushParrafo();
      flushTabla();
      if (!listaOrdenada) listaOrdenada = [];
      const item = trim.replace(/^\d+\.\s/, '');
      listaOrdenada.push(<li key={listaOrdenada.length}>{renderInline(item)}</li>);
      continue;
    }

    if (trim === '') {
      flushParrafo();
      flushLista();
      flushTabla();
      continue;
    }

    parrafo.push(linea);
  }

  flushParrafo();
  flushLista();
  flushTabla();
  flushCodigo();

  return <>{bloques}</>;
}
