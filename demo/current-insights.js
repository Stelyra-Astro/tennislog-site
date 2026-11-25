/* Browser-only Insights preview. All numbers come from this demo's saved records. */
(() => {
  const periods = [
    { label: 'W', days: 7 }, { label: 'M', days: 30 },
    { label: '6M', days: 180 }, { label: 'Y', days: 365 },
    { label: 'All', days: 0 }
  ];
  const topics = ['Overview', 'Activity', 'Performance', 'Equipment'];
  const choices = ['Day', 'Week', 'Month', 'Year'];
  let period = 30;
  let topic = 'Overview';
  let grouping = 'Week';
  let selectedBucket = -1;
  let trend = false;

  const dateOf = value => {
    const date = new Date(`${String(value || '').slice(0, 10)}T12:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const dateText = date => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const today = () => {
    const date = new Date(); date.setHours(12, 0, 0, 0); return date;
  };
  const addDays = (date, delta) => {
    const copy = new Date(date); copy.setDate(copy.getDate() + delta); return copy;
  };
  const monthStart = (year, month) => new Date(year, month, 1, 12);
  const monthEnd = (year, month) => new Date(year, month + 1, 0, 12);
  const dateRange = () => {
    const end = today();
    const earliest = db.sessions.map(s => dateOf(s.date)).filter(Boolean).sort((a, b) => a - b)[0] || end;
    const start = period === 0 ? earliest : addDays(end, -(period - 1));
    return { start, end };
  };
  const inRange = (date, start, end) => date && date >= start && date <= end;
  const sessions = () => {
    const { start, end } = dateRange();
    return db.sessions.filter(s => inRange(dateOf(s.date), start, end));
  };
  const expenses = () => {
    const { start, end } = dateRange();
    return allExpenses().filter(row => inRange(dateOf(row.date), start, end));
  };
  const minutes = rows => rows.reduce((sum, row) => sum + (Number(row.minutes) || 0), 0);
  const hours = rows => `${(minutes(rows) / 60).toFixed(1)}h`;
  const defaultGrouping = value => value === 7 ? 'Day' : value === 30 ? 'Week' : 'Month';
  const sessionCard = row => `<button class="ci-session" data-action="detail" data-type="sessions" data-id="${E(row.id)}"><span>${E(dateText(dateOf(row.date)))} · ${E(row.kind || 'Session')}</span><strong>${E(row.name || 'Untitled session')}</strong><small>${E(String(Number(row.minutes) || 0))} min on court <b>›</b></small></button>`;

  function buckets() {
    const end = today(), range = dateRange();
    const list = [];
    if (grouping === 'Day') {
      const count = period === 0 ? Math.max(1, Math.round((end - range.start) / 86400000) + 1) : period;
      for (let i = count - 1; i >= 0; i--) {
        const date = addDays(end, -i);
        list.push({ start: date, end: date, label: dateText(date) });
      }
    } else if (grouping === 'Week') {
      const count = period === 0 ? Math.max(1, Math.ceil(((end - range.start) / 86400000 + 1) / 7)) : period === 30 ? 5 : Math.ceil(period / 7);
      for (let i = count - 1; i >= 0; i--) {
        const last = addDays(end, -i * 7), first = addDays(last, -6);
        list.push({ start: first, end: last, label: `${dateText(first)}–${dateText(last)}` });
      }
    } else if (grouping === 'Month') {
      const count = period === 0 ? (end.getFullYear() - range.start.getFullYear()) * 12 + end.getMonth() - range.start.getMonth() + 1 : period === 365 ? 12 : period === 180 ? 6 : period === 30 ? 1 : 1;
      for (let i = count - 1; i >= 0; i--) {
        const first = monthStart(end.getFullYear(), end.getMonth() - i);
        list.push({ start: first, end: monthEnd(first.getFullYear(), first.getMonth()), label: first.toLocaleDateString('en-US', { month: 'short' }) });
      }
    } else {
      const count = period === 0 ? end.getFullYear() - range.start.getFullYear() + 1 : Math.max(1, Math.ceil(period / 365));
      for (let i = count - 1; i >= 0; i--) {
        const year = end.getFullYear() - i;
        list.push({ start: monthStart(year, 0), end: monthEnd(year, 11), label: String(year) });
      }
    }
    return list.map(bucket => ({ ...bucket, rows: sessions().filter(s => inRange(dateOf(s.date), bucket.start, bucket.end)) }));
  }

  function chart() {
    const list = buckets(), chosen = Math.min(list.length - 1, selectedBucket < 0 ? list.length - 1 : selectedBucket);
    const max = Math.max(1, ...list.map(b => minutes(b.rows)));
    const average = list.reduce((sum, b) => sum + minutes(b.rows), 0) / list.length;
    const bars = list.map((bucket, index) => {
      const height = Math.max(3, Math.round(minutes(bucket.rows) / max * 105));
      return `<button class="ci-bar" data-ci="bucket" data-index="${index}" aria-label="${E(bucket.label)}: ${hours(bucket.rows)}, ${bucket.rows.length} sessions" aria-pressed="${index === chosen}"><span class="ci-bar-value">${bucket.rows.length ? hours(bucket.rows) : '0h'}</span><span class="ci-bar-fill" style="height:${height}px"></span><span class="ci-bar-label">${E(bucket.label)}</span></button>`;
    }).join('');
    const active = list[chosen];
    return `<section class="ci-card"><div class="ci-card-head"><h2>Court time trend</h2><div><label for="ci-grouping" style="font-size:12px;color:#b9c4cf">Group by </label><select id="ci-grouping" data-ci="grouping" aria-label="Chart grouping">${choices.map(choice => `<option ${choice === grouping ? 'selected' : ''}>${choice}</option>`).join('')}</select></div></div><div class="ci-card-head" style="margin-top:8px"><span style="font-size:12px;color:#b9c4cf">${sessions().length} sessions</span><button data-ci="trend" aria-pressed="${trend}">Trend ${trend ? 'on' : 'off'}</button></div><div class="ci-chart-scroll"><div class="ci-chart ${trend ? 'trend' : ''}">${trend ? `<i class="ci-average" style="bottom:${Math.round(average / max * 105) + 28}px"></i>` : ''}${bars}</div></div><p>${trend ? 'Dashed line: average court time per shown period. ' : ''}Select a bar to inspect its saved sessions.</p><div class="ci-detail-list"><h2>${E(active.label)} · ${active.rows.length} sessions</h2>${active.rows.length ? active.rows.map(sessionCard).join('') : '<p>No recorded sessions in this period.</p>'}</div></section>`;
  }

  const stat = (value, label) => `<div class="ci-stat"><strong>${E(String(value))}</strong><span>${E(label)}</span></div>`;
  const link = (action, label) => `<button class="ci-link" data-v12="${action}">${label}<span>›</span></button>`;
  function breakdown(data, unit) {
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...entries.map(([, value]) => value));
    return entries.length ? `<div class="ci-breakdown">${entries.map(([label, value]) => `<div class="ci-breakdown-row"><span>${E(label)}</span><strong>${E(String(value))} ${unit}</strong><div class="ci-breakdown-track"><i style="width:${Math.round(value / max * 100)}%"></i></div></div>`).join('')}</div>` : '<p>No linked data in this period.</p>';
  }

  function content() {
    const rows = sessions();
    if (topic === 'Overview') {
      const spend = expenses().reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
      return `<div class="ci-stats">${stat(hours(rows), 'On court')}${stat(rows.length, 'Sessions')}${stat(`$${spend.toFixed(0)}`, 'Recorded costs')}</div>${chart()}<section class="ci-card"><h2>Explore your game</h2>${link('focus', 'Training focus')}${link('matches', 'Match patterns')}${link('inventory', 'Equipment use')}</section>`;
    }
    if (topic === 'Activity') {
      const counts = {};
      for (const row of rows) counts[row.kind || 'Other'] = (counts[row.kind || 'Other'] || 0) + 1;
      return `<div class="ci-stats">${stat(rows.length, 'Sessions')}${stat(hours(rows), 'On court')}${stat(Object.keys(counts).length, 'Activity types')}</div><section class="ci-card"><h2>Activities recorded</h2>${breakdown(counts, 'sessions')}</section>${chart()}${link('focus', 'Training focus and progress')}`;
    }
    if (topic === 'Performance') {
      const matches = rows.filter(row => /match/i.test(String(row.kind || '')));
      const wins = matches.filter(row => /^(won|win)$/i.test(String(row.result || ''))).length;
      const losses = matches.filter(row => /^(lost|loss)$/i.test(String(row.result || ''))).length;
      return `<div class="ci-stats">${stat(matches.length, 'Match records')}${stat(wins, 'Recorded wins')}${stat(losses, 'Recorded losses')}</div><section class="ci-card"><h2>Match outcomes</h2><p>Only explicitly saved results count as wins or losses. Incomplete scores stay in your records without a guessed result.</p>${breakdown({ Won: wins, Lost: losses, 'Not scored or unfinished': matches.length - wins - losses }, 'matches')}${link('matches', 'Explore results and opponents')}</section>${chart()}`;
    }
    const usage = {};
    for (const row of rows) for (const id of new Set(row.gearIds || [])) {
      const gear = db.gear.find(item => item.id === id);
      if (gear) usage[`${gear.brand ? gear.brand + ' ' : ''}${gear.name}`] = (usage[`${gear.brand ? gear.brand + ' ' : ''}${gear.name}`] || 0) + 1;
    }
    return `<div class="ci-stats">${stat(Object.keys(usage).length, 'Items linked')}${stat(rows.length, 'Sessions')}${stat(hours(rows), 'On court')}</div><section class="ci-card"><h2>Equipment in saved sessions</h2><p>Counts show sessions linked to each item in this browser demo.</p>${breakdown(usage, 'sessions')}${link('inventory', 'Explore gear analysis')}</section>`;
  }

  insights = function () {
    const range = dateRange();
    return head('Insights') + `<div class="page current-insights"><h1>Insights</h1><div class="ci-periods" aria-label="Analysis period">${periods.map(item => `<button data-ci="period" data-days="${item.days}" aria-pressed="${period === item.days}">${item.label}</button>`).join('')}</div><div class="ci-topics" role="tablist" aria-label="Insight sections">${topics.map(item => `<button role="tab" data-ci="topic" data-topic="${item}" aria-selected="${topic === item}" aria-pressed="${topic === item}">${item}</button>`).join('')}</div><div class="ci-range">${dateText(range.start)} – ${dateText(range.end)} · browser demo records</div>${content()}</div>`;
  };

  document.addEventListener('click', event => {
    const target = event.target.closest('[data-ci]');
    if (!target || target.dataset.ci === 'grouping') return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (target.dataset.ci === 'period') {
      period = Number(target.dataset.days); grouping = defaultGrouping(period); selectedBucket = -1;
    } else if (target.dataset.ci === 'topic') topic = target.dataset.topic;
    else if (target.dataset.ci === 'bucket') selectedBucket = Number(target.dataset.index);
    else if (target.dataset.ci === 'trend') trend = !trend;
    render();
  }, true);
  document.addEventListener('change', event => {
    if (event.target.dataset.ci !== 'grouping') return;
    event.stopImmediatePropagation(); grouping = event.target.value; selectedBucket = -1; render();
  }, true);
  const previousRender = render;
  render = function (reset = false) {
    previousRender(reset);
    if (route.screen === 'insights') requestAnimationFrame(() => {
      const scroller = document.querySelector('.ci-chart-scroll');
      if (scroller) scroller.scrollLeft = scroller.scrollWidth;
    });
  };
})();
