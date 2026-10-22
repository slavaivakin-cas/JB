const PRESET_FORMAT_NAMES = { banner: 'Banner', banner_native: 'Banner Native', interstitial: 'Interstitial', rewarded: 'Rewarded', native: 'Native', mrec: 'MREC', mrec_native: 'MREC Native', app_open: 'App Open' };
const PRESET_FORMAT_CODES = { Banner: 'B', 'Banner Native': 'BN', MREC: 'M', 'MREC Native': 'MN', Interstitial: 'I', Rewarded: 'R', 'App Open': 'O', Native: 'N' };
const PRESET_STATUS_LABELS = { active: 'Активно', noSdk: 'Нет SDK', noAdUnit: 'Нет AdUnit', disabled: 'Отключено' };
const presetEscape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

const PRESET_CATALOG = window.PRESET_SOURCE.map((source) => ({
  id: source.id,
  title: source.title,
  root: source.root,
  rootRole: source.rows.length ? 'Mediation' : 'Passthrough',
  nodes: source.rows.map((row, index) => {
    const key = `${source.id}-${index}`;
    const mediators = Object.fromEntries(Object.entries(row.mediators).map(([format, mediator]) => [PRESET_FORMAT_NAMES[format], mediator]));
    const supportedFormats = Object.keys(mediators);
    return { key, name: row.network, tableName: row.network, mode: row.mode, role: row.mode === 'bidding' ? 'Bidding' : 'Waterfall', status: 'active', selectedFormats: supportedFormats, supportedFormats, mediators, children: [],
      account: '', parameter: '', appKey: `appkey_${key.replace(/[^a-z0-9]/gi, '')}_demo`, task: 'idle', attempts: 0 };
  })
}));

const presetRoot = document.querySelector('#preset-app');
const configActions = document.querySelector('#config-actions');
const presetDialogRoot = document.querySelector('#preset-dialog-root');
const countryBar = document.querySelector('#country-bar');
const countryDialogRoot = document.querySelector('#country-dialog-root');
const COUNTRY_OPTIONS = [
  ['US', 'США'], ['MX', 'Мексика'], ['RU', 'Россия'], ['BR', 'Бразилия'],
  ['CA', 'Канада'], ['GB', 'Великобритания'], ['DE', 'Германия'], ['FR', 'Франция'],
  ['ES', 'Испания'], ['IT', 'Италия'], ['TR', 'Турция'], ['IN', 'Индия'],
  ['JP', 'Япония'], ['KR', 'Южная Корея'], ['ID', 'Индонезия'], ['AU', 'Австралия']
];
let currentPresetApp = null;
let activePresetId = null;
let countryDialog = null;

function presetDefinition(app) { return PRESET_CATALOG.find((item) => item.id === app.presetId) || PRESET_CATALOG[0]; }
function presetWorkspace(app) {
  app.configWorkspace ||= { networks: {}, formatPreferences: {}, connectionBaseline: {}, countries: ['GLOBAL'], selectedCountry: 'GLOBAL', lastSynced: null, draft: null, dirty: false, revision: 0, pendingCountries: new Set() };
  return app.configWorkspace;
}
function markWorkspaceDirty(app, allCountries = false) {
  const workspace = presetWorkspace(app);
  workspace.dirty = true;
  workspace.revision++;
  for (const country of allCountries ? workspace.countries : [workspace.selectedCountry]) workspace.pendingCountries.add(country);
}
function networkIdentity(node) { return `${node.tableName}::${node.mode}`; }
function rememberNetworkState(app, presetId) {
  const state = app.presetStates?.[presetId];
  if (!state) return;
  const workspace = presetWorkspace(app);
  for (const node of flatNodes(state.nodes)) {
    const key = networkIdentity(node);
    workspace.networks[key] = { status: node.status, previousStatus: node.previousStatus, account: node.account, parameter: node.parameter };
    workspace.formatPreferences[key] ||= {};
    for (const format of node.supportedFormats) workspace.formatPreferences[key][format] = node.selectedFormats.includes(format);
  }
}
function presetState(app) {
  app.presetId ||= 'full-is';
  app.presetStates ||= {};
  const workspace = presetWorkspace(app);
  if (!app.presetStates[app.presetId]) {
    const nodes = structuredClone(presetDefinition(app).nodes);
    for (const node of flatNodes(nodes)) {
      const key = networkIdentity(node);
      const saved = workspace.networks[key];
      if (saved) Object.assign(node, saved);
      const preferences = workspace.formatPreferences[key] || {};
      node.selectedFormats = node.supportedFormats.filter((format) => appSupportsFormat(app, format) && preferences[format] !== false);
      if (!saved && !Object.keys(workspace.networks).length) workspace.connectionBaseline[key] = connectionSnapshot(node);
    }
    app.presetStates[app.presetId] = { nodes, selectedKey: null, countries: workspace.countries, selectedCountry: workspace.selectedCountry, connectionJobs: new Map(), published: null, showJson: false, validation: null };
  }
  const state = app.presetStates[app.presetId];
  state.countries = workspace.countries;
  state.selectedCountry = workspace.selectedCountry;
  return state;
}
function flatNodes(nodes) { return nodes.flatMap((node) => [node, ...flatNodes(node.children || [])]); }
function connectionSnapshot(node) { return { status: node.status, account: node.account, parameter: node.parameter }; }
function allNodes(app) { return flatNodes(presetState(app).nodes); }
function findPresetNode(app, key) { return allNodes(app).find((node) => node.key === key); }
function appSupportsFormat(app, format) { return app.placements.includes(({ MREC: 'Mrec', 'MREC Native': 'Mrec_native', 'Banner Native': 'Banner_native', 'App Open': 'App_open' })[format] || format); }
function statusMap(app) {
  const result = {};
  for (const node of allNodes(app)) {
    result[`${node.tableName}::${node.mode}`] = node.status;
    result[node.tableName] = result[node.tableName] === 'active' || node.status === 'active' ? 'active' : node.status;
  }
  return result;
}
function formatMap(app) {
  const result = {};
  for (const node of allNodes(app)) {
    result[`${node.tableName}::${node.mode}`] = node.selectedFormats;
    result[node.tableName] = [...new Set([...(result[node.tableName] || []), ...node.selectedFormats])];
  }
  return result;
}
function connectionReasons(app) {
  const workspace = presetWorkspace(app);
  const reasons = {};
  for (const node of allNodes(app)) {
    const before = workspace.connectionBaseline[networkIdentity(node)];
    const changes = [];
    if (!before) changes.push('Новая сеть — требуется обновить подключение.');
    else {
      if (before.status !== node.status) changes.push(`Сеть ${node.status === 'disabled' ? 'выключена' : 'включена'} — требуется обновить подключение.`);
      if (before.account !== node.account) changes.push(`Аккаунт: ${before.account || 'не выбран'} → ${node.account || 'не выбран'}.`);
      if (before.parameter !== node.parameter) changes.push(`Параметр: ${before.parameter || 'не выбран'} → ${node.parameter || 'не выбран'}.`);
    }
    if (changes.length) reasons[node.tableName] = [...(reasons[node.tableName] || []), ...changes];
  }
  return reasons;
}
function connectionStatus(app, node) {
  const state = presetState(app);
  if (state.connectionJobs.has(node.tableName)) return { kind: 'working', label: 'В работе' };
  if (connectionReasons(app)[node.tableName]?.length) return { kind: 'pending', label: 'Требуется обновить' };
  if (node.status !== 'active') return { kind: 'off', label: ({ disabled: 'Отключена', noSdk: 'Нет SDK', noAdUnit: 'Нет AdUnit' })[node.status] || 'Не подключена' };
  return { kind: 'ok', label: 'Подключена' };
}
function presetConfigs(app) {
  const samples = { Banner: [0.30, 0.50, 0.80, 1.20, 1.80], 'Banner Native': [0.30, 0.50, 0.80, 1.20], Interstitial: [1.50, 2.20, 3.40, 4.60, 6.00], Rewarded: [3.00, 4.50, 6.00, 8.00, 10.00, 12.00], Native: [0.45, 0.70, 1.10], MREC: [0.55, 0.90, 1.30], 'MREC Native': [0.55, 0.90, 1.30], 'App Open': [1.10, 1.60, 2.40] };
  const legacyNetworkSlots = { AdMob: 0, Chartboost: 1, IronSource: 2, Unity: 3, YsoNetwork: 4, AppLovin: 5, Bigo: 6, CASExchange: 7, DTExchange: 8, Mintegral: 9, InMobi: 10, Pangle: 11, Vungle: 12 };
  const legacyUnitCounts = { AdMob: 3, Chartboost: 4, IronSource: 5, Pangle: 6, Vungle: 5 };
  const formatSlots = ['Banner', 'Interstitial', 'Rewarded', 'Native', 'App Open', 'MREC', 'Banner Native', 'MREC Native'];
  return allNodes(app).flatMap((node, networkIndex) => node.supportedFormats.map((format, formatIndex) => {
    const mode = node.mode;
    const sampleCount = legacyUnitCounts[node.name] ?? 3 + networkIndex % 4;
    const values = node.status === 'active' && node.selectedFormats.includes(format) ? (mode === 'bidding' ? [] : samples[format].slice(0, sampleCount)) : [];
    const stem = `${node.key}-${format.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    return { id: `${stem}-${mode}`, network: node.tableName, mode, format, mediator: node.mediators[format],
      prices: values.map((price, index) => ({ id: `${stem}-${index}`, unitId: String(4546834782 + (legacyNetworkSlots[node.name] ?? 20 + networkIndex) * 10000 + (formatSlots.indexOf(format) < 0 ? formatIndex : formatSlots.indexOf(format)) * 100 + index), price })) };
  }));
}

function mediationDiagramMarkup(app, state, definition) {
  const assignments = new Map(window.configTable.getPresetSnapshot(app.id, app.presetId, state.selectedCountry)
    .map((entry) => [`${entry.network}::${entry.mode}::${entry.format}`, entry.mediator]));
  const branches = new Map();
  for (const node of flatNodes(state.nodes)) {
    for (const format of node.selectedFormats) {
      const mediator = assignments.get(`${node.tableName}::${node.mode}::${format}`) || node.mediators[format] || definition.root;
      if (!branches.has(mediator)) branches.set(mediator, new Map());
      const cards = branches.get(mediator);
      if (!cards.has(node.key)) cards.set(node.key, { node, formats: [] });
      cards.get(node.key).formats.push(format);
    }
  }
  const otherMediators = [...branches.keys()].filter((name) => name !== definition.root)
    .sort((left, right) => left === 'CAS' ? -1 : right === 'CAS' ? 1 : left.localeCompare(right, 'en'));
  const directCards = [...(branches.get(definition.root)?.values() || [])];
  const cardWidth = 96;
  const cardHeight = 62;
  const rootHeight = 48;
  const gap = 8;
  const primaryRail = 64;
  const primaryTop = 76;
  const secondaryStart = 162;
  const secondaryStep = 96;
  const primaryCount = otherMediators.length + directCards.length;
  const rootName = definition.root === 'MAX' ? 'AppLovin' : definition.root;
  const rootSubtitle = definition.rootRole === 'Passthrough' ? 'Passthrough' : `${definition.root} · Mediation`;
  const rootMarkup = (center) => `<div class="mediation-root" style="left:${center}px"><strong>${presetEscape(rootName)}</strong><span>${presetEscape(rootSubtitle)}</span><em>Активно</em></div>`;
  if (!primaryCount) return `<div class="mediation-diagram" data-tree-canvas="true" aria-label="Дерево медиации ${presetEscape(definition.title)}"><div class="mediation-tree" style="width:124px;height:${rootHeight}px">${rootMarkup(62)}</div>${state.nodes.length ? '<p class="mediation-empty">Нет форматов для выбранного приложения.</p>' : ''}</div>`;
  const primaryWidth = primaryCount * cardWidth + Math.max(0, primaryCount - 1) * gap;
  const childWidths = otherMediators.map((name) => {
    const count = branches.get(name).size;
    return count * cardWidth + Math.max(0, count - 1) * gap;
  });
  const leftPadding = Math.max(0, ...childWidths.map((width, index) => width / 2 - index * (cardWidth + gap) - cardWidth / 2));
  const childLefts = childWidths.map((width, index) => leftPadding + index * (cardWidth + gap) + cardWidth / 2 - width / 2);
  const treeWidth = Math.ceil(Math.max(leftPadding + primaryWidth, ...childWidths.map((width, index) => childLefts[index] + width)));
  const treeHeight = (otherMediators.length ? secondaryStart + (otherMediators.length - 1) * secondaryStep : primaryTop) + cardHeight + 12;
  const primaryCenters = Array.from({ length: primaryCount }, (_, index) => leftPadding + index * (cardWidth + gap) + cardWidth / 2);
  const rootCenter = leftPadding + primaryWidth / 2;
  const paths = [`M ${rootCenter} ${rootHeight} V ${primaryRail}`, `M ${primaryCenters[0]} ${primaryRail} H ${primaryCenters.at(-1)}`,
    ...primaryCenters.map((center) => `M ${center} ${primaryRail} V ${primaryTop}`)];
  otherMediators.forEach((name, index) => {
    const childCount = branches.get(name).size;
    const centers = Array.from({ length: childCount }, (_, childIndex) => childLefts[index] + childIndex * (cardWidth + gap) + cardWidth / 2);
    const railY = secondaryStart + index * secondaryStep - 12;
    paths.push(`M ${primaryCenters[index]} ${primaryTop + cardHeight} V ${railY}`);
    paths.push(`M ${centers[0]} ${railY} H ${centers.at(-1)}`);
    paths.push(...centers.map((center) => `M ${center} ${railY} V ${railY + 12}`));
  });
  const networkCard = ({ node, formats }, mediator) => {
    const selected = state.selectedKey === node.key;
    const formatCodes = formats.map((format, index) => `${index ? '<span class="mediation-comma">, </span>' : ''}<span class="mediation-code" data-format="${presetEscape(format)}" title="${presetEscape(format)}">${presetEscape(PRESET_FORMAT_CODES[format] || format)}</span>`).join('');
    return `<button type="button" class="mediation-network status-${node.status} ${selected ? 'is-selected' : ''}" data-preset-action="select-node" data-mediator="${presetEscape(mediator)}" data-node-key="${presetEscape(node.key)}" aria-pressed="${selected}" title="${presetEscape(node.tableName)} · ${presetEscape(node.role)} · ${presetEscape(mediator)}: ${presetEscape(formats.join(', '))}"><strong>${presetEscape(node.name)}</strong><span class="mediation-network-role">${node.mode === 'bidding' ? 'Bid' : 'Floor'}: ${formatCodes}</span><span class="mediation-network-state">${PRESET_STATUS_LABELS[node.status]}</span></button>`;
  };
  const hubMarkup = otherMediators.map((mediator) => `<div class="mediation-hub" title="Медиатор ${presetEscape(mediator)}"><strong>${presetEscape(mediator)}</strong><span>Mediation</span><em>Активно</em></div>`).join('');
  const childMarkup = otherMediators.map((mediator, index) => `<section class="mediation-child-row" data-mediator="${presetEscape(mediator)}" style="left:${childLefts[index]}px;top:${secondaryStart + index * secondaryStep}px">${[...branches.get(mediator).values()].map((card) => networkCard(card, mediator)).join('')}</section>`).join('');
  return `<div class="mediation-diagram" data-tree-canvas="true" aria-label="Дерево медиации ${presetEscape(definition.title)}"><div class="mediation-tree" style="width:${treeWidth}px;height:${treeHeight}px"><svg class="mediation-connectors" width="${treeWidth}" height="${treeHeight}" viewBox="0 0 ${treeWidth} ${treeHeight}" aria-hidden="true"><path d="${paths.join(' ')}"/></svg>${rootMarkup(rootCenter)}<div class="mediation-primary-row" style="left:${leftPadding}px;top:${primaryTop}px">${hubMarkup}${directCards.map((card) => networkCard(card, definition.root)).join('')}</div>${childMarkup}</div></div>`;
}

function jsonPayload(app) {
  const state = presetState(app);
  return { appId: app.storeId, preset: app.presetId, mediation: presetDefinition(app).root, countries: state.countries.map((country) => {
    const configs = window.configTable.getActivePresetSnapshot(app.id, app.presetId, country);
    return { country, networks: allNodes(app).filter((node) => node.status !== 'disabled').map((node) => ({ name: node.tableName, role: node.role, mode: node.mode, status: node.status, account: node.account, appKey: node.appKey, formats: node.selectedFormats, units: configs.filter((entry) => entry.network === node.tableName && entry.mode === node.mode && node.selectedFormats.includes(entry.format)).map((entry) => ({ format: entry.format, mode: entry.mode, mediator: entry.mediator, units: entry.prices.map((unit) => ({ unit_id: unit.unitId, [window.configTable.priceKind(entry) === 'multiplier' ? 'multiplier' : entry.mode === 'bidding' ? 'floor' : 'price']: unit.price })) })) })) };
  }) };
}
function validatePayload(payload, app) {
  const errors = [];
  for (const { country, networks } of payload.countries) {
    const sourceConfigs = window.configTable.getPresetSnapshot(app.id, app.presetId, country);
    for (const network of networks.filter((item) => item.status === 'active')) {
      if (!network.account || !network.appKey) errors.push(`${country} · ${network.name}: нет аккаунта или App Key`);
      if (!network.formats.length) errors.push(`${country} · ${network.name}: не выбран формат`);
      for (const row of network.units) {
        const source = sourceConfigs.find((entry) => entry.network === network.name && entry.format === row.format && entry.mode === row.mode);
        if (row.mode === 'waterfall' && !row.units.length && !source?.prices.some((unit) => unit.paused)) errors.push(`${country} · ${network.name} · ${row.format}: нет юнитов`);
        for (const [index, unit] of row.units.entries()) {
          if (!unit.unit_id) errors.push(`${country} · ${network.name} · ${row.format} · №${index + 1}: нет Unit ID`);
          const sourceKind = source ? window.configTable.priceKind(source) : 'dollars';
          const value = unit.multiplier ?? unit.floor ?? unit.price;
          if (!(Number(value) > 0)) errors.push(`${country} · ${network.name} · ${row.format} · №${index + 1}: нет ${sourceKind === 'multiplier' ? 'коэффициента' : 'цены'}`);
        }
      }
    }
  }
  return errors;
}
function configActionMarkup(app) {
  const state = presetState(app);
  const workspace = presetWorkspace(app);
  const published = state.published ? `Опубликовано: ${state.published.target === 'test' ? 'тестовый' : 'рабочий'} контур (демо)` : 'Нет опубликованной версии';
  const synced = workspace.lastSynced ? `Последняя успешная синхронизация: ${presetEscape(PRESET_CATALOG.find((item) => item.id === workspace.lastSynced.presetId)?.title || workspace.lastSynced.presetId)} · все страны · ${presetEscape(workspace.lastSynced.at)}` : 'Успешных синхронизаций в этой сессии ещё нет';
  return `<div class="config-action-card"><div class="config-action-head"><div><h2>Черновик конфигурации</h2><p>${workspace.draft ? 'Черновик сохранён до перезагрузки' : 'Правки хранятся до перезагрузки'} · ${published}${workspace.dirty ? ' · Есть неотправленные изменения' : ''}<br>${synced}</p></div><div class="config-action-buttons"><button type="button" class="preset-outline-button" data-preset-action="save-draft">Сохранить черновик</button><button type="button" class="preset-outline-button" data-preset-action="validate">Проверить JSON</button><button type="button" class="preset-outline-button" data-preset-action="show-json">${state.showJson ? 'Скрыть JSON' : 'Показать JSON'}</button><button type="button" class="preset-primary-button" data-preset-action="publish" data-target="test">Тестовый контур</button><button type="button" class="preset-primary-button" data-preset-action="publish" data-target="production">Рабочий контур</button></div></div>${state.validation ? `<div class="preset-validation ${state.validation.length ? 'has-errors' : ''}">${state.validation.length ? `<strong>Проверьте конфигурацию:</strong><ul>${state.validation.map((message) => `<li>${presetEscape(message)}</li>`).join('')}</ul>` : '<strong>Проверка пройдена. Обязательные поля заполнены.</strong>'}</div>` : ''}${state.showJson ? `<pre class="config-json">${presetEscape(JSON.stringify(jsonPayload(app), null, 2))}</pre>` : ''}</div>`;
}

function countryName(code) { return COUNTRY_OPTIONS.find(([value]) => value === code)?.[1] || code; }
function availableCountries(app) { return COUNTRY_OPTIONS.filter(([code]) => !presetState(app).countries.includes(code)); }
function renderCountryBar() {
  if (!currentPresetApp) return;
  const state = presetState(currentPresetApp);
  const globe = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-3 3-4 6-4 9s1 6 4 9m0-18c3 3 4 6 4 9s-1 6-4 9"/></svg>';
  countryBar.innerHTML = `<div class="country-strip"><div class="country-tabs" role="group" aria-label="Страна конфигурации">${state.countries.map((code) => `<button type="button" class="country-tab ${state.selectedCountry === code ? 'is-active' : ''}" data-preset-action="select-country" data-country="${code}" aria-pressed="${state.selectedCountry === code}" title="${code === 'GLOBAL' ? 'Глобальная конфигурация' : presetEscape(countryName(code))}">${code === 'GLOBAL' ? globe : ''}<span>${code === 'GLOBAL' ? 'Global' : code}</span></button>`).join('')}</div><div class="country-actions"><button type="button" class="country-add" data-preset-action="open-add-country" ${availableCountries(currentPresetApp).length ? '' : 'disabled'}>＋ Добавить страну</button>${state.selectedCountry === 'GLOBAL' ? '' : '<button type="button" class="country-delete" data-preset-action="open-delete-country">Удалить страну</button>'}</div></div>`;
}
function renderCountryOptions() {
  if (countryDialog?.kind !== 'add' || !currentPresetApp) return;
  const query = countryDialog.query.trim().toLocaleLowerCase('ru');
  const options = availableCountries(currentPresetApp).filter(([code, name]) => `${code} ${name}`.toLocaleLowerCase('ru').includes(query));
  countryDialogRoot.querySelector('.country-options').innerHTML = options.length ? options.map(([code, name]) => `<button type="button" class="country-option" data-preset-action="add-country" data-country="${code}"><strong>${code}</strong><span>${presetEscape(name)}</span></button>`).join('') : '<div class="country-options-empty">Страны не найдены</div>';
}
function renderCountryDialog() {
  if (!countryDialog || !currentPresetApp) { countryDialogRoot.innerHTML = ''; return; }
  const country = presetState(currentPresetApp).selectedCountry;
  countryDialogRoot.innerHTML = `<div class="country-dialog-backdrop" data-preset-action="close-country-dialog"><div class="country-dialog" role="dialog" aria-modal="true" aria-labelledby="country-dialog-title"><div class="country-dialog-head"><h2 id="country-dialog-title">${countryDialog.kind === 'add' ? 'Добавить страну' : `Удалить ${presetEscape(countryName(country))} (${country})?`}</h2><button type="button" class="country-dialog-close" data-preset-action="close-country-dialog" aria-label="Закрыть">×</button></div>${countryDialog.kind === 'add' ? '<p>Новая страна получит копию юнитов, цен и коэффициентов Global.</p><input id="country-search" type="search" placeholder="Поиск по названию или коду" aria-label="Поиск страны" autocomplete="off"><div class="country-options" role="list"></div>' : `<p>Конфигурация и изменения для ${presetEscape(countryName(country))} будут удалены. Global останется доступен.</p><div class="country-dialog-actions"><button type="button" class="preset-outline-button" data-preset-action="close-country-dialog">Отмена</button><button type="button" class="country-confirm-delete" data-preset-action="confirm-delete-country">Удалить страну</button></div>`}</div></div>`;
  if (countryDialog.kind === 'add') { renderCountryOptions(); requestAnimationFrame(() => countryDialogRoot.querySelector('#country-search')?.focus()); }
  else requestAnimationFrame(() => countryDialogRoot.querySelector('.country-dialog-close')?.focus());
}

function renderPreset() {
  if (!currentPresetApp) return;
  const app = currentPresetApp;
  const definition = presetDefinition(app);
  const state = presetState(app);
  const included = new Set([definition.root, ...allNodes(app).map((node) => node.name)]);
  const allNames = new Set(PRESET_CATALOG.flatMap((item) => [item.root, ...flatNodes(item.nodes).map((node) => node.name)]));
  const notIncluded = [...allNames].filter((name) => !included.has(name)).sort((a, b) => a.localeCompare(b, 'en'));
  presetRoot.innerHTML = `<div class="preset-card"><div class="preset-card-head"><div><span class="preset-eyebrow">APP NET CONFIG</span><h2>Пресет и дерево сетей</h2><p>${state.nodes.length ? 'Пары «сеть–формат» расположены под своим медиатором. Нажмите сеть для фильтрации таблицы.' : 'Passthrough: переопределений сетей нет.'}</p></div><label class="preset-select-label">Пресет<select id="preset-select" aria-label="Пресет">${PRESET_CATALOG.map((item) => `<option value="${item.id}" ${item.id === app.presetId ? 'selected' : ''}>${presetEscape(item.title)}</option>`).join('')}</select></label></div>
    <div class="preset-legend"><span><i class="status-active"></i> Активно</span><span><i class="status-noSdk"></i> Нет SDK</span><span><i class="status-noAdUnit"></i> Нет AdUnit</span><span><i class="status-disabled"></i> Отключено</span></div>
    ${mediationDiagramMarkup(app, state, definition)}
    ${state.nodes.length ? `<div class="preset-not-included"><span>Not included:</span> ${notIncluded.length ? notIncluded.map(presetEscape).join(', ') : '—'}</div>` : ''}</div>`;
  configActions.innerHTML = configActionMarkup(app);
  renderCountryBar();
}

function refreshPresetTable(app) { window.configTable.updatePresetState(formatMap(app), statusMap(app), connectionReasons(app)); }
function changeNetwork(app, nodeKey) {
  const node = findPresetNode(app, nodeKey);
  if (!node) return;
  if (node.status === 'disabled') node.status = node.previousStatus || 'active';
  else { node.previousStatus = node.status; node.status = 'disabled'; }
  markWorkspaceDirty(app, true);
  presetState(app).validation = null;
  window.recordAppEdit?.(app);
  refreshPresetTable(app);
  renderPreset();
  document.dispatchEvent(new CustomEvent('preset-change'));
}

window.presetUI = {
  countrySelection(app) { const state = presetState(app); return { countries: [...state.countries], selected: state.selectedCountry }; },
  selectCountry(app, country) {
    const state = presetState(app);
    if (!state.countries.includes(country)) return false;
    if (country === state.selectedCountry) return true;
    const previous = state.selectedCountry;
    state.selectedCountry = country;
    presetWorkspace(app).selectedCountry = country;
    if (!window.configTable.setCountry(app.id, app.presetId, country)) { state.selectedCountry = previous; presetWorkspace(app).selectedCountry = previous; return false; }
    renderPreset();
    return true;
  },
  setApp(app) {
    if (currentPresetApp && activePresetId) rememberNetworkState(currentPresetApp, activePresetId);
    currentPresetApp = app;
    const state = presetState(app);
    const workspace = presetWorkspace(app);
    for (const node of flatNodes(state.nodes)) {
      const key = networkIdentity(node);
      if (workspace.networks[key]) Object.assign(node, workspace.networks[key]);
      const preferences = workspace.formatPreferences[key] || {};
      node.selectedFormats = node.supportedFormats.filter((format) => appSupportsFormat(app, format) && preferences[format] !== false);
    }
    window.configTable.setPreset(app.id, app.presetId, presetConfigs(app), formatMap(app), statusMap(app), state.selectedCountry, connectionReasons(app));
    activePresetId = app.presetId;
    state.selectedKey = null;
    countryDialog = null;
    renderCountryDialog();
    renderPreset();
  },
  getNetworkRows(app) { return allNodes(app); },
  connectionStatus,
  admobAccount(app, presetId) { return flatNodes(app.presetStates[presetId].nodes).find((node) => node.name === 'AdMob' && node.account)?.account || ''; },
  startConnectionSync(app, presetId, networks) {
    const state = app.presetStates[presetId];
    const workspace = presetWorkspace(app);
    const payload = jsonPayload(app);
    workspace.syncAttempt = { presetId, revision: workspace.revision, payload: structuredClone(payload), networks: [...networks] };
    for (const network of networks) state.connectionJobs.set(network, Object.fromEntries(flatNodes(state.nodes).filter((node) => node.tableName === network).map((node) => [networkIdentity(node), connectionSnapshot(node)])));
  },
  finishConnectionSync(app, presetId, network, success, entriesByCountry = {}) {
    const state = app.presetStates[presetId];
    const submitted = state.connectionJobs.get(network);
    if (!submitted) return;
    if (success) {
      const workspace = presetWorkspace(app);
      Object.assign(workspace.connectionBaseline, submitted);
      const byCountry = Array.isArray(entriesByCountry) ? { [workspace.selectedCountry]: entriesByCountry } : entriesByCountry;
      for (const [country, entries] of Object.entries(byCountry)) {
        const payloadCountry = workspace.syncAttempt?.payload.countries.find((item) => item.country === country);
        for (const entry of entries) {
          const sentNetwork = payloadCountry?.networks.find((item) => item.name === network && item.mode === entry.mode);
          const sentFormat = sentNetwork?.units.find((item) => item.format === entry.format && item.mode === entry.mode);
          const activeUnits = entry.prices.filter((item) => !item.paused);
          sentFormat?.units.forEach((unit, index) => { unit.unit_id = activeUnits[index]?.unitId || unit.unit_id; });
        }
      }
    }
    state.connectionJobs.delete(network);
    if (app === currentPresetApp && app.presetId === presetId) refreshPresetTable(app);
  },
  completeNetworkSync(app, presetId, successful) {
    const workspace = presetWorkspace(app);
    const attempt = workspace.syncAttempt;
    if (successful && attempt?.presetId === presetId) {
      workspace.lastSynced = { presetId, data: structuredClone(attempt.payload), at: new Date().toLocaleString('ru-RU') };
      if (workspace.revision === attempt.revision) workspace.pendingCountries.clear();
      workspace.dirty = workspace.pendingCountries.size > 0 || app.presetId !== presetId;
    }
    workspace.syncAttempt = null;
    if (app === currentPresetApp) renderPreset();
  },
  finishMediatorSync(app, presetId, network, entries) {
    const state = app.presetStates[presetId];
    for (const node of flatNodes(state.nodes).filter((item) => item.tableName === network)) {
      const mediators = [...new Set(entries.filter((entry) => entry.mode === node.mode && node.selectedFormats.includes(entry.format)).map((entry) => entry.mediator))];
      if (mediators.length) node.appliedMediator = mediators.length === 1 ? mediators[0] : 'Смешанная';
    }
    if (app === currentPresetApp && app.presetId === presetId) renderPreset();
  },
  networkMeta(node) {
    const name = node.name;
    const accounts = name === 'AppLovin' ? ['CAS MAX', 'Games MAX'] : name === 'IronSource' ? ['CAS LevelPlay', 'Games LevelPlay'] : name === 'Kidoz' ? ['CAS Kidoz'] : [`CAS ${name}`, `Games ${name}`];
    const param = name === 'Pangle' ? { label: 'Регион', options: ['EU', 'US', 'APAC'] } : name === 'Mintegral' ? { label: 'Тип трафика', options: ['In-app', 'Mixed'] } : null;
    return { accounts, param, accountLabel: node.account || 'Выберите аккаунт' };
  },
  toggleNetwork(app, key) { changeNetwork(app, key); },
  updateAccount(app, key, account) { const node = findPresetNode(app, key); if (node) { node.account = account; window.presetUI.markDirty(true); refreshPresetTable(app); renderPreset(); document.dispatchEvent(new CustomEvent('preset-change')); } },
  updateParameter(app, key, value) { const node = findPresetNode(app, key); if (node) { node.parameter = value; window.presetUI.markDirty(true); refreshPresetTable(app); renderPreset(); document.dispatchEvent(new CustomEvent('preset-change')); } },
  syncSelection(networkName) {
    if (!currentPresetApp) return;
    const state = presetState(currentPresetApp);
    state.selectedKey = allNodes(currentPresetApp).find((node) => node.tableName === networkName)?.key || null;
    renderPreset();
  },
  markDirty(allCountries = false) {
    if (!currentPresetApp) return;
    const state = presetState(currentPresetApp);
    const workspace = presetWorkspace(currentPresetApp);
    markWorkspaceDirty(currentPresetApp, allCountries);
    state.validation = null;
    window.recordAppEdit?.(currentPresetApp);
    const published = state.published ? `Опубликовано: ${state.published.target === 'test' ? 'тестовый' : 'рабочий'} контур (демо)` : 'Нет опубликованной версии';
    const label = configActions.querySelector('.config-action-head p');
    if (label) label.innerHTML = `${workspace.draft ? 'Черновик сохранён до перезагрузки' : 'Правки хранятся до перезагрузки'} · ${published} · Есть неотправленные изменения<br>${workspace.lastSynced ? `Последняя успешная синхронизация: ${presetEscape(PRESET_CATALOG.find((item) => item.id === workspace.lastSynced.presetId)?.title || workspace.lastSynced.presetId)} · все страны · ${presetEscape(workspace.lastSynced.at)}` : 'Успешных синхронизаций в этой сессии ещё нет'}`;
    configActions.querySelector('.preset-validation')?.remove();
    const preview = configActions.querySelector('.config-json');
    if (preview) preview.textContent = JSON.stringify(jsonPayload(currentPresetApp), null, 2);
  },
  render: renderPreset
};

document.addEventListener('click', (event) => {
  if (!currentPresetApp) return;
  const actionButton = event.target.closest('[data-preset-action]');
  if (!actionButton) {
    if (event.target.closest('[data-tree-canvas]')) {
      presetState(currentPresetApp).selectedKey = null;
      window.configTable.setNetworkFilter('all');
      renderPreset();
    }
    return;
  }
  const app = currentPresetApp;
  const state = presetState(app);
  const action = actionButton.dataset.presetAction;
  const key = actionButton.dataset.nodeKey;
  if (action === 'close-country-dialog') {
    if (actionButton.classList.contains('country-dialog-backdrop') && event.target.closest('.country-dialog')) return;
    countryDialog = null;
    renderCountryDialog();
  } else if (action === 'open-add-country') {
    countryDialog = { kind: 'add', query: '' };
    renderCountryDialog();
  } else if (action === 'add-country') {
    const country = actionButton.dataset.country;
    if (!availableCountries(app).some(([code]) => code === country)) return;
    if (!window.configTable.createCountry(app.id, app.presetId, country)) return;
    state.countries.push(country);
    state.selectedCountry = country;
    presetWorkspace(app).selectedCountry = country;
    window.configTable.setCountry(app.id, app.presetId, country);
    window.onCountryListChange?.(app, 'add', country);
    countryDialog = null;
    renderCountryDialog();
    renderPreset();
    window.presetUI.markDirty();
  } else if (action === 'select-country') {
    window.presetUI.selectCountry(app, actionButton.dataset.country);
  } else if (action === 'open-delete-country') {
    if (state.selectedCountry === 'GLOBAL') return;
    countryDialog = { kind: 'delete' };
    renderCountryDialog();
  } else if (action === 'confirm-delete-country') {
    const country = state.selectedCountry;
    if (country === 'GLOBAL') return;
    state.selectedCountry = 'GLOBAL';
    presetWorkspace(app).selectedCountry = 'GLOBAL';
    window.configTable.setCountry(app.id, app.presetId, 'GLOBAL');
    window.configTable.deleteCountry(app.id, app.presetId, country);
    presetWorkspace(app).countries = state.countries.filter((code) => code !== country);
    presetWorkspace(app).pendingCountries.delete(country);
    state.countries = presetWorkspace(app).countries;
    window.onCountryListChange?.(app, 'delete', country);
    countryDialog = null;
    renderCountryDialog();
    renderPreset();
    window.presetUI.markDirty();
  } else if (action === 'select-node') {
    state.selectedKey = key;
    window.configTable.setNetworkFilter(findPresetNode(app, key).tableName);
    renderPreset();
  } else if (action === 'toggle-node') {
    changeNetwork(app, key);
  } else if (action === 'connect-node') {
    const node = findPresetNode(app, key);
    if (!node || node.status === 'disabled') return;
    const launchedPresetId = app.presetId;
    node.task = 'connecting'; node.attempts += 1; renderPreset();
    setTimeout(() => {
      if (node.status === 'noAdUnit' && node.attempts === 1) node.task = 'error';
      else {
        node.task = 'connected';
        if (node.status === 'noAdUnit') node.status = 'active';
        window.configTable.ensureNetworkUnits(app.id, launchedPresetId, node.tableName, node.selectedFormats);
        markWorkspaceDirty(app, true);
        state.validation = null;
        window.recordAppEdit?.(app);
      }
      if (app === currentPresetApp && app.presetId === launchedPresetId) { refreshPresetTable(app); renderPreset(); document.dispatchEvent(new CustomEvent('preset-change')); }
    }, 700);
  } else if (action === 'save-draft') {
    presetWorkspace(app).draft = structuredClone(jsonPayload(app)); renderPreset();
  } else if (action === 'validate') {
    state.validation = validatePayload(jsonPayload(app), app); renderPreset();
  } else if (action === 'show-json') {
    state.showJson = !state.showJson; renderPreset();
  } else if (action === 'publish') {
    state.validation = validatePayload(jsonPayload(app), app);
    renderPreset();
    if (state.validation.length) return;
    const target = actionButton.dataset.target;
    presetDialogRoot.innerHTML = `<div class="preset-dialog-backdrop"><div class="preset-dialog" role="dialog" aria-modal="true" aria-labelledby="preset-dialog-title"><h2 id="preset-dialog-title">Публикация на ${target === 'test' ? 'тестовый' : 'рабочий'} контур</h2><p>Прототип сохранит отдельную демонстрационную версию до перезагрузки страницы. Данные никуда не отправляются.</p><div class="preset-dialog-actions"><button type="button" class="preset-outline-button" data-preset-action="cancel-publish">Отмена</button><button type="button" class="preset-primary-button" data-preset-action="confirm-publish" data-target="${target}">Подтвердить</button></div></div></div>`;
  } else if (action === 'cancel-publish') {
    presetDialogRoot.innerHTML = '';
  } else if (action === 'confirm-publish') {
    state.published = { target: actionButton.dataset.target, data: structuredClone(jsonPayload(app)) };
    window.recordAppEdit?.(app);
    presetDialogRoot.innerHTML = '';
    renderPreset();
  }
});

document.addEventListener('change', (event) => {
  if (!currentPresetApp) return;
  if (event.target.id === 'preset-select') {
    if (currentPresetApp.presetId === event.target.value) return;
    currentPresetApp.presetId = event.target.value;
    markWorkspaceDirty(currentPresetApp, true);
    window.recordAppEdit?.(currentPresetApp);
    window.presetUI.setApp(currentPresetApp);
    document.dispatchEvent(new CustomEvent('preset-change'));
  } else if (event.target.matches('[data-preset-format]')) {
    const app = currentPresetApp;
    const node = findPresetNode(app, event.target.dataset.nodeKey);
    const format = event.target.dataset.presetFormat;
    if (!node || !node.supportedFormats.includes(format) || !appSupportsFormat(app, format)) return;
    node.selectedFormats = event.target.checked ? [...new Set([...node.selectedFormats, format])] : node.selectedFormats.filter((item) => item !== format);
    markWorkspaceDirty(app, true);
    presetState(app).validation = null;
    window.recordAppEdit?.(app);
    refreshPresetTable(app);
    renderPreset();
    document.dispatchEvent(new CustomEvent('preset-change'));
  }
});

document.addEventListener('input', (event) => {
  if (event.target.id !== 'country-search' || countryDialog?.kind !== 'add') return;
  countryDialog.query = event.target.value;
  renderCountryOptions();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || !countryDialog) return;
  countryDialog = null;
  renderCountryDialog();
});
