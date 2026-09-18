const NETWORKS = ['AdMob', 'AppLovin', 'Unity Ads', 'ironSource', 'Pangle', 'Mintegral'];
const FORMATS = ['Banner', 'Interstitial', 'Rewarded'];
const MEDIATORS = ['MAX', 'LevelPlay', 'AdMob Mediation'];
let nextPriceId = 1;

const prices = (network, format, ...values) => values.map((price, index) => ({
  id: `price-${nextPriceId++}`,
  unitId: `${network.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${format.toLowerCase()}_${String(index + 1).padStart(2, '0')}`,
  price
}));
const config = (network, mode, format, mediator, values = []) => ({
  id: `${network}-${mode}-${format}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  network, mode, format, mediator, prices: prices(network, format, ...values)
});

const state = {
  configs: [
    config('AdMob', 'bidding', 'Banner', 'MAX'),
    config('AdMob', 'bidding', 'Interstitial', 'MAX'),
    config('AdMob', 'bidding', 'Rewarded', 'MAX'),
    config('AdMob', 'waterfall', 'Banner', 'AdMob Mediation', [0.30, 0.50, 0.80, 1.20, 1.80]),
    config('AdMob', 'waterfall', 'Rewarded', 'AdMob Mediation', [3.50, 4.50, 6.00, 8.00, 10.00, 12.00]),
    config('AppLovin', 'bidding', 'Interstitial', 'MAX'),
    config('AppLovin', 'bidding', 'Rewarded', 'MAX'),
    config('AppLovin', 'waterfall', 'Banner', 'MAX', [0.40, 0.80, 1.50, 2.00]),
    config('AppLovin', 'waterfall', 'Interstitial', 'MAX', [2.50, 3.50, 4.50, 6.50, 8.00]),
    config('Unity Ads', 'bidding', 'Rewarded', 'LevelPlay'),
    config('Unity Ads', 'waterfall', 'Interstitial', 'MAX', [2.00, 3.00, 4.50, 6.00]),
    config('Unity Ads', 'waterfall', 'Rewarded', 'MAX', [4.00, 5.00, 7.00, 9.00, 12.00]),
    config('ironSource', 'bidding', 'Interstitial', 'LevelPlay'),
    config('ironSource', 'bidding', 'Rewarded', 'LevelPlay'),
    config('ironSource', 'waterfall', 'Banner', 'MAX', [0.40, 0.70, 1.00, 1.40]),
    config('ironSource', 'waterfall', 'Rewarded', 'MAX', [4.00, 5.50, 7.50, 10.00]),
    config('Pangle', 'bidding', 'Banner', 'MAX'),
    config('Pangle', 'bidding', 'Rewarded', 'MAX'),
    config('Pangle', 'waterfall', 'Interstitial', 'MAX', [1.80, 2.80, 4.00, 5.20, 7.00]),
    config('Mintegral', 'bidding', 'Rewarded', 'MAX'),
    config('Mintegral', 'waterfall', 'Banner', 'MAX', [0.35, 0.60, 0.90, 1.30, 1.80, 2.40]),
    config('Mintegral', 'waterfall', 'Interstitial', 'MAX', [3.00, 4.00, 5.50, 7.50])
  ],
  filters: { network: 'all', mode: 'all', format: 'all' },
  openFilter: null,
  expandedId: null,
  modal: null
};

const app = document.querySelector('#app');
const modalRoot = document.querySelector('#modal-root');
const toastRoot = document.querySelector('#toast-root');
const money = (value) => `$${Number(value).toFixed(2)}`;
const isComplete = (item) => Number(item.price) > 0;
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const modeLabel = (mode) => mode === 'bidding' ? 'Bidding' : 'Waterfall';
const itemCountLabel = (count, mode) => {
  const forms = mode === 'bidding' ? ['флор', 'флора', 'флоров'] : ['юнит', 'юнита', 'юнитов'];
  const index = count % 10 === 1 && count % 100 !== 11 ? 0 : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? 1 : 2;
  return `${count} ${forms[index]}`;
};

function visibleRows() {
  return state.configs.filter((entry) =>
    (state.filters.network === 'all' || entry.network === state.filters.network) &&
    (state.filters.mode === 'all' || entry.mode === state.filters.mode) &&
    (state.filters.format === 'all' || entry.format === state.filters.format)
  );
}

function filterHeader(name, label, options) {
  const value = state.filters[name];
  const active = value !== 'all';
  const shown = active ? `${label}: ${name === 'mode' ? modeLabel(value) : value}` : label;
  return `<div class="filter-anchor ${state.openFilter === name ? 'is-open' : ''}">
    <button type="button" class="filter-trigger ${active ? 'is-active' : ''}" data-action="toggle-filter" data-filter="${name}" aria-expanded="${state.openFilter === name}" aria-haspopup="menu" title="${escapeHtml(shown)}"><span class="filter-label">${escapeHtml(shown)}</span><span class="chevron" aria-hidden="true">⌄</span></button>
    ${state.openFilter === name ? `<div class="filter-menu" role="menu" aria-label="Фильтр: ${label}"><button type="button" role="menuitemradio" aria-checked="${!active}" data-action="choose-filter" data-filter="${name}" data-value="all">Все <span>${!active ? '✓' : ''}</span></button>${options.map(([optionValue, optionLabel]) => `<button type="button" role="menuitemradio" aria-checked="${value === optionValue}" data-action="choose-filter" data-filter="${name}" data-value="${escapeHtml(optionValue)}">${escapeHtml(optionLabel)} <span>${value === optionValue ? '✓' : ''}</span></button>`).join('')}</div>` : ''}
  </div>`;
}

function priceCell(entry) {
  const priced = entry.prices.filter(isComplete);
  const chips = priced.slice(0, 4).map((item) => `<button type="button" class="price-chip ${entry.mode === 'bidding' ? 'floor-chip' : ''}" data-action="expand-units" data-id="${entry.id}" data-price-id="${item.id}" aria-expanded="${state.expandedId === entry.id}" aria-controls="units-${entry.id}" aria-label="${state.expandedId === entry.id ? 'Свернуть' : 'Показать'} ${entry.mode === 'bidding' ? 'флоры' : 'юниты'}: ${money(item.price)}">${money(item.price)}</button>`).join('');
  const extra = priced.length > 4 ? `<button type="button" class="more-chip" data-action="expand-units" data-id="${entry.id}" aria-expanded="${state.expandedId === entry.id}" aria-controls="units-${entry.id}" aria-label="${state.expandedId === entry.id ? 'Свернуть список' : `Показать ещё ${itemCountLabel(priced.length - 4, entry.mode)}`}">+${priced.length - 4}</button>` : '';
  return `<div class="prices">${chips ? chips + extra : `<button type="button" class="empty-open" data-action="expand-units" data-id="${entry.id}" aria-expanded="${state.expandedId === entry.id}" aria-controls="units-${entry.id}">${entry.mode === 'bidding' ? 'Без флоров' : 'Нет юнитов'} <span aria-hidden="true">⌄</span></button>`}</div>`;
}

function expandedMarkup(entry) {
  if (state.expandedId !== entry.id) return '';
  return `<tr class="expanded-row" id="units-${entry.id}"><td colspan="5"><div class="unit-panel">
    <div class="unit-list">${entry.prices.length ? entry.prices.map((item, index) => `<div class="unit-row"><span class="unit-label">№${index + 1}</span><span class="unit-id-field ${item.unitId ? '' : 'is-empty'}" title="${item.unitId ? escapeHtml(item.unitId) : 'unit_id ещё не назначен'}">${item.unitId ? escapeHtml(item.unitId) : '—'}</span><div class="unit-price-field"><span>$</span><input type="number" min="0.01" step="0.01" inputmode="decimal" value="${item.price === '' ? '' : Number(item.price).toFixed(2)}" placeholder="0.00" aria-label="Цена ${entry.network}, ${entry.format}, №${index + 1}" data-field="price" data-id="${entry.id}" data-price-id="${item.id}"></div><button type="button" class="unit-delete" data-action="remove-item" data-id="${entry.id}" data-price-id="${item.id}" aria-label="Удалить ${entry.mode === 'bidding' ? 'флор' : 'юнит'} №${index + 1}" title="Удалить"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v6m4-6v6"/></svg></button></div>`).join('') : `<div class="unit-list-empty">${entry.mode === 'bidding' ? 'Флоров пока нет' : 'Юнитов пока нет'}</div>`}</div>
    <div class="unit-panel-foot"><button type="button" class="unit-add" data-action="add-item" data-id="${entry.id}">＋ ${entry.mode === 'bidding' ? 'Добавить флор' : 'Добавить юнит'}</button></div></div></td></tr>`;
}

function rowMarkup(entry) {
  return `<tr class="format-row ${state.expandedId === entry.id ? 'is-expanded' : ''}"><td class="blank-cell"></td><td class="blank-cell"></td><td class="format-cell" data-label="Формат">${entry.format}</td><td class="mediator-cell" data-label="Медиатор"><button type="button" class="mediator-link" data-action="edit-mediator" data-id="${entry.id}" aria-label="Изменить медиатор ${escapeHtml(entry.mediator)}">${escapeHtml(entry.mediator)}<span aria-hidden="true">↗</span></button></td><td class="prices-cell" data-label="Цены · USD CPM">${priceCell(entry)}</td></tr>${expandedMarkup(entry)}`;
}

function render() {
  const rows = visibleRows();
  const groups = NETWORKS.flatMap((network) => ['bidding', 'waterfall'].map((mode) => ({
    network, mode, entries: rows.filter((entry) => entry.network === network && entry.mode === mode)
  }))).filter((group) => group.entries.length);
  app.innerHTML = `<div class="table-frame"><table class="configuration-table"><colgroup><col class="col-network"><col class="col-mode"><col class="col-format"><col class="col-mediator"><col class="col-prices"></colgroup>
      <thead><tr><th>${filterHeader('network', 'Сеть', NETWORKS.map((value) => [value, value]))}</th><th>${filterHeader('mode', 'Монетизация', [['bidding', 'Bidding'], ['waterfall', 'Waterfall']])}</th><th>${filterHeader('format', 'Формат', FORMATS.map((value) => [value, value]))}</th><th>Медиатор</th><th>Цены · USD CPM</th></tr></thead>
      <tbody>${groups.length ? groups.map(({ network, mode, entries }) => `<tr class="network-row"><th><span class="network-name">${escapeHtml(network)}</span></th><th><span class="mode-tag ${mode}">${modeLabel(mode)}</span></th><td colspan="3"></td></tr>${entries.map(rowMarkup).join('')}`).join('') : `<tr class="no-results"><td colspan="5">Нет конфигураций по выбранным фильтрам. <button type="button" data-action="reset-filters">Сбросить фильтры</button></td></tr>`}</tbody>
    </table></div>`;
  renderModal();
}

function findConfig(id) { return state.configs.find((entry) => entry.id === id); }

function renderModal() {
  if (!state.modal) { modalRoot.innerHTML = ''; return; }
  const entry = findConfig(state.modal.configId);
  if (!entry) { state.modal = null; modalRoot.innerHTML = ''; return; }
  modalRoot.innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" data-modal-panel><div class="modal-head"><div><span>${escapeHtml(entry.network)} · ${modeLabel(entry.mode)} · ${entry.format}</span><h2 id="modal-title">Изменить медиатор</h2></div><button type="button" class="modal-close" data-action="close-modal" aria-label="Закрыть">×</button></div>
    <form id="edit-form"><label class="field"><span>Медиатор</span><select name="mediator" required>${MEDIATORS.map((name) => `<option value="${escapeHtml(name)}" ${entry.mediator === name ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('')}</select></label><div class="modal-actions"><button type="button" class="secondary-button" data-action="close-modal">Отмена</button><button type="submit" class="save-button">Сохранить</button></div></form></div></div>`;
  requestAnimationFrame(() => modalRoot.querySelector('select')?.focus());
}

function toast(message) {
  toastRoot.innerHTML = `<div class="toast">✓ ${escapeHtml(message)}</div>`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { toastRoot.innerHTML = ''; }, 2800);
}

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) {
    if (state.openFilter && !event.target.closest('.filter-anchor')) { state.openFilter = null; render(); }
    return;
  }
  const action = target.dataset.action;
  if (action === 'close-modal' && target.classList.contains('modal-backdrop') && event.target.closest('[data-modal-panel]')) return;
  if (action === 'toggle-filter') {
    state.openFilter = state.openFilter === target.dataset.filter ? null : target.dataset.filter;
    render();
  } else if (action === 'choose-filter') {
    state.filters[target.dataset.filter] = target.dataset.value;
    state.openFilter = null;
    state.expandedId = null;
    render();
  } else if (action === 'reset-filters') {
    state.filters = { network: 'all', mode: 'all', format: 'all' };
    state.openFilter = null;
    state.expandedId = null;
    render();
  } else if (action === 'expand-units') {
    state.expandedId = state.expandedId === target.dataset.id ? null : target.dataset.id;
    state.openFilter = null;
    render();
  } else if (action === 'add-item') {
    const entry = findConfig(target.dataset.id);
    const newId = `price-${nextPriceId++}`;
    entry.prices.push({ id: newId, unitId: '', price: '' });
    render();
    requestAnimationFrame(() => app.querySelector(`.unit-price-field input[data-price-id="${newId}"]`)?.focus());
  } else if (action === 'edit-mediator') {
    state.modal = { kind: 'mediator', configId: target.dataset.id };
    renderModal();
  } else if (action === 'close-modal') {
    state.modal = null;
    renderModal();
  } else if (action === 'remove-item') {
    const entry = findConfig(target.dataset.id);
    entry.prices = entry.prices.filter((item) => item.id !== target.dataset.priceId);
    render();
    toast(entry.mode === 'bidding' ? 'Флор удалён' : 'Юнит удалён');
  }
});

document.addEventListener('input', (event) => {
  if (event.target.dataset.field !== 'price') return;
  const entry = findConfig(event.target.dataset.id);
  const item = entry?.prices.find((candidate) => candidate.id === event.target.dataset.priceId);
  if (!item) return;
  item.price = event.target.value === '' ? '' : Number(event.target.value);
  const chip = app.querySelector(`.price-chip[data-price-id="${item.id}"]`);
  if (chip && Number(item.price) > 0) chip.textContent = money(item.price);
});

document.addEventListener('focusout', (event) => {
  if (event.target.dataset.field !== 'price') return;
  if (event.target.value !== '') {
    const price = Number(event.target.value);
    if (Number.isFinite(price) && price > 0) event.target.value = price.toFixed(2);
  }
  const entry = findConfig(event.target.dataset.id);
  const summary = app.querySelector('.format-row.is-expanded .prices');
  if (entry && summary) summary.innerHTML = priceCell(entry);
});

document.addEventListener('submit', (event) => {
  if (event.target.id !== 'edit-form') return;
  event.preventDefault();
  const entry = findConfig(state.modal.configId);
  const values = new FormData(event.target);
  entry.mediator = String(values.get('mediator'));
  toast('Медиатор обновлён');
  state.modal = null;
  render();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (state.modal) { state.modal = null; renderModal(); }
  else if (state.openFilter) { state.openFilter = null; render(); }
});

render();
