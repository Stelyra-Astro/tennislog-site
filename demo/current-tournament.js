/* Tournament fields for the browser-only sample. Keep saved legacy records readable. */
(() => {
  const disciplines = ['Singles', "Men's Singles", "Women's Singles", 'Doubles', "Men's Doubles", "Women's Doubles", 'Mixed Doubles'];
  const matchFormats = ['Best of 3 Sets', 'Best of 5 Sets', 'Single 7-point Tiebreak', 'Single 10-point Tiebreak', 'Custom'];
  const setFormats = ['Tie-break set', 'Advantage set', 'Short set'];
  const finalFormats = ['Same as other sets', 'Tie-break set', 'Advantage set', '7-point Match Tiebreak', '10-point Match Tiebreak', '10-point tiebreak at 6–6'];
  const pick = (label, name, options, value) => `<div class="form-row ct-row"><label for="ct-${name}">${E(label)}</label><select id="ct-${name}" name="${name}">${options.map(option => `<option value="${E(option)}" ${option === value ? 'selected' : ''}>${E(option)}</option>`).join('')}</select></div>`;
  const field = (label, name, value, type = 'text') => `<div class="form-row ct-row"><label for="ct-${name}">${E(label)}</label><input id="ct-${name}" name="${name}" type="${type}" value="${E(value || '')}"></div>`;
  const row = (key, parent) => parent.querySelector(`[name="${key}"]`)?.closest('.form-row');

  function showRules(form) {
    const format = form.querySelector('[name="matchFormat"]')?.value || 'Best of 3 Sets';
    const normal = ['Best of 3 Sets', 'Best of 5 Sets', 'Best of 1 Set'].includes(format);
    const short = normal && form.querySelector('[name="setFormat"]')?.value === 'Short set';
    for (const name of ['setFormat', 'gameScoring']) if (row(name, form)) row(name, form).style.display = normal ? '' : 'none';
    for (const name of ['shortTiebreakAt', 'shortTiebreakPoints']) if (row(name, form)) row(name, form).style.display = short ? '' : 'none';
    if (row('decidingSet', form)) row('decidingSet', form).style.display = normal && format !== 'Best of 1 Set' ? '' : 'none';
    const note = form.querySelector('.ct-rule-note');
    if (note) note.textContent = format === 'Custom' ? 'Enter each set as played. Two unequal scores complete a set; the higher score wins.' : normal ? 'No-Ad uses one deciding point at deuce. Tiebreaks use point scores.' : 'One tiebreak decides the match. Win by 2 points.';
  }

  function installForm() {
    const form = document.getElementById('edit-form');
    if (!form || sheet?.type !== 'tournaments') return;
    const record = sheet.record || {};
    const legacy = form.querySelector('[name="eventFormat"]');
    if (legacy) {
      const existing = record.category || record.eventFormat || 'Singles';
      const category = existing === 'Mixed doubles' ? 'Mixed Doubles' : existing;
      const options = disciplines.includes(category) ? disciplines : [...disciplines, category];
      legacy.name = 'category';
      legacy.id = 'ct-category';
      legacy.innerHTML = options.map(option => `<option value="${E(option)}" ${option === category ? 'selected' : ''}>${E(option)}${disciplines.includes(option) ? '' : ' (existing)'}</option>`).join('');
      const legacyLabel = legacy.closest('.form-row')?.querySelector('label');
      if (legacyLabel) { legacyLabel.replaceChildren(document.createTextNode('Discipline')); legacyLabel.htmlFor = 'ct-category'; }
      const alias = document.createElement('input');
      alias.type = 'hidden'; alias.name = 'eventFormat'; alias.value = category;
      legacy.after(alias);
      legacy.addEventListener('change', () => { alias.value = legacy.value; });
    }
    const step0 = form.querySelector('.v17-step[data-v17-step="0"]');
    if (step0 && !form.querySelector('[name="editionLabel"]')) {
      const section = document.createElement('section'); section.className = 'form-section';
      section.innerHTML = `<div class="form-title">Edition</div><div class="form-card">${field('Year / edition', 'editionLabel', record.editionLabel || new Date(record.date || Date.now()).getFullYear())}</div>`;
      step0.appendChild(section);
    }
    const step = form.querySelector('.v17-step[data-v17-step="1"]');
    if (!step) return;
    const section = document.createElement('section'); section.className = 'form-section ct-rules';
    section.innerHTML = `<div class="form-title">Tournament & match rules</div><div class="form-card">${field('Host city', 'hostCity', record.hostCity || '')}${pick('Tournament format', 'tournamentFormat', ['Single Elimination', 'Round Robin', 'Double Elimination', 'Other'], record.tournamentFormat || 'Single Elimination')}${pick('Match format', 'matchFormat', matchFormats.includes(record.matchFormat) ? matchFormats : record.matchFormat ? [...matchFormats, record.matchFormat] : matchFormats, record.matchFormat || 'Best of 3 Sets')}${pick('Set format', 'setFormat', setFormats, record.setFormat || 'Tie-break set')}${pick('Set tiebreak at', 'shortTiebreakAt', ['3–3', '4–4'], record.shortTiebreakAt || '4–4')}${pick('Set tiebreak', 'shortTiebreakPoints', ['7', '5'], record.shortTiebreakPoints || '7')}${pick('Final set rule', 'decidingSet', finalFormats, record.decidingSet || 'Same as other sets')}${pick('Game scoring', 'gameScoring', ['Advantage', 'No-Ad'], record.gameScoring || 'Advantage')}<p class="ct-rule-note"></p></div>`;
    step.appendChild(section);
    for (const name of ['matchFormat', 'setFormat']) form.querySelector(`[name="${name}"]`)?.addEventListener('change', () => showRules(form));
    showRules(form);
  }

  const earlierOpen = openEditor;
  openEditor = function (...args) {
    earlierOpen(...args);
    if (args[0] === 'tournaments') installForm();
  };

  const earlierDetail = detailView;
  detailView = function (kind, id) {
    const html = earlierDetail(kind, id);
    if (kind !== 'tournaments') return html;
    const record = find('tournaments', id);
    if (!record || ![record.matchFormat, record.tournamentFormat, record.category, record.editionLabel].some(Boolean)) return html;
    const holder = document.createElement('div'); holder.innerHTML = html;
    const page = holder.querySelector('.page');
    const grid = page?.querySelector('.detail-grid');
    if (!page || !grid) return html;
    const entries = [
      ['Edition', record.editionLabel], ['Discipline', record.category || record.eventFormat],
      ['Tournament format', record.tournamentFormat], ['Match format', record.matchFormat],
      ['Set format', ['Best of 3 Sets', 'Best of 5 Sets', 'Best of 1 Set'].includes(record.matchFormat) ? record.setFormat : ''],
      ['Set tiebreak at', ['Best of 3 Sets', 'Best of 5 Sets', 'Best of 1 Set'].includes(record.matchFormat) && record.setFormat === 'Short set' ? record.shortTiebreakAt : ''],
      ['Set tiebreak points', ['Best of 3 Sets', 'Best of 5 Sets', 'Best of 1 Set'].includes(record.matchFormat) && record.setFormat === 'Short set' ? record.shortTiebreakPoints : ''],
      ['Final set rule', ['Best of 3 Sets', 'Best of 5 Sets'].includes(record.matchFormat) ? record.decidingSet : ''],
      ['Game scoring', ['Best of 3 Sets', 'Best of 5 Sets', 'Best of 1 Set'].includes(record.matchFormat) ? record.gameScoring : '']
    ].filter(([, value]) => value);
    const panel = document.createElement('section'); panel.className = 'ct-detail';
    panel.innerHTML = `<h2>Competition rules</h2>${entries.map(([label, value]) => `<div><span>${E(label)}</span><strong>${E(value)}</strong></div>`).join('')}`;
    grid.insertAdjacentElement('afterend', panel);
    return holder.innerHTML;
  };
})();
