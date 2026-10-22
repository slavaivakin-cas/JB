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
  connectionChanges: {},
  openFilter: null,
  expandedGroup: null,
  editingPrice: null,
  modal: null
};
const syncedConfigsByKey = new Map();
const syncErrorsByKey = new Map();
const syncJobsByKey = new Map();
const sharedUnitsByAppCountry = new Map();
const deletedCountryKeys = new Set();
let currentSyncKey = 'initial';
let currentPresetContext = null;

const app = document.querySelector('#app');
const modalRoot = document.querySelector('#modal-root');
const toastRoot = document.querySelector('#toast-root');
const priceKind = (entry) => entry.network.startsWith('AdMob') ||
  (entry.mode === 'bidding' && ['MAX', 'AppLovin'].includes(entry.mediator)) ? 'multiplier' : 'dollars';
const priceLabel = (value, entry) => `${priceKind(entry) === 'multiplier' ? 'x' : '$'}${Number(value).toFixed(2)}`;
const isComplete = (item) => Number(item.price) > 0;
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const modeLabel = (mode) => mode === 'bidding' ? 'Bidding' : 'Waterfall';
const groupKey = (network, mode) => `${network}::${mode}`;
const formatEnabled = (entry) => {
  const selected = state.formatSelections[groupKey(entry.network, entry.mode)] ?? state.formatSelections[entry.network];
  return !selected || selected.includes(entry.format);
};
const networkIsDisabled = (entry) => (state.networkStatuses[groupKey(entry.network, entry.mode)] ?? state.networkStatuses[entry.network]) === 'disabled';
const presetKey = (appId, presetId, country = 'GLOBAL') => `${appId}::${presetId}${country === 'GLOBAL' ? '' : `::${country}`}`;
const countryKey = (appId, country = 'GLOBAL') => `${appId}::country::${country}`;
const rowKey = (entry) => `${entry.network}::${entry.mode}::${entry.format}`;
function rememberCurrentUnits() {
  if (!currentPresetContext) return;
  const { appId, country } = currentPresetContext;
  const shared = sharedUnitsByAppCountry.get(countryKey(appId, country)) || new Map();
  for (const entry of state.configs) shared.set(rowKey(entry), structuredClone(entry.prices));
  sharedUnitsByAppCountry.set(countryKey(appId, country), shared);
}
function applySharedUnits(appId, country, configs) {
  const shared = sharedUnitsByAppCountry.get(countryKey(appId, country));
  if (!shared) return configs;
  for (const entry of configs) {
    const units = shared.get(rowKey(entry));
    if (units) entry.prices = structuredClone(units);
  }
  return configs;
}
function ensurePresetCountry(appId, presetId, country) {
  if (deletedCountryKeys.has(countryKey(appId, country))) return [];
  const global = configsByPreset.get(presetKey(appId, presetId));
  if (!global) return [];
  const key = presetKey(appId, presetId, country);
  if (!configsByPreset.has(key)) configsByPreset.set(key, applySharedUnits(appId, country, structuredClone(applySharedUnits(appId, 'GLOBAL', global))));
  return applySharedUnits(appId, country, configsByPreset.get(key));
}
function comparableRows(entries) {
  return entries.map((entry) => ({ key: rowKey(entry), mediator: entry.mediator, prices: entry.prices.map((unit) => ({ id: unit.id, unitId: unit.unitId, price: unit.price, paused: Boolean(unit.paused) })) }))
    .sort((a, b) => a.key.localeCompare(b.key));
}
const groupPanelId = (network, mode) => `units-${encodeURIComponent(groupKey(network, mode)).replace(/%/g, '_')}`;
const itemCountLabel = (count, mode) => {
  const forms = mode === 'bidding' ? ['флор', 'флора', 'флоров'] : ['юнит', 'юнита', 'юнитов'];
  const index = count % 10 === 1 && count % 100 !== 11 ? 0 : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? 1 : 2;
  return `${count} ${forms[index]}`;
};

function syncedEntry(entry) {
  return syncedConfigsByKey.get(currentSyncKey)?.find((saved) => rowKey(saved) === rowKey(entry));
}

function unitIsPending(entry, item) {
  const saved = syncedEntry(entry)?.prices.find((unit) => unit.id === item.id);
  return !saved || saved.price !== item.price || Boolean(saved.paused) !== Boolean(item.paused);
}

function unitIsNew(entry, item) {
  return !syncedEntry(entry)?.prices.some((unit) => unit.id === item.id);
}

function networkChanges(network) {
  const changes = [];
  changes.push(...(state.connectionChanges[network] || []));
  if (!state.configs.some((entry) => entry.network === network) && syncedConfigsByKey.get(currentSyncKey)?.some((entry) => entry.network === network)) changes.push('Сеть убрана из выбранного пресета.');
  if (!syncedConfigsByKey.get(currentSyncKey)?.some((entry) => entry.network === network)) changes.push('Конфигурация сети ожидает синхронизации.');
  for (const entry of state.configs.filter((item) => item.network === network)) {
    const savedEntry = syncedEntry(entry);
    if (!savedEntry) changes.push(`Добавлен формат: ${entry.format} · ${modeLabel(entry.mode)}.`);
    const oldUnits = new Map((savedEntry?.prices || []).map((unit) => [unit.id, unit]));
    const unitName = entry.mode === 'bidding' ? 'флор' : 'юнит';
    entry.prices.forEach((unit, index) => {
      const old = oldUnits.get(unit.id);
      if (!old) changes.push(`Добавлен ${unitName}: ${entry.format} · №${index + 1} · ${unit.price === '' ? 'цена не указана' : priceLabel(unit.price, entry)}`);
      else if (old.price !== unit.price) changes.push(`Изменена цена: ${entry.format} · №${index + 1} · ${priceLabel(old.price, entry)} → ${unit.price === '' ? '—' : priceLabel(unit.price, entry)}`);
      if (old && Boolean(old.paused) !== Boolean(unit.paused)) changes.push(`${unit.paused ? 'Не выгружать' : 'Возобновить'} ${unitName}: ${entry.format} · №${index + 1}.`);
      oldUnits.delete(unit.id);
    });
    for (const old of oldUnits.values()) changes.push(`Удалён ${unitName}: ${entry.format} · ${old.unitId || 'без ID'} · ${priceLabel(old.price, entry)}`);
    if (savedEntry && savedEntry.mediator !== entry.mediator) changes.push(`Изменён медиатор: ${entry.format} · ${savedEntry.mediator} → ${entry.mediator}`);
  }
  const currentRows = new Set(state.configs.filter((entry) => entry.network === network).map(rowKey));
  for (const saved of (syncedConfigsByKey.get(currentSyncKey) || []).filter((entry) => entry.network === network && !currentRows.has(rowKey(entry)))) changes.push(`Убран формат: ${saved.format} · ${modeLabel(saved.mode)}.`);
  return changes;
}

function syncIndicatorMarkup(network, mode) {
  const changes = networkChanges(network);
  const error = syncErrorsByKey.get(currentSyncKey)?.get(network);
  const working = syncJobsByKey.get(currentSyncKey)?.has(network);
  const status = working ? 'working' : error ? 'error' : changes.length ? 'pending' : 'ok';
  const label = { working: 'В работе', error: 'Ошибка', pending: 'Есть изменения', ok: 'OK' }[status];
  const title = { working: 'Обновление отправлено в сеть', error: 'Ошибка синхронизации', pending: 'Требуется синхронизация', ok: 'Синхронизировано' }[status];
  const details = [...(error ? [error] : []), ...changes];
  const summary = working ? '<span>Изменения отправлены. Ожидаем ответ сети.</span>' : details.length ? details.slice(0, 5).map((detail) => `<span>${escapeHtml(detail)}</span>`).join('') + (details.length > 5 ? `<span>И ещё ${details.length - 5} изменений</span>` : '') : '<span>Нет изменений для синхронизации.</span>';
  return `<button type="button" class="sync-indicator sync-${status}" data-action="sync-status" aria-label="${escapeHtml(network)}: ${label}" aria-describedby="${groupPanelId(network, mode)}-sync"><span class="sync-dot" aria-hidden="true"></span><span>${label}</span><span class="sync-tooltip" id="${groupPanelId(network, mode)}-sync" role="tooltip"><strong>${title}</strong><span class="sync-tooltip-lines">${summary}</span></span></button>`;
}

function visibleRows() {
  return state.configs.filter((entry) =>
    (state.allowedNetworks === null || state.allowedNetworks.has(entry.network)) &&
    formatEnabled(entry) &&
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
  const chips = priced.slice(0, 8).map((item) => {
    const pending = unitIsPending(entry, item);
    return `<button type="button" class="price-chip ${entry.mode === 'bidding' ? 'floor-chip' : ''} ${pending ? 'is-pending' : ''} ${item.paused ? 'is-paused' : ''}" data-action="toggle-group" data-group="${escapeHtml(key)}" data-price-id="${item.id}" aria-expanded="${expanded}" aria-controls="${panelId}" aria-label="${expanded ? 'Свернуть' : 'Показать'} все форматы ${escapeHtml(entry.network)}: ${priceLabel(item.price, entry)}${item.paused ? ', не выгружать' : pending ? ', не синхронизировано' : ''}">${priceLabel(item.price, entry)}</button>`;
  }).join('');
  const extra = priced.length > 8 ? `<button type="button" class="more-chip" data-action="toggle-group" data-group="${escapeHtml(key)}" aria-expanded="${expanded}" aria-controls="${panelId}" aria-label="${expanded ? 'Свернуть' : `Показать ещё ${itemCountLabel(priced.length - 8, entry.mode)} и все форматы`}">+${priced.length - 8}</button>` : '';
  return `<div class="prices">${chips ? chips + extra : `<button type="button" class="empty-open" data-action="toggle-group" data-group="${escapeHtml(key)}" aria-expanded="${expanded}" aria-controls="${panelId}">${entry.mode === 'bidding' ? 'Без флоров' : 'Нет юнитов'} <span aria-hidden="true">⌄</span></button>`}</div>`;
}

const unitIcons = {
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.5-1 10-10a2 2 0 0 0-3-3l-10 10L4 20Zm10-12 3 3"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7V5Z"/></svg>',
  delete: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v6m4-6v6"/></svg>',
  save: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 12 5 5L20 6"/></svg>',
  cancel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19"/></svg>'
};

function unitRowMarkup(entry, item, index) {
  const editing = state.editingPrice?.configId === entry.id && state.editingPrice.priceId === item.id;
  const unitLabel = entry.mode === 'bidding' ? 'флор' : 'юнит';
  const pending = unitIsPending(entry, item);
  const actions = editing
    ? `<button type="button" class="unit-action unit-save" data-action="save-price" data-id="${entry.id}" data-price-id="${item.id}" aria-label="Сохранить цену ${unitLabel}а №${index + 1}" title="Сохранить">${unitIcons.save}</button><button type="button" class="unit-action unit-cancel" data-action="cancel-price" data-id="${entry.id}" data-price-id="${item.id}" aria-label="Отменить правку ${unitLabel}а №${index + 1}" title="Отменить">${unitIcons.cancel}</button>`
    : `<button type="button" class="unit-action unit-edit" data-action="edit-price" data-id="${entry.id}" data-price-id="${item.id}" aria-label="Изменить цену ${unitLabel}а №${index + 1}" title="Изменить цену">${unitIcons.edit}</button><button type="button" class="unit-action unit-pause ${item.paused ? 'is-active' : ''}" data-action="toggle-pause" data-id="${entry.id}" data-price-id="${item.id}" aria-pressed="${Boolean(item.paused)}" aria-label="${item.paused ? 'Возобновить выгрузку' : 'Не выгружать'} ${unitLabel} №${index + 1}" title="${item.paused ? 'Возобновить выгрузку' : 'Не выгружать — скрыть из 1С и JSON'}">${item.paused ? unitIcons.play : unitIcons.pause}</button><button type="button" class="unit-action unit-delete" data-action="remove-item" data-id="${entry.id}" data-price-id="${item.id}" aria-label="Удалить ${unitLabel} №${index + 1}" title="Удалить">${unitIcons.delete}</button>`;
  return `<div class="unit-row ${editing ? 'is-editing' : ''} ${pending ? 'is-pending' : ''} ${item.paused ? 'is-paused' : ''}" data-price-id="${item.id}"><span class="unit-label">№${index + 1}</span><span class="unit-id-field ${item.unitId ? '' : 'is-empty'}" title="${item.unitId ? escapeHtml(item.unitId) : 'unit_id ещё не назначен'}">${item.unitId ? escapeHtml(item.unitId) : '—'}</span><div class="unit-price-field ${editing ? 'is-editing' : 'is-locked'}"><span>${priceKind(entry) === 'multiplier' ? 'x' : '$'}</span>${editing ? `<input type="number" min="0.01" step="0.01" inputmode="decimal" required value="${item.price === '' ? '' : Number(item.price).toFixed(2)}" placeholder="0.00" aria-label="${priceKind(entry) === 'multiplier' ? 'Мультипликатор' : 'Цена в долларах'} ${entry.network}, ${entry.format}, №${index + 1}" data-field="price" data-id="${entry.id}" data-price-id="${item.id}">` : `<span class="unit-price-value">${item.price === '' ? '—' : Number(item.price).toFixed(2)}</span>`}</div>${actions}</div>`;
}

function unitFormatMarkup(entry) {
  return `<section class="unit-format" aria-label="${escapeHtml(entry.format)}"><div class="unit-format-head"><strong>${escapeHtml(entry.format)}</strong><span>${itemCountLabel(entry.prices.length, entry.mode)}</span></div>
    <div class="unit-list">${entry.prices.length ? entry.prices.map((item, index) => unitRowMarkup(entry, item, index)).join('') : `<div class="unit-list-empty">${entry.mode === 'bidding' ? 'Флоров пока нет' : 'Юнитов пока нет'}</div>`}</div>
    <div class="unit-panel-foot"><button type="button" class="unit-add" data-action="add-item" data-id="${entry.id}">＋ ${entry.mode === 'bidding' ? 'Добавить флор' : 'Добавить юнит'}</button></div></section>`;
}

function expandedMarkup(network, mode) {
  const key = groupKey(network, mode);
  if (state.expandedGroup !== key) return '';
  const entries = state.configs.filter((entry) => entry.network === network && entry.mode === mode && formatEnabled(entry));
  return `<tr class="expanded-row" id="${groupPanelId(network, mode)}"><td colspan="5"><div class="unit-panel" role="region" aria-label="Все форматы ${escapeHtml(network)} · ${modeLabel(mode)}">${entries.map(unitFormatMarkup).join('')}</div></td></tr>`;
}

function rowMarkup(entry) {
  const key = groupKey(entry.network, entry.mode);
  return `<tr class="format-row ${state.expandedGroup === key ? 'is-expanded' : ''}" data-action="toggle-group" data-group="${escapeHtml(key)}" data-id="${entry.id}" tabindex="0" aria-expanded="${state.expandedGroup === key}" aria-controls="${groupPanelId(entry.network, entry.mode)}"><td class="blank-cell"></td><td class="blank-cell"></td><td class="format-cell" data-label="Формат">${escapeHtml(entry.format)}</td><td class="mediator-cell" data-label="Медиатор"><button type="button" class="mediator-link" data-action="edit-mediator" data-id="${entry.id}" aria-label="Изменить медиатор ${escapeHtml(entry.mediator)}">${escapeHtml(entry.mediator)}<span aria-hidden="true">↗</span></button></td><td class="prices-cell" data-label="Цены / коэффициенты">${priceCell(entry)}</td></tr>`;
}

function render() {
  const rows = visibleRows();
  const networkNames = [...new Set(state.configs.map((entry) => entry.network))];
  const formatNames = [...new Set(state.configs.map((entry) => entry.format))];
  const groups = networkNames.flatMap((network) => ['bidding', 'waterfall'].map((mode) => ({
    network, mode, entries: rows.filter((entry) => entry.network === network && entry.mode === mode)
  }))).filter((group) => group.entries.length);
  app.innerHTML = `<div class="table-frame"><table class="configuration-table"><colgroup><col class="col-network"><col class="col-mode"><col class="col-format"><col class="col-mediator"><col class="col-prices"></colgroup>
      <thead><tr><th>${filterHeader('network', 'Сеть', networkNames.filter((value) => state.allowedNetworks === null || state.allowedNetworks.has(value)).map((value) => [value, value]))}</th><th>${filterHeader('mode', 'Монетизация', [['bidding', 'Bidding'], ['waterfall', 'Waterfall']])}</th><th>${filterHeader('format', 'Формат', formatNames.map((value) => [value, value]))}</th><th>Медиатор</th><th>Цены / коэффициенты</th></tr></thead>
      <tbody>${groups.length ? groups.map(({ network, mode, entries }) => { const key = groupKey(network, mode); const expanded = state.expandedGroup === key; const status = state.networkStatuses[key] ?? state.networkStatuses[network]; return `<tr class="network-row ${expanded ? 'is-expanded' : ''}" data-action="toggle-group" data-group="${escapeHtml(key)}" tabindex="0" aria-expanded="${expanded}" aria-controls="${groupPanelId(network, mode)}"><th><span class="network-name">${escapeHtml(network)}</span>${status ? `<span class="table-status status-${status}">${escapeHtml(({active:'Активно',disabled:'Отключено',noSdk:'Нет SDK',noAdUnit:'Нет AdUnit'})[status] || '')}</span>` : ''}</th><th><span class="mode-tag ${mode}">${modeLabel(mode)}</span></th><td colspan="3"><div class="network-row-right">${syncIndicatorMarkup(network, mode)}<span class="network-expand" aria-hidden="true">⌄</span></div></td></tr>${entries.map(rowMarkup).join('')}${expandedMarkup(network, mode)}`; }).join('') : `<tr class="no-results"><td colspan="5">Нет конфигураций по выбранным фильтрам. <button type="button" data-action="reset-filters">Сбросить фильтры</button></td></tr>`}</tbody>
    </table></div>`;
  renderModal();
  window.onConfigurationChange?.();
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
  } else if (action === 'toggle-pause') {
    cancelPriceEdit();
    const entry = findConfig(target.dataset.id);
    const item = entry?.prices.find((unit) => unit.id === target.dataset.priceId);
    if (!item) return;
    item.paused = !item.paused;
    render();
    window.presetUI?.markDirty();
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
syncedConfigsByKey.set('initial', structuredClone(initialConfigs));

window.configTable = {
  priceKind,
  setApp(appId, networkNames) {
    cancelPriceEdit();
    if (!configsByApp.has(appId)) configsByApp.set(appId, structuredClone(initialConfigs));
    currentSyncKey = `${appId}::standalone`;
    if (!syncedConfigsByKey.has(currentSyncKey)) syncedConfigsByKey.set(currentSyncKey, structuredClone(configsByApp.get(appId)));
    state.configs = configsByApp.get(appId);
    state.allowedNetworks = new Set(networkNames);
    state.connectionChanges = {};
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
  setPreset(appId, presetId, configs, formatsByNetwork, statusesByNetwork, country = 'GLOBAL', connectionChanges = {}) {
    cancelPriceEdit();
    rememberCurrentUnits();
    const globalKey = presetKey(appId, presetId);
    const key = presetKey(appId, presetId, country);
    const sharedKey = countryKey(appId, country);
    if (!configsByPreset.has(globalKey)) configsByPreset.set(globalKey, applySharedUnits(appId, 'GLOBAL', structuredClone(configs)));
    if (!configsByPreset.has(key)) configsByPreset.set(key, applySharedUnits(appId, country, structuredClone(configsByPreset.get(globalKey))));
    applySharedUnits(appId, country, configsByPreset.get(key));
    if (!syncedConfigsByKey.has(sharedKey)) syncedConfigsByKey.set(sharedKey, country === 'GLOBAL' && !sharedUnitsByAppCountry.has(sharedKey) ? structuredClone(configsByPreset.get(key)) : []);
    if (!syncErrorsByKey.has(sharedKey)) syncErrorsByKey.set(sharedKey, new Map(presetId === 'full-is' && country === 'GLOBAL' ? [['Chartboost', 'Не удалось синхронизироваться с сетью Chartboost. Последняя попытка завершилась ошибкой.']] : []));
    currentSyncKey = sharedKey;
    currentPresetContext = { appId, presetId, country };
    state.configs = configsByPreset.get(key);
    state.allowedNetworks = null;
    state.formatSelections = structuredClone(formatsByNetwork);
    state.networkStatuses = structuredClone(statusesByNetwork);
    state.connectionChanges = structuredClone(connectionChanges);
    state.filters = { network: 'all', mode: 'all', format: 'all' };
    state.openFilter = null;
    state.expandedGroup = null;
    state.modal = null;
    render();
  },
  createCountry(appId, presetId, country) {
    cancelPriceEdit();
    rememberCurrentUnits();
    const globalKey = presetKey(appId, presetId);
    const key = presetKey(appId, presetId, country);
    if (country === 'GLOBAL' || !configsByPreset.has(globalKey) || configsByPreset.has(key)) return false;
    deletedCountryKeys.delete(countryKey(appId, country));
    const globalUnits = sharedUnitsByAppCountry.get(countryKey(appId, 'GLOBAL'));
    if (globalUnits) sharedUnitsByAppCountry.set(countryKey(appId, country), structuredClone(globalUnits));
    configsByPreset.set(key, applySharedUnits(appId, country, structuredClone(configsByPreset.get(globalKey))));
    syncedConfigsByKey.set(countryKey(appId, country), []);
    return true;
  },
  setCountry(appId, presetId, country) {
    const key = presetKey(appId, presetId, country);
    if (!configsByPreset.has(key)) return false;
    cancelPriceEdit();
    rememberCurrentUnits();
    currentSyncKey = countryKey(appId, country);
    currentPresetContext = { appId, presetId, country };
    state.configs = applySharedUnits(appId, country, configsByPreset.get(key));
    state.openFilter = null;
    state.expandedGroup = null;
    state.modal = null;
    render();
    return true;
  },
  deleteCountry(appId, presetId, country) {
    if (country === 'GLOBAL') return false;
    const suffix = `::${country}`;
    for (const key of configsByPreset.keys()) if (key.startsWith(`${appId}::`) && key.endsWith(suffix)) configsByPreset.delete(key);
    sharedUnitsByAppCountry.delete(countryKey(appId, country));
    deletedCountryKeys.add(countryKey(appId, country));
    syncedConfigsByKey.delete(countryKey(appId, country));
    syncErrorsByKey.delete(countryKey(appId, country));
    return true;
  },
  getPresetSnapshot(appId, presetId, country) {
    rememberCurrentUnits();
    return structuredClone(ensurePresetCountry(appId, presetId, country));
  },
  getActivePresetSnapshot(appId, presetId, country) {
    return this.getPresetSnapshot(appId, presetId, country).map((entry) => ({ ...entry, prices: entry.prices.filter((unit) => !unit.paused) }));
  },
  setNetworkFilter(networkName) {
    cancelPriceEdit();
    state.filters.network = networkName || 'all';
    state.openFilter = null;
    state.expandedGroup = null;
    render();
  },
  updatePresetState(formatsByNetwork, statusesByNetwork, connectionChanges = {}) {
    cancelPriceEdit();
    state.formatSelections = structuredClone(formatsByNetwork);
    state.networkStatuses = structuredClone(statusesByNetwork);
    state.connectionChanges = structuredClone(connectionChanges);
    if (state.filters.network !== 'all' && !state.configs.some((entry) => entry.network === state.filters.network)) state.filters.network = 'all';
    render();
  },
  getSnapshot() {
    return structuredClone(state.configs);
  },
  getWaterfallData(basePrices = {}) {
    const order = ['Banner', 'Banner Native', 'Interstitial', 'Rewarded', 'MREC', 'MREC Native', 'App Open', 'Native'];
    const entries = state.configs.filter((entry) =>
      (state.allowedNetworks === null || state.allowedNetworks.has(entry.network)) &&
      formatEnabled(entry)
    );
    const formats = [...new Set(entries.map((entry) => entry.format))].sort((a, b) =>
      (order.indexOf(a) < 0 ? order.length : order.indexOf(a)) - (order.indexOf(b) < 0 ? order.length : order.indexOf(b)) || a.localeCompare(b, 'ru')
    );
    const rows = entries.flatMap((entry) => entry.prices.map((unit, index) => {
      const kind = priceKind(entry);
      const basePrice = Number(basePrices[entry.format]) > 0 ? Number(basePrices[entry.format]) : 1;
      return {
        id: unit.id, unitId: unit.unitId, network: entry.network, format: entry.format, mode: entry.mode,
        price: unit.price, priceKind: kind, basePrice, effectivePrice: Number(unit.price) * (kind === 'multiplier' ? basePrice : 1),
        paused: Boolean(unit.paused), pending: unitIsPending(entry, unit), newlyAdded: unitIsNew(entry, unit),
        networkDisabled: networkIsDisabled(entry), index
      };
    }));
    rows.sort((a, b) => formats.indexOf(a.format) - formats.indexOf(b.format) ||
      (a.mode === b.mode ? 0 : a.mode === 'waterfall' ? -1 : 1) ||
      (Number(b.effectivePrice) || -Infinity) - (Number(a.effectivePrice) || -Infinity) ||
      a.network.localeCompare(b.network, 'ru', { sensitivity: 'base' }) || a.index - b.index);
    return { formats, rows };
  },
  startSyncNetworks(forceAll = false) {
    if (state.editingPrice) {
      const { configId, priceId } = state.editingPrice;
      const input = app.querySelector(`.unit-price-field input[data-id="${configId}"][data-price-id="${priceId}"]`);
      if (input?.checkValidity()) savePriceEdit();
    }
    const running = syncJobsByKey.get(currentSyncKey) || new Map();
    const networks = [...new Set([...state.configs.map((entry) => entry.network), ...(syncedConfigsByKey.get(currentSyncKey) || []).map((entry) => entry.network)])]
      .filter((network) => !running.has(network) && (forceAll || networkChanges(network).length || syncErrorsByKey.get(currentSyncKey)?.has(network)));
    for (const network of networks) running.set(network, structuredClone(state.configs.filter((entry) => entry.network === network)));
    syncJobsByKey.set(currentSyncKey, running);
    const key = currentSyncKey;
    render();
    return { key, networks };
  },
  startSyncAllCountries(appId, presetId, countries, forceAll = false) {
    if (state.editingPrice) {
      const { configId, priceId } = state.editingPrice;
      const input = app.querySelector(`.unit-price-field input[data-id="${configId}"][data-price-id="${priceId}"]`);
      if (input?.checkValidity()) savePriceEdit();
    }
    rememberCurrentUnits();
    const snapshots = Object.fromEntries(countries.map((country) => [country, structuredClone(ensurePresetCountry(appId, presetId, country))]));
    const names = new Set();
    for (const country of countries) {
      for (const entry of snapshots[country]) names.add(entry.network);
      for (const entry of syncedConfigsByKey.get(countryKey(appId, country)) || []) names.add(entry.network);
    }
    const networks = [...names].filter((network) => {
      if (countries.some((country) => syncJobsByKey.get(countryKey(appId, country))?.has(network))) return false;
      if (forceAll || state.connectionChanges[network]?.length) return true;
      return countries.some((country) => {
        const key = countryKey(appId, country);
        const current = snapshots[country].filter((entry) => entry.network === network);
        const synced = (syncedConfigsByKey.get(key) || []).filter((entry) => entry.network === network);
        return syncErrorsByKey.get(key)?.has(network) || JSON.stringify(comparableRows(current)) !== JSON.stringify(comparableRows(synced));
      });
    });
    for (const country of countries) {
      const key = countryKey(appId, country);
      const jobs = syncJobsByKey.get(key) || new Map();
      for (const network of networks) jobs.set(network, snapshots[country].filter((entry) => entry.network === network));
      if (networks.length) syncJobsByKey.set(key, jobs);
    }
    render();
    return { appId, presetId, countries: [...countries], networks };
  },
  finishSyncAllCountries(run, network) {
    const entriesByCountry = Object.fromEntries(run.countries.map((country) => [country, syncJobsByKey.get(countryKey(run.appId, country))?.get(network) || []]));
    const invalid = run.countries.map((country) => ({ country, entry: entriesByCountry[country].find((entry) => entry.prices.some((unit) => !unit.paused && !(Number(unit.price) > 0))) })).find(({ entry }) => entry);
    if (invalid) {
      for (const country of run.countries) {
        const key = countryKey(run.appId, country);
        const errors = syncErrorsByKey.get(key) || new Map();
        errors.set(network, `Не удалось перенести цены: ${invalid.country} · ${invalid.entry.format} — у ${invalid.entry.mode === 'bidding' ? 'флора' : 'юнита'} не указана ${priceKind(invalid.entry) === 'multiplier' ? 'величина коэффициента' : 'цена'}.`);
        syncErrorsByKey.set(key, errors);
        const jobs = syncJobsByKey.get(key);
        jobs?.delete(network);
        if (jobs && !jobs.size) syncJobsByKey.delete(key);
      }
      render();
      return { success: false, entriesByCountry, mediatorChanged: false };
    }
    let mediatorChanged = false;
    for (const country of run.countries) {
      const result = this.finishNetworkSync(countryKey(run.appId, country), network);
      mediatorChanged ||= Boolean(result.mediatorChanged);
      entriesByCountry[country] = result.entries || [];
    }
    return { success: true, entriesByCountry, mediatorChanged };
  },
  finishNetworkSync(key, network) {
    const jobs = syncJobsByKey.get(key);
    const entries = jobs?.get(network);
    if (!entries) return { success: false, skipped: true };
    const errors = syncErrorsByKey.get(key) || new Map();
    const mediatorChanged = entries.some((entry) => {
      const saved = syncedConfigsByKey.get(key)?.find((item) => rowKey(item) === rowKey(entry));
      return saved && saved.mediator !== entry.mediator;
    });
    const incomplete = entries.find((entry) => entry.prices.some((unit) => !unit.paused && !(Number(unit.price) > 0)));
    if (incomplete) {
      errors.set(network, `Не удалось перенести цены: ${incomplete.format} — у ${incomplete.mode === 'bidding' ? 'флора' : 'юнита'} не указана ${priceKind(incomplete) === 'multiplier' ? 'величина коэффициента' : 'цена'}.`);
    } else {
      const live = currentSyncKey === key ? state.configs : [];
      const shared = sharedUnitsByAppCountry.get(key);
      for (const entry of entries) for (const unit of entry.prices.filter((item) => !item.paused)) {
        if (unit.unitId) continue;
        unit.unitId = String(nextUnitNumber++);
        const liveUnit = live.find((row) => rowKey(row) === rowKey(entry))?.prices.find((item) => item.id === unit.id);
        if (liveUnit && !liveUnit.unitId) liveUnit.unitId = unit.unitId;
        const sharedUnit = shared?.get(rowKey(entry))?.find((item) => item.id === unit.id);
        if (sharedUnit && !sharedUnit.unitId) sharedUnit.unitId = unit.unitId;
      }
      const synced = syncedConfigsByKey.get(key) || [];
      for (let index = synced.length - 1; index >= 0; index--) if (synced[index].network === network) synced.splice(index, 1);
      synced.push(...entries);
      syncedConfigsByKey.set(key, synced);
      errors.delete(network);
    }
    syncErrorsByKey.set(key, errors);
    jobs.delete(network);
    if (!jobs.size) syncJobsByKey.delete(key);
    if (currentSyncKey === key) render();
    return { success: !incomplete, entries, mediatorChanged };
  },
  ensureNetworkUnits(appId, presetId, networkName, formats) {
    const prefix = `${appId}::${presetId}`;
    for (const [key, configs] of configsByPreset) {
      if (key !== prefix && !key.startsWith(`${prefix}::`)) continue;
      for (const entry of configs.filter((item) => item.network === networkName && formats.includes(item.format))) {
        if (entry.mode === 'waterfall' && !entry.prices.length) entry.prices.push({ id: `generated-${nextPriceId++}`, unitId: '', price: 1.00 });
        entry.prices.forEach((unit) => { if (!unit.paused && !unit.unitId) unit.unitId = String(8400000000 + nextPriceId++); });
      }
      if (state.configs === configs) render();
    }
  }
};

render();
