'use strict';
const crypto = require('crypto');
function ui() {
  const vscode = acquireVsCodeApi();
  const $ = id => document.getElementById(id);
  let state = null, selectedId = null;
  const send = (type, fields = {}) => vscode.postMessage({ type, recordId: selectedId, ...fields });
  const make = (tag, text, className) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; };
  const setDirty = dirty => { $('status').textContent = dirty ? 'Unsaved changes · Save before closing' : state ? 'Saved project' : 'Local processing · no project'; };
  for (const type of ['import', 'openProject', 'demo', 'save', 'saveAs']) $(type).addEventListener('click', () => send(type));
  $('annotation').addEventListener('submit', event => {
    event.preventDefault();
    if (Number($('end').value) < Number($('start').value)) { $('end').setCustomValidity('End must be at or after start.'); $('end').reportValidity(); return; }
    send('addAnnotation', { annotation: { kind: $('kind').value, start: Number($('start').value), end: Number($('end').value), definition: $('definition').value } });
  });
  $('end').addEventListener('input', () => $('end').setCustomValidity(''));
  $('start').addEventListener('input', () => $('end').setCustomValidity(''));
  $('note').addEventListener('input', () => { setDirty(true); send('setNote', { note: $('note').value }); });
  $('reference').addEventListener('change', () => send('setView', { view: { referenceId: $('reference').value } }));
  $('compare').addEventListener('click', () => send('compare', { referenceId: $('reference').value }));
  function highlight(start, end, text) {
    for (const span of $('sequence').querySelectorAll('[data-pos]')) span.classList.toggle('selected', Number(span.dataset.pos) >= start && Number(span.dataset.pos) <= end);
    $('focus').textContent = text;
  }
  function focusAnnotation(annotation, persist) {
    for (const button of document.querySelectorAll('[data-annotation]')) button.setAttribute('aria-pressed', String(button.dataset.annotation === annotation.id));
    highlight(annotation.start, annotation.end, annotation.kind + ' · positions ' + annotation.start + '–' + annotation.end + ' · user annotation' + (annotation.definition ? ' · ' + annotation.definition : ' · definition not supplied'));
    if (persist) send('setView', { view: { annotationId: annotation.id } });
  }
  function draw(project, selected, dirty) {
    state = project; selectedId = selected; setDirty(dirty);
    const record = project?.records.find(r => r.id === selected);
    $('list').replaceChildren(); $('workspace').hidden = !record; $('empty').hidden = Boolean(project);
    for (const type of ['save', 'saveAs']) $(type).disabled = !project;
    if (!project) return;
    for (const r of project.records) {
      const button = make('button', r.name, 'record'); button.setAttribute('aria-pressed', String(r.id === selected));
      button.addEventListener('click', () => send('select', { recordId: r.id })); $('list').append(button);
    }
    if (!record) return;
    $('workspace').dataset.selected = record.id; $('comparison').replaceChildren(); $('reference').replaceChildren();
    for (const r of project.records) { const option = make('option', r.name); option.value = r.id; $('reference').append(option); }
    $('reference').value = project.view?.referenceId || project.records.find(r => r.id !== record.id)?.id || record.id;
    $('name').textContent = record.name;
    $('meta').textContent = record.length + ' characters · chain, species and molecular assembly unassigned';
    $('note').value = record.note; $('end').max = record.length; $('start').max = record.length;
    const seq = $('sequence'); seq.replaceChildren();
    for (let i = 0; i < Math.min(record.length, 10000); i++) {
      if (i % 60 === 0) seq.append(make('span', String(i + 1).padStart(5) + ' ', 'ruler'));
      const span = make('button', record.sequence[i], 'residue'); span.dataset.pos = String(i + 1); span.title = 'Input position ' + (i + 1);
      const annotations = record.annotations.filter(a => a.start <= i + 1 && i + 1 <= a.end);
      if (annotations.length) { span.classList.add('annotated'); span.title += ' · ' + annotations.map(a => a.kind).join(', '); }
      span.addEventListener('click', () => { $('start').value = i + 1; $('end').value = i + 1; highlight(i + 1, i + 1, 'Input position ' + (i + 1) + ' · ' + record.sequence[i]); });
      seq.append(span);
      if ((i + 1) % 10 === 0) seq.append(document.createTextNode(' '));
      if ((i + 1) % 60 === 0) seq.append(document.createElement('br'));
    }
    if (record.length > 10000) seq.append(document.createTextNode('\nDisplay limited to the first 10,000 characters; complete input retained.'));
    $('regions').replaceChildren(); $('rangeMap').replaceChildren();
    $('rangeMap').append(make('div', '1 — sequence coordinate map — ' + record.length, 'muted'));
    if (!record.annotations.length) $('regions').textContent = 'No ranges yet. Click a residue to start a manual range.';
    for (const annotation of record.annotations) {
      const row = make('div', undefined, 'region');
      const button = make('button', annotation.kind + ' · ' + annotation.start + '–' + annotation.end); button.dataset.annotation = annotation.id; button.setAttribute('aria-pressed', 'false');
      const detail = make('small', 'User annotation · ' + (annotation.definition || 'definition not supplied'));
      const remove = make('button', 'Remove'); remove.setAttribute('aria-label', 'Remove ' + annotation.kind + ' annotation');
      button.addEventListener('click', () => focusAnnotation(annotation, true));
      remove.addEventListener('click', () => send('removeAnnotation', { id: annotation.id })); row.append(button, detail, remove); $('regions').append(row);
      const track = make('div', undefined, 'track');
      const bar = make('button', annotation.kind, 'rangeBar'); bar.dataset.annotation = annotation.id; bar.title = annotation.kind + ': input positions ' + annotation.start + '–' + annotation.end;
      bar.style.marginLeft = ((annotation.start - 1) / record.length * 100) + '%'; bar.style.width = ((annotation.end - annotation.start + 1) / record.length * 100) + '%';
      bar.addEventListener('click', () => focusAnnotation(annotation, true)); track.append(bar); $('rangeMap').append(track);
    }
    $('focus').textContent = 'Select a range above or below to highlight its input positions.';
    const savedAnnotation = record.annotations.find(a => a.id === project.view?.annotationId);
    if (savedAnnotation) focusAnnotation(savedAnnotation, false);
  }
  window.addEventListener('message', event => {
    if (event.data.type === 'dirty') setDirty(event.data.dirty);
    if (event.data.type === 'project') {
      draw(event.data.project, event.data.selected, event.data.dirty);
      const qc = event.data.quality?.find(r => r.id === selectedId);
      $('qc').textContent = qc ? qc.alphabet + ' · ambiguous letters: ' + qc.ambiguous + ' · gaps: ' + qc.gaps + ' · stops: ' + qc.stops + (qc.duplicateOf ? ' · exact duplicate of ' + state.records.find(r => r.id === qc.duplicateOf)?.name : '') : '';
    }
    if (event.data.type === 'comparison' && event.data.recordId === selectedId) {
      const columns = event.data.result.columns;
      $('comparison').replaceChildren(make('p', 'Global alignment · match +1 / mismatch −1 / gap −1. Select a column to see original positions.'));
      const grid = make('div', undefined, 'alignment');
      for (const [index, column] of columns.entries()) {
        const button = make('button', column.reference + '\n' + (column.reference === column.query ? '|' : ' ') + '\n' + column.query, 'column' + (column.reference !== column.query ? ' difference' : ''));
        const description = 'Column ' + (index + 1) + ' · reference input position ' + (column.referencePosition ?? 'gap') + ' · selected input position ' + (column.queryPosition ?? 'gap');
        button.title = description; button.setAttribute('aria-label', description);
        button.addEventListener('click', () => highlight(column.queryPosition ?? 0, column.queryPosition ?? 0, description)); grid.append(button);
      }
      $('comparison').append(make('p', 'Reference: ' + state.records.find(r => r.id === event.data.referenceId)?.name + ' · top row; selected sequence · bottom row', 'muted'), grid);
    }
  });
  send('ready');
}
function render(cspSource) {
  const nonce = crypto.randomBytes(16).toString('hex');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';"><style nonce="${nonce}">
  body{font-family:var(--vscode-font-family,system-ui);color:var(--vscode-foreground,#ddd);background:var(--vscode-editor-background,#202124);margin:0;padding:22px}button,input,select,textarea{font:inherit}button{background:var(--vscode-button-secondaryBackground,#39404a);color:var(--vscode-button-secondaryForeground,#fff);border:0;padding:7px 10px;cursor:pointer}button:disabled{opacity:.5;cursor:default}button:hover{background:var(--vscode-button-secondaryHoverBackground,#505a66)}button[aria-pressed=true],button:focus-visible{outline:2px solid var(--vscode-focusBorder,#66b7ff)}input,select,textarea{background:var(--vscode-input-background,#282c34);color:var(--vscode-input-foreground,#fff);border:1px solid var(--vscode-input-border,#666);padding:6px;box-sizing:border-box}h1{font-size:22px;margin:0}h2{font-size:16px}.toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:14px}.muted,small,.ruler{color:var(--vscode-descriptionForeground,#aaa)}.layout{display:grid;grid-template-columns:210px minmax(0,1fr);gap:22px;margin-top:20px}.record{display:block;text-align:left;overflow-wrap:anywhere;width:100%;margin:5px 0}.panel{border:1px solid var(--vscode-panel-border,#555);padding:16px;margin-bottom:16px}.sequence{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/2 var(--vscode-editor-font-family,monospace)}.residue{font:inherit;background:transparent;color:inherit;padding:0;min-width:1ch}.annotated{border-bottom:2px solid var(--vscode-textLink-foreground,#5cf)}.selected{background:var(--vscode-editor-selectionBackground,#36577b);outline:1px solid var(--vscode-focusBorder,#66b7ff)}.region{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:8px 0}.form{display:flex;gap:8px;align-items:end;flex-wrap:wrap}.form label{display:grid;gap:4px}.form input[type=number]{width:85px}textarea{width:100%;min-height:80px}.track{height:30px;background:var(--vscode-editor-inactiveSelectionBackground,#303943);margin:6px 0}.rangeBar{height:100%;min-width:4px;padding:0;overflow:hidden;background:var(--vscode-button-background,#236faa);color:var(--vscode-button-foreground,#fff);white-space:nowrap}.alignment{display:flex;overflow-x:auto;padding:4px;gap:1px}.column{font:14px/1.6 monospace;white-space:pre;padding:2px 3px;background:transparent;color:inherit}.difference{border-bottom:2px solid var(--vscode-textLink-foreground,#5cf)} @media(max-width:700px){.layout{grid-template-columns:1fr}}
  </style></head><body><h1>Antibody Inspection</h1><p class="muted">R0 sequence inspection prototype · Local processing · No automatic antibody interpretation</p><div class="toolbar"><button id="demo">Try synthetic example</button><button id="import">Import FASTA</button><button id="openProject">Open project</button><button id="save" disabled>Save</button><button id="saveAs" disabled>Save as</button><span id="status" class="muted" role="status"></span></div><div class="layout"><aside><h2>Sequences</h2><div id="list"></div></aside><main><div id="empty" class="panel"><h2>Start an inspection</h2><p>Try the synthetic example without finding a file, import a local FASTA, or reopen a saved JSON project.</p><ol><li>Select a sequence in the left list.</li><li>Add a manual range and select it in the coordinate map.</li><li>Compare with another sequence, write an observation, and Save.</li></ol><p>The example contains three short teaching sequences, including one insertion and one exact duplicate. They are not real antibodies.</p><p>This release does not infer chains, CDRs, numbering, structure, developability or experimental evidence.</p></div><div id="workspace" hidden><h2 id="name"></h2><p id="meta" class="muted"></p><p id="qc" class="muted"></p><section class="panel"><h2>Sequence and manual ranges</h2><p class="muted">Input positions are 1-based and inclusive; they are not antibody numbering. Underlines mark manual ranges. Coordinate bars show their position along this sequence, not molecular topology.</p><div id="rangeMap"></div><div id="sequence" class="sequence"></div><p id="focus" class="muted" aria-live="polite"></p></section><section class="panel"><h2>Regions</h2><p class="muted">CDR means complementarity-determining region; FR means framework region. These labels require a stated definition. Assignments here are entered by you and are not scientifically inferred.</p><div id="regions"></div><form id="annotation" class="form"><label>Type<select id="kind"><option>other</option><option>domain</option><option>CDR1</option><option>CDR2</option><option>CDR3</option><option>FR1</option><option>FR2</option><option>FR3</option><option>FR4</option></select></label><label>Start<input id="start" type="number" min="1" required></label><label>End<input id="end" type="number" min="1" required></label><label>Definition or source<input id="definition" placeholder="e.g. researcher-defined teaching range"></label><button type="submit">Add range</button></form></section><section class="panel"><h2>Compare sequences</h2><p class="muted">Generic global alignment of ungapped letter sequences. This does not establish biological equivalence or antibody numbering.</p><label>Reference <select id="reference"></select></label> <button id="compare">Align with selected sequence</button><div id="comparison"></div></section><section class="panel"><h2>Observation</h2><textarea id="note" maxlength="20000" aria-label="Observation note"></textarea><p class="muted">Edits enter the project as you type. Use Save to write the JSON file. Save before closing this tab; unsaved projects are not recovered.</p></section></div></main></div><script nonce="${nonce}">(${ui.toString()})();</script></body></html>`;
}
module.exports = { render };
