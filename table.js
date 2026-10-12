const NETWORKS = ['AdMob', 'AppLovin', 'Unity Ads', 'ironSource', 'Pangle', 'Mintegral'];
const FORMATS = ['Banner', 'Interstitial', 'Rewarded'];
const MEDIATORS = ['CAS', 'MAX', 'ironSource', 'LevelPlay', 'AdMob Mediation'];
let nextPriceId = 1;
let nextUnitNumber = 6346834782;

const prices = (network, format, ...values) => values.map((price) => ({
  id: `price-${nextPriceId++}`,
  unitId: String(nextUnitNumber++),
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
  allowedNetworks: null,
  formatSelections: {},
  networkStatuses: {},
  openFilter: null,
  expandedGroup: null,
  editingPrice: null,
  modal: null
};

const app = document.querySelector('#app');
const modalRoot = document.querySelector('#modal-root');
const toastRoot = document.querySelector('#toast-root');
const money = (value) => `x${Number(value).toFixed(2)}`;
const isComplete = (item) => Number(item.price) > 0;
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const modeLabel = (mode) => mode === 'bidding' ? 'Bidding' : 'Waterfall';
const groupKey = (network, mode) => `${network}::${mode}`;
const groupPanelId = (network, mode) => `units-${encodeURIComponent(groupKey(network, mode)).replace(/%/g, '_')}`;
const itemCountLabel = (count, mode) => {
  const forms = mode === 'bidding' ? ['флор', 'флора', 'флоров'] : ['юнит', 'юнита', 'юнитов'];
  const index = count % 10 === 1 && count % 100 !== 11 ? 0 : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? 1 : 2;
  return `${count} ${forms[index]}`;
};

function visibleRows() {
  return state.configs.filter((entry) =>
    (state.allowedNetworks === null || state.allowedNetworks.has(entry.network)) &&
    (!state.formatSelections[entry.network] || state.formatSelections[entry.network].includes(entry.format)) &&
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
  const key = groupKey(entry.network, entry.mode);
  const expanded = state.expandedGroup === key;
  const panelId = groupPanelId(entry.network, entry.mode);
  const chips = priced.slice(0, 4).map((item) => `<button type="button" class="price-chip ${entry.mode === 'bidding' ? 'floor-chip' : ''}" data-action="toggle-group" data-group="${escapeHtml(key)}" data-price-id="${item.id}" aria-expanded="${expanded}" aria-controls="${panelId}" aria-label="${expanded ? 'Свернуть' : 'Показать'} все форматы ${escapeHtml(entry.network)}: ${money(item.price)}">${money(item.price)}</button>`).join('');
  const extra = priced.length > 4 ? `<button type="button" class="more-chip" data-action="toggle-group" data-group="${escapeHtml(key)}" aria-expanded="${expanded}" aria-controls="${panelId}" aria-label="${expanded ? 'Свернуть' : `Показать ещё ${itemCountLabel(priced.length - 4, entry.mode)} и все форматы`}">+${priced.length - 4}</button>` : '';
  return `<div class="prices">${chips ? chips + extra : `<button type="button" class="empty-open" data-action="toggle-group" data-group="${escapeHtml(key)}" aria-expanded="${expanded}" aria-controls="${panelId}">${entry.mode === 'bidding' ? 'Без флоров' : 'Нет юнитов'} <span aria-hidden="true">⌄</span></button>`}</div>`;
}

const unitIcons = {
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.5-1 10-10a2 2 0 0 0-3-3l-10 10L4 20Zm10-12 3 3"/></svg>',
  delete: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v6m4-6v6"/></svg>',
  save: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 12 5 5L20 6"/></svg>',
  cancel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19"/></svg>'
};

function unitRowMarkup(entry, item, index) {
  const editing = state.editingPrice?.configId === entry.id && state.editingPrice.priceId === item.id;
  const unitLabel = entry.mode === 'bidding' ? 'флор' : 'юнит';
  return `<div class="unit-row ${editing ? 'is-editing' : ''}" data-price-id="${item.id}"><span class="unit-label">№${index + 1}</span><span class="unit-id-field ${item.unitId ? '' : 'is-empty'}" title="${item.unitId ? escapeHtml(item.unitId) : 'unit_id ещё не назначен'}">${item.unitId ? escapeHtml(item.unitId) : '—'}</span><div class="unit-price-field ${editing ? 'is-editing' : 'is-locked'}"><span>x</span>${editing ? `<input type="number" min="0.01" step="0.01" inputmode="decimal" required value="${item.price === '' ? '' : Number(item.price).toFixed(2)}" placeholder="0.00" aria-label="Мультипликатор ${entry.network}, ${entry.format}, №${index + 1}" data-field="price" data-id="${entry.id}" data-price-id="${item.id}">` : `<span class="unit-price-value">${item.price === '' ? '—' : Number(item.price).toFixed(2)}</span>`}</div>${editing ? `<button type="button" class="unit-action unit-save" data-action="save-price" data-id="${entry.id}" data-price-id="${item.id}" aria-label="Сохранить цену ${unitLabel}а №${index + 1}" title="Сохранить">${unitIcons.save}</button><button type="button" class="unit-action unit-cancel" data-action="cancel-price" data-id="${entry.id}" data-price-id="${item.id}" aria-label="Отменить правку ${unitLabel}а №${index + 1}" title="Отменить">${unitIcons.cancel}</button>` : `<button type="button" class="unit-action unit-edit" data-action="edit-price" data-id="${entry.id}" data-price-id="${item.id}" aria-label="Изменить цену ${unitLabel}а №${index + 1}" title="Изменить цену">${unitIcons.edit}</button><button type="button" class="unit-action unit-delete" data-action="remove-item" data-id="${entry.id}" data-price-id="${item.id}" aria-label="Удалить ${unitLabel} №${index + 1}" title="Удалить">${unitIcons.delete}</button>`}</div>`;
}

function unitFormatMarkup(entry) {
  return `<section class="unit-format" aria-label="${escapeHtml(entry.format)}"><div class="unit-format-head"><strong>${escapeHtml(entry.format)}</strong><span>${itemCountLabel(entry.prices.length, entry.mode)}</span></div>
    <div class="unit-list">${entry.prices.length ? entry.prices.map((item, index) => unitRowMarkup(entry, item, index)).join('') : `<div class="unit-list-empty">${entry.mode === 'bidding' ? 'Флоров пока нет' : 'Юнитов пока нет'}</div>`}</div>
    <div class="unit-panel-foot"><button type="button" class="unit-add" data-action="add-item" data-id="${entry.id}">＋ ${entry.mode === 'bidding' ? 'Добавить флор' : 'Добавить юнит'}</button></div></section>`;
}

function expandedMarkup(network, mode) {
  const key = groupKey(network, mode);
  if (state.expandedGroup !== key) return '';
  const entries = state.configs.filter((entry) => entry.network === network && entry.mode === mode && (!state.formatSelections[network] || state.formatSelections[network].includes(entry.format)));
  return `<tr class="expanded-row" id="${groupPanelId(network, mode)}"><td colspan="5"><div class="unit-panel" role="region" aria-label="Все форматы ${escapeHtml(network)} · ${modeLabel(mode)}">${entries.map(unitFormatMarkup).join('')}</div></td></tr>`;
}

function rowMarkup(entry) {
  const key = groupKey(entry.network, entry.mode);
  return `<tr class="format-row ${state.expandedGroup === key ? 'is-expanded' : ''}" data-action="toggle-group" data-group="${escapeHtml(key)}" data-id="${entry.id}" tabindex="0" aria-expanded="${state.expandedGroup === key}" aria-controls="${groupPanelId(entry.network, entry.mode)}"><td class="blank-cell"></td><td class="blank-cell"></td><td class="format-cell" data-label="Формат">${escapeHtml(entry.format)}</td><td class="mediator-cell" data-label="Медиатор"><button type="button" class="mediator-link" data-action="edit-mediator" data-id="${entry.id}" aria-label="Изменить медиатор ${escapeHtml(entry.mediator)}">${escapeHtml(entry.mediator)}<span aria-hidden="true">↗</span></button></td><td class="prices-cell" data-label="Мультипликаторы">${priceCell(entry)}</td></tr>`;
}

function render() {
  const rows = visibleRows();
  const networkNames = [...new Set(state.configs.map((entry) => entry.network))];
  const formatNames = [...new Set(state.configs.map((entry) => entry.format))];
  const groups = networkNames.flatMap((network) => ['bidding', 'waterfall'].map((mode) => ({
    network, mode, entries: rows.filter((entry) => entry.network === network && entry.mode === mode)
  }))).filter((group) => group.entries.length);
  app.innerHTML = `<div class="table-frame"><table class="configuration-table"><colgroup><col class="col-network"><col class="col-mode"><col class="col-format"><col class="col-mediator"><col class="col-prices"></colgroup>
      <thead><tr><th>${filterHeader('network', 'Сеть', networkNames.filter((value) => state.allowedNetworks === null || state.allowedNetworks.has(value)).map((value) => [value, value]))}</th><th>${filterHeader('mode', 'Монетизация', [['bidding', 'Bidding'], ['waterfall', 'Waterfall']])}</th><th>${filterHeader('format', 'Формат', formatNames.map((value) => [value, value]))}</th><th>Медиатор</th><th>Мультипликаторы</th></tr></thead>
      <tbody>${groups.length ? groups.map(({ network, mode, entries }) => { const key = groupKey(network, mode); const expanded = state.expandedGroup === key; return `<tr class="network-row ${expanded ? 'is-expanded' : ''}" data-action="toggle-group" data-group="${escapeHtml(key)}" tabindex="0" aria-expanded="${expanded}" aria-controls="${groupPanelId(network, mode)}"><th><span class="network-name">${escapeHtml(network)}</span>${state.networkStatuses[network] ? `<span class="table-status status-${state.networkStatuses[network]}">${escapeHtml(({active:'Активно',disabled:'Отключено',noSdk:'Нет SDK',noAdUnit:'Нет AdUnit'})[state.networkStatuses[network]] || '')}</span>` : ''}</th><th><span class="mode-tag ${mode}">${modeLabel(mode)}</span></th><td colspan="3"><span class="network-expand" aria-hidden="true">⌄</span></td></tr>${entries.map(rowMarkup).join('')}${expandedMarkup(network, mode)}`; }).join('') : `<tr class="no-results"><td colspan="5">Нет конфигураций по выбранным фильтрам. <button type="button" data-action="reset-filters">Сбросить фильтры</button></td></tr>`}</tbody>
    </table></div>`;
  renderModal();
}

function findConfig(id) { return state.configs.find((entry) => entry.id === id); }

function cancelPriceEdit() {
  if (state.editingPrice?.isNew) {
    const entry = findConfig(state.editingPrice.configId);
    if (entry) entry.prices = entry.prices.filter((item) => item.id !== state.editingPrice.priceId);
  }
  state.editingPrice = null;
}

function savePriceEdit() {
  if (!state.editingPrice) return;
  const { configId, priceId } = state.editingPrice;
  const input = app.querySelector(`.unit-price-field input[data-id="${configId}"][data-price-id="${priceId}"]`);
  if (!input) return;
  if (!input.checkValidity()) { input.reportValidity(); return; }
  const entry = findConfig(configId);
  const item = entry?.prices.find((candidate) => candidate.id === priceId);
  if (!item) return;
  item.price = Number(input.value);
  state.editingPrice = null;
  render();
  window.presetUI?.markDirty();
}

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
    cancelPriceEdit();
    state.openFilter = state.openFilter === target.dataset.filter ? null : target.dataset.filter;
    render();
  } else if (action === 'choose-filter') {
    cancelPriceEdit();
    state.filters[target.dataset.filter] = target.dataset.value;
    if (target.dataset.filter === 'network') window.presetUI?.syncSelection(target.dataset.value);
    state.openFilter = null;
    state.expandedGroup = null;
    render();
  } else if (action === 'reset-filters') {
    cancelPriceEdit();
    state.filters = { network: 'all', mode: 'all', format: 'all' };
    window.presetUI?.syncSelection('all');
    state.openFilter = null;
    state.expandedGroup = null;
    render();
  } else if (action === 'toggle-group') {
    cancelPriceEdit();
    state.expandedGroup = state.expandedGroup === target.dataset.group ? null : target.dataset.group;
    state.openFilter = null;
    render();
  } else if (action === 'add-item') {
    cancelPriceEdit();
    const entry = findConfig(target.dataset.id);
    const newId = `price-${nextPriceId++}`;
    entry.prices.push({ id: newId, unitId: '', price: '' });
    state.editingPrice = { configId: entry.id, priceId: newId, isNew: true };
    render();
    requestAnimationFrame(() => app.querySelector(`.unit-price-field input[data-price-id="${newId}"]`)?.focus());
  } else if (action === 'edit-price') {
    cancelPriceEdit();
    state.editingPrice = { configId: target.dataset.id, priceId: target.dataset.priceId, isNew: false };
    render();
    requestAnimationFrame(() => app.querySelector(`.unit-price-field input[data-price-id="${target.dataset.priceId}"]`)?.select());
  } else if (action === 'save-price') {
    savePriceEdit();
  } else if (action === 'cancel-price') {
    cancelPriceEdit();
    render();
  } else if (action === 'edit-mediator') {
    cancelPriceEdit();
    state.modal = { kind: 'mediator', configId: target.dataset.id };
    render();
  } else if (action === 'close-modal') {
    state.modal = null;
    renderModal();
  } else if (action === 'remove-item') {
    cancelPriceEdit();
    const entry = findConfig(target.dataset.id);
    entry.prices = entry.prices.filter((item) => item.id !== target.dataset.priceId);
    render();
    window.presetUI?.markDirty();
    toast(entry.mode === 'bidding' ? 'Флор удалён' : 'Юнит удалён');
  }
});

document.addEventListener('input', (event) => {
  if (event.target.dataset.field !== 'price') return;
  event.target.setCustomValidity('');
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
  window.presetUI?.markDirty();
});

document.addEventListener('keydown', (event) => {
  if (event.target.matches('[data-field="price"]') && (event.key === 'Enter' || event.key === 'Escape')) {
    event.preventDefault();
    if (event.key === 'Enter') savePriceEdit();
    else { cancelPriceEdit(); render(); }
    return;
  }
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.network-row[data-action="toggle-group"],.format-row[data-action="toggle-group"]')) {
    event.preventDefault();
    cancelPriceEdit();
    state.expandedGroup = state.expandedGroup === event.target.dataset.group ? null : event.target.dataset.group;
    render();
    return;
  }
  if (event.key !== 'Escape') return;
  if (state.modal) { state.modal = null; renderModal(); }
  else if (state.openFilter) { state.openFilter = null; render(); }
});

const initialConfigs = structuredClone(state.configs);
const configsByApp = new Map();
const configsByPreset = new Map();

window.configTable = {
  setApp(appId, networkNames) {
    cancelPriceEdit();
    if (!configsByApp.has(appId)) configsByApp.set(appId, structuredClone(initialConfigs));
    state.configs = configsByApp.get(appId);
    state.allowedNetworks = new Set(networkNames);
    state.filters = { network: 'all', mode: 'all', format: 'all' };
    state.openFilter = null;
    state.expandedGroup = null;
    render();
  },
  setAllowedNetworks(networkNames) {
    cancelPriceEdit();
    state.allowedNetworks = new Set(networkNames);
    if (state.filters.network !== 'all' && !state.allowedNetworks.has(state.filters.network)) {
      state.filters.network = 'all';
    }
    state.expandedGroup = null;
    render();
  },
  setPreset(appId, presetId, configs, formatsByNetwork, statusesByNetwork) {
    cancelPriceEdit();
    const key = `${appId}::${presetId}`;
    if (!configsByPreset.has(key)) configsByPreset.set(key, structuredClone(configs));
    state.configs = configsByPreset.get(key);
    state.allowedNetworks = null;
    state.formatSelections = structuredClone(formatsByNetwork);
    state.networkStatuses = structuredClone(statusesByNetwork);
    state.filters = { network: 'all', mode: 'all', format: 'all' };
    state.openFilter = null;
    state.expandedGroup = null;
    state.modal = null;
    render();
  },
  setNetworkFilter(networkName) {
    cancelPriceEdit();
    state.filters.network = networkName || 'all';
    state.openFilter = null;
    state.expandedGroup = null;
    render();
  },
  updatePresetState(formatsByNetwork, statusesByNetwork) {
    cancelPriceEdit();
    state.formatSelections = structuredClone(formatsByNetwork);
    state.networkStatuses = structuredClone(statusesByNetwork);
    if (state.filters.network !== 'all' && !state.configs.some((entry) => entry.network === state.filters.network)) state.filters.network = 'all';
    render();
  },
  getSnapshot() {
    return structuredClone(state.configs);
  },
  ensureNetworkUnits(appId, presetId, networkName, formats) {
    const configs = configsByPreset.get(`${appId}::${presetId}`);
    if (!configs) return;
    for (const entry of configs.filter((item) => item.network === networkName && formats.includes(item.format))) {
      if (entry.mode === 'waterfall' && !entry.prices.length) entry.prices.push({ id: `generated-${nextPriceId++}`, unitId: '', price: 1.00 });
      entry.prices.forEach((unit) => { if (!unit.unitId) unit.unitId = String(8400000000 + nextPriceId++); });
    }
    if (state.configs === configs) render();
  }
};

render();
