'use strict';
const crypto = require('crypto');
function ui() {
  const vscode = acquireVsCodeApi();
  const $ = id => document.getElementById(id);
  let state = null, active = null;
  const send = (type, fields = {}) => vscode.postMessage({ type, ...fields });
  for (const type of ['import', 'openProject', 'save', 'saveAs']) $(type).addEventListener('click', () => send(type));
  $('annotation').addEventListener('submit', e => {
    e.preventDefault();
    send('addAnnotation', { annotation: { kind: $('kind').value, start: Number($('start').value), end: Number($('end').value), definition: $('definition').value } });
  });
  $('saveNote').addEventListener('click', () => send('setNote', { note: $('note').value }));
  $('compare').addEventListener('click', () => send('compare', { referenceId: $('reference').value, recordId: state?.records.find(r => r.id === $('workspace').dataset.selected)?.id }));
  function draw(project, selected, dirty) {
    state = project; $('status').textContent = dirty ? 'Unsaved changes' : project ? 'Saved project' : 'No project';
    $('list').replaceChildren(); const record = project?.records.find(r => r.id === selected); $('workspace').hidden = !record;
    if (!project) { $('empty').hidden = false; return; }
    $('empty').hidden = true;
    for (const r of project.records) {
      const button = document.createElement('button'); button.className = 'record'; button.textContent = r.name; button.setAttribute('aria-pressed', String(r.id === selected));
      button.addEventListener('click', () => send('select', { id: r.id })); $('list').append(button);
    }
    if (!record) return;
    active = null; $('workspace').dataset.selected = record.id; $('comparison').textContent = ''; $('reference').replaceChildren();
    for (const r of project.records) { const option = document.createElement('option'); option.value = r.id; option.textContent = r.name; $('reference').append(option); }
    $('name').textContent = record.name; $('meta').textContent = record.length + ' characters · chain, species and antibody format unassigned';
    $('note').value = record.note; $('end').max = record.length; $('start').max = record.length;
    const seq = $('sequence'); seq.replaceChildren();
    for (let i = 0; i < Math.min(record.sequence.length, 10000); i++) {
      const span = document.createElement('span'); span.textContent = record.sequence[i]; span.dataset.pos = String(i + 1);
      const annotations = record.annotations.filter(a => a.start <= i + 1 && i + 1 <= a.end);
      if (annotations.length) { span.className = 'annotated'; span.title = 'Position ' + (i + 1) + ': ' + annotations.map(a => a.kind).join(', '); }
      else span.title = 'Position ' + (i + 1);
      seq.append(span);
      if ((i + 1) % 10 === 0) seq.append(document.createTextNode(' '));
      if ((i + 1) % 60 === 0) seq.append(document.createElement('br'));
    }
    if (record.sequence.length > 10000) seq.append(document.createTextNode('\nDisplay limited to the first 10,000 characters; the complete sequence is retained.'));
    $('regions').replaceChildren();
    if (!record.annotations.length) $('regions').textContent = 'No annotations yet.';
    for (const a of record.annotations) {
      const row = document.createElement('div'); row.className = 'region';
      const button = document.createElement('button'); button.textContent = a.kind + ' · ' + a.start + '–' + a.end; button.setAttribute('aria-pressed', 'false');
      const detail = document.createElement('small'); detail.textContent = 'User annotation' + (a.definition ? ' · ' + a.definition : ' · definition not specified');
      const remove = document.createElement('button'); remove.textContent = 'Remove'; remove.setAttribute('aria-label', 'Remove ' + a.kind + ' annotation');
      button.addEventListener('click', () => {
        active = a; for (const b of $('regions').querySelectorAll('[aria-pressed]')) b.setAttribute('aria-pressed', String(b === button));
        for (const span of seq.querySelectorAll('span')) span.classList.toggle('selected', Number(span.dataset.pos) >= a.start && Number(span.dataset.pos) <= a.end);
        $('focus').textContent = a.kind + ' · positions ' + a.start + '–' + a.end + ' · user annotation' + (a.definition ? ' · ' + a.definition : '');
      });
      remove.addEventListener('click', () => send('removeAnnotation', { id: a.id })); row.append(button, detail, remove); $('regions').append(row);
    }
    $('focus').textContent = 'Select an annotation to highlight its sequence range.';
  }
  window.addEventListener('message', event => {
    if (event.data.type === 'project') {
      draw(event.data.project, event.data.selected, event.data.dirty);
      const qc = event.data.quality?.find(r => r.id === event.data.selected);
      $('qc').textContent = qc ? qc.alphabet + ' · ambiguous letters: ' + qc.ambiguous + ' · gaps: ' + qc.gaps + ' · stops: ' + qc.stops + (qc.duplicateOf ? ' · exact duplicate detected' : '') : '';
    }
    if (event.data.type === 'comparison' && event.data.recordId === $('workspace').dataset.selected) {
      const cols = event.data.result.columns; let text = 'Global sequence alignment · match +1 / mismatch −1 / gap −1\n';
      for (let i = 0; i < cols.length; i += 60) {
        const block = cols.slice(i, i + 60);
        text += '\nRef  ' + block.map(c => c.reference).join('') + '\n     ' + block.map(c => c.reference === c.query ? '|' : ' ').join('') + '\nSeq  ' + block.map(c => c.query).join('') + '\n';
      }
      $('comparison').textContent = text;
    }
  });
  send('ready');
}
function render(cspSource) {
  const nonce = crypto.randomBytes(16).toString('hex');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';"><style nonce="${nonce}">
  body{font-family:var(--vscode-font-family);color:var(--vscode-foreground);margin:0;padding:22px}button,input,select,textarea{font:inherit}button{background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground);border:0;padding:7px 10px}button:hover{background:var(--vscode-button-secondaryHoverBackground)}button[aria-pressed=true]{outline:2px solid var(--vscode-focusBorder)}input,select,textarea{background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border);padding:6px;box-sizing:border-box}h1{font-size:22px;margin:0}h2{font-size:16px}.toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:14px}.muted,small{color:var(--vscode-descriptionForeground)}.layout{display:grid;grid-template-columns:210px minmax(0,1fr);gap:22px;margin-top:20px}.record{display:block;text-align:left;width:100%;margin:5px 0}.panel{border:1px solid var(--vscode-panel-border);padding:16px;margin-bottom:16px}.sequence{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/2 var(--vscode-editor-font-family,monospace)}.annotated{border-bottom:2px solid var(--vscode-textLink-foreground)}.selected{background:var(--vscode-editor-selectionBackground);outline:1px solid var(--vscode-focusBorder)}.region{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:8px 0}.form{display:flex;gap:8px;align-items:end;flex-wrap:wrap}.form label{display:grid;gap:4px}.form input[type=number]{width:85px}textarea{width:100%;min-height:80px} @media(max-width:700px){.layout{grid-template-columns:1fr}}
  </style></head><body><h1>Antibody Inspection</h1><div class="toolbar"><button id="import">Import FASTA</button><button id="openProject">Open project</button><button id="save">Save</button><button id="saveAs">Save as</button><span id="status" class="muted"></span></div><div class="layout"><aside><h2>Sequences</h2><div id="list"></div></aside><main><div id="empty" class="panel"><h2>Start an inspection</h2><p>Import a local FASTA file or open a saved project.</p></div><div id="workspace" hidden><h2 id="name"></h2><p id="meta" class="muted"></p><p id="qc" class="muted"></p><section class="panel"><h2>Sequence</h2><p class="muted">Positions start at 1. Underlines indicate user-supplied ranges.</p><div id="sequence" class="sequence"></div><p id="focus" class="muted" aria-live="polite"></p></section><section class="panel"><h2>Regions</h2><p class="muted">Ranges are entered by the researcher. They are not automatic numbering or CDR assignments.</p><div id="regions"></div><form id="annotation" class="form"><label>Type<select id="kind"><option>CDR1</option><option>CDR2</option><option>CDR3</option><option>FR1</option><option>FR2</option><option>FR3</option><option>FR4</option><option>domain</option><option>other</option></select></label><label>Start<input id="start" type="number" min="1" required></label><label>End<input id="end" type="number" min="1" required></label><label>Definition or source<input id="definition" placeholder="e.g. IMGT, manual"></label><button type="submit">Add range</button></form></section><section class="panel"><h2>Compare sequences</h2><label>Reference <select id="reference"></select></label> <button id="compare">Align with selected sequence</button><pre id="comparison" class="sequence"></pre></section><section class="panel"><h2>Observation</h2><textarea id="note" maxlength="20000" aria-label="Observation note"></textarea><div><button id="saveNote">Apply note</button></div></section></div></main></div><script nonce="${nonce}">(${ui.toString()})();</script></body></html>`;
}
module.exports = { render };
