const PRESET_FORMAT_CODES = { Banner: 'B', MREC: 'M', Interstitial: 'I', Rewarded: 'R', 'App Open': 'O', Native: 'N' };
const PRESET_STATUS_LABELS = { active: 'Активно', noSdk: 'Нет SDK', noAdUnit: 'Нет AdUnit', disabled: 'Отключено' };
const presetEscape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function presetNode(key, name, role, status, formats, supportedFormats, children = []) {
  return { key, name, tableName: name, role, status, selectedFormats: formats, supportedFormats, children,
    account: 'CAS Main', parameter: '', appKey: `appkey_${key.replace(/[^a-z0-9]/gi, '')}_demo`, task: 'idle', attempts: 0 };
}

const PRESET_CATALOG = [
  { id: 'cas-mediation', title: 'CAS Mediation · Preset', root: 'CAS', rootRole: 'Mediation', nodes: [
    presetNode('admob-cas', 'AdMob', 'Floor', 'active', ['Banner', 'Interstitial', 'Rewarded'], ['Banner', 'Interstitial', 'Rewarded', 'Native', 'App Open']),
    presetNode('chartboost', 'Chartboost', 'Floor', 'active', ['Banner', 'Interstitial'], ['Banner', 'Interstitial', 'Rewarded']),
    presetNode('ironsource-cas', 'IronSource', 'Mediation', 'active', ['Banner', 'Interstitial', 'Rewarded'], ['Banner', 'Interstitial', 'Rewarded'], [
      { ...presetNode('admob-ironsource', 'AdMob', 'x1.10Bid', 'active', ['Banner', 'Interstitial', 'Rewarded'], ['Banner', 'Interstitial', 'Rewarded']), tableName: 'AdMob · IronSource' },
      presetNode('unity-ironsource', 'Unity', 'IsBid', 'active', ['Banner', 'Interstitial'], ['Banner', 'Interstitial', 'Rewarded'])
    ]),
    presetNode('ysonetwork', 'YsoNetwork', 'CasBid', 'active', ['Banner', 'Interstitial'], ['Banner', 'Interstitial', 'Rewarded']),
    presetNode('applovin-cas', 'AppLovin', 'Floor', 'disabled', [], ['Banner', 'Interstitial', 'Rewarded', 'MREC']),
    presetNode('bigo', 'Bigo', '', 'disabled', [], ['Interstitial', 'Rewarded']),
    presetNode('casexchange', 'CASExchange', '', 'disabled', [], ['Banner', 'Interstitial']),
    presetNode('dtexchange', 'DTExchange', '', 'disabled', [], ['Banner', 'Interstitial']),
    presetNode('mintegral-cas', 'Mintegral', '', 'disabled', [], ['Banner', 'Interstitial', 'Rewarded', 'MREC']),
    presetNode('inmobi', 'InMobi', '', 'noAdUnit', ['Interstitial'], ['Banner', 'Interstitial', 'Rewarded']),
    presetNode('kidoz', 'Kidoz', 'Floor', 'noSdk', [], ['Banner', 'Interstitial']),
    presetNode('prado', 'Prado', 'Floor', 'noSdk', [], ['Banner', 'Interstitial']),
    presetNode('vungle', 'Vungle', 'CasBid', 'noSdk', ['Banner', 'Interstitial'], ['Banner', 'Interstitial', 'Rewarded'])
  ] },
  { id: 'max-cas4', title: 'MAX · CAS4', root: 'AppLovin', rootRole: 'Mediation', nodes: [
    presetNode('admob-max', 'AdMob', 'MaxBid', 'active', ['Banner', 'Interstitial', 'Rewarded'], ['Banner', 'Interstitial', 'Rewarded']),
    presetNode('chartboost-max', 'Chartboost', 'Floor', 'active', ['Banner', 'Interstitial'], ['Banner', 'Interstitial', 'Rewarded']),
    presetNode('unity-max', 'Unity', 'IsBid', 'active', ['Interstitial', 'Rewarded'], ['Banner', 'Interstitial', 'Rewarded']),
    presetNode('pangle-max', 'Pangle', 'Floor', 'active', ['Banner', 'Interstitial'], ['Banner', 'Interstitial', 'Rewarded']),
    presetNode('meta-max', 'Meta Audience Network', 'MaxBid', 'noSdk', ['Banner', 'Interstitial'], ['Banner', 'Interstitial', 'Rewarded', 'Native']),
    presetNode('mintegral-max', 'Mintegral', 'Floor', 'noAdUnit', ['Interstitial'], ['Banner', 'Interstitial', 'Rewarded']),
    presetNode('ironsource-max', 'IronSource', 'Floor', 'disabled', [], ['Banner', 'Interstitial', 'Rewarded'])
  ] },
  { id: 'levelplay-cas3', title: 'LevelPlay · CAS3', root: 'IronSource', rootRole: 'Mediation', nodes: [
    presetNode('admob-levelplay', 'AdMob', 'IsBid', 'active', ['Banner', 'Interstitial', 'Rewarded'], ['Banner', 'Interstitial', 'Rewarded']),
    presetNode('unity-levelplay', 'Unity', 'IsBid', 'active', ['Interstitial', 'Rewarded'], ['Banner', 'Interstitial', 'Rewarded']),
    presetNode('vungle-levelplay', 'Vungle', 'Floor', 'active', ['Banner', 'Interstitial'], ['Banner', 'Interstitial', 'Rewarded']),
    presetNode('ysonetwork-levelplay', 'YsoNetwork', 'CasBid', 'active', ['Banner', 'Interstitial'], ['Banner', 'Interstitial']),
    presetNode('pangle-levelplay', 'Pangle', 'Floor', 'disabled', [], ['Banner', 'Interstitial', 'Rewarded']),
    presetNode('bigo-levelplay', 'Bigo', '', 'noAdUnit', ['Interstitial'], ['Interstitial', 'Rewarded'])
  ] }
];

const presetRoot = document.querySelector('#preset-app');
const configActions = document.querySelector('#config-actions');
const presetDialogRoot = document.querySelector('#preset-dialog-root');
let currentPresetApp = null;

function presetDefinition(app) { return PRESET_CATALOG.find((item) => item.id === app.presetId) || PRESET_CATALOG[0]; }
function presetState(app) {
  app.presetId ||= PRESET_CATALOG[0].id;
  app.presetStates ||= {};
  if (!app.presetStates[app.presetId]) app.presetStates[app.presetId] = { nodes: structuredClone(presetDefinition(app).nodes), selectedKey: null, draft: null, published: null, showJson: false, validation: null, dirty: false };
  return app.presetStates[app.presetId];
}
function flatNodes(nodes) { return nodes.flatMap((node) => [node, ...flatNodes(node.children || [])]); }
function allNodes(app) { return flatNodes(presetState(app).nodes); }
function findPresetNode(app, key) { return allNodes(app).find((node) => node.key === key); }
function appSupportsFormat(app, format) { return app.placements.includes(({ MREC: 'Mrec', 'App Open': 'App_open' })[format] || format); }
function statusMap(app) { return Object.fromEntries(allNodes(app).map((node) => [node.tableName, node.status])); }
function formatMap(app) { return Object.fromEntries(allNodes(app).map((node) => [node.tableName, node.selectedFormats])); }
function isBidNode(node) { return /Bid/i.test(node.role); }

function presetConfigs(app) {
  const samples = { Banner: [0.30, 0.50, 0.80, 1.20, 1.80], Interstitial: [1.50, 2.20, 3.40, 4.60, 6.00], Rewarded: [3.00, 4.50, 6.00, 8.00, 10.00, 12.00], Native: [0.45, 0.70, 1.10], MREC: [0.55, 0.90, 1.30], 'App Open': [1.10, 1.60, 2.40] };
  return allNodes(app).flatMap((node, networkIndex) => node.supportedFormats.map((format, formatIndex) => {
    const mode = isBidNode(node) ? 'bidding' : 'waterfall';
    const values = node.status === 'active' && node.selectedFormats.includes(format) ? (node.role === 'x1.10Bid' ? [1.10] : mode === 'bidding' ? [] : samples[format].slice(0, 3 + networkIndex % 4)) : [];
    const stem = `${node.key}-${format.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    return { id: `${stem}-${mode}`, network: node.tableName, mode, format, mediator: node.key.includes('ironsource') && node.key !== 'ironsource-cas' ? 'IronSource' : presetDefinition(app).root,
      prices: values.map((price, index) => ({ id: `${stem}-${index}`, unitId: String(4546834782 + networkIndex * 10000 + formatIndex * 100 + index), price })) };
  }));
}

function nodeShortFormats(node) { return node.selectedFormats.map((format) => PRESET_FORMAT_CODES[format]).filter(Boolean).join(', '); }
function nodeMarkup(node, app, child = false) {
  const selected = presetState(app).selectedKey === node.key;
  const role = node.role ? `${presetEscape(node.role)}${nodeShortFormats(node) && node.status !== 'disabled' && node.status !== 'noAdUnit' ? `: ${nodeShortFormats(node)}` : ':'}` : '';
  const taskLabel = ({ connecting: 'Подключается', connected: 'Подключена', error: 'Ошибка подключения' })[node.task];
  const taskMark = ({ connecting: '↻', connected: '✓', error: '!' })[node.task];
  return `<button type="button" class="preset-node status-${node.status} ${selected ? 'is-selected' : ''} ${child ? 'is-child' : ''}" data-preset-action="select-node" data-node-key="${node.key}" aria-pressed="${selected}" title="${presetEscape(node.tableName)} · ${PRESET_STATUS_LABELS[node.status]}${taskLabel ? ` · ${taskLabel}` : ''}">${taskMark ? `<span class="preset-task-indicator task-${node.task}" aria-label="${taskLabel}">${taskMark}</span>` : ''}<span class="preset-node-name">${presetEscape(node.name)}</span><span class="preset-node-role">${role}</span><span class="preset-node-state">${PRESET_STATUS_LABELS[node.status]}</span></button>`;
}
function branchMarkup(node, app) {
  return `<div class="preset-branch">${nodeMarkup(node, app)}${node.children?.length ? `<div class="preset-children">${node.children.map((child) => nodeMarkup(child, app, true)).join('')}</div>` : ''}</div>`;
}

function jsonPayload(app) {
  const state = presetState(app);
  const configs = window.configTable.getSnapshot();
  return { appId: app.storeId, preset: app.presetId, mediation: presetDefinition(app).root, networks: allNodes(app).filter((node) => node.status !== 'disabled').map((node) => ({ name: node.tableName, role: node.role, status: node.status, account: node.account, appKey: node.appKey, formats: node.selectedFormats, units: configs.filter((entry) => entry.network === node.tableName && node.selectedFormats.includes(entry.format)).map((entry) => ({ format: entry.format, mode: entry.mode, mediator: entry.mediator, units: entry.prices.map((unit) => ({ unit_id: unit.unitId, multiplier: unit.price })) })) })) };
}
function validatePayload(payload) {
  const errors = [];
  for (const network of payload.networks.filter((item) => item.status === 'active')) {
    if (!network.account || !network.appKey) errors.push(`${network.name}: нет аккаунта или App Key`);
    if (!network.formats.length) errors.push(`${network.name}: не выбран формат`);
    for (const row of network.units) {
      if (row.mode === 'waterfall' && !row.units.length) errors.push(`${network.name} · ${row.format}: нет юнитов`);
      for (const [index, unit] of row.units.entries()) {
        if (!unit.unit_id) errors.push(`${network.name} · ${row.format} · №${index + 1}: нет Unit ID`);
        if (!(Number(unit.multiplier) > 0)) errors.push(`${network.name} · ${row.format} · №${index + 1}: нет мультипликатора`);
      }
    }
  }
  return errors;
}
function configActionMarkup(app) {
  const state = presetState(app);
  const published = state.published ? `Опубликовано: ${state.published.target === 'test' ? 'тестовый' : 'рабочий'} контур (демо)` : 'Нет опубликованной версии';
  return `<div class="config-action-card"><div class="config-action-head"><div><h2>Черновик конфигурации</h2><p>${state.draft ? 'Черновик сохранён до перезагрузки' : 'Черновик ещё не сохранён'} · ${published}${state.dirty ? ' · Есть изменения' : ''}</p></div><div class="config-action-buttons"><button type="button" class="preset-outline-button" data-preset-action="save-draft">Сохранить черновик</button><button type="button" class="preset-outline-button" data-preset-action="validate">Проверить JSON</button><button type="button" class="preset-outline-button" data-preset-action="show-json">${state.showJson ? 'Скрыть JSON' : 'Показать JSON'}</button><button type="button" class="preset-primary-button" data-preset-action="publish" data-target="test">Тестовый контур</button><button type="button" class="preset-primary-button" data-preset-action="publish" data-target="production">Рабочий контур</button></div></div>${state.validation ? `<div class="preset-validation ${state.validation.length ? 'has-errors' : ''}">${state.validation.length ? `<strong>Проверьте конфигурацию:</strong><ul>${state.validation.map((message) => `<li>${presetEscape(message)}</li>`).join('')}</ul>` : '<strong>Проверка пройдена. Обязательные поля заполнены.</strong>'}</div>` : ''}${state.showJson ? `<pre class="config-json">${presetEscape(JSON.stringify(jsonPayload(app), null, 2))}</pre>` : ''}</div>`;
}

function renderPreset() {
  if (!currentPresetApp) return;
  const app = currentPresetApp;
  const definition = presetDefinition(app);
  const state = presetState(app);
  const included = new Set([definition.root, ...allNodes(app).map((node) => node.name)]);
  const allNames = new Set(PRESET_CATALOG.flatMap((item) => [item.root, ...flatNodes(item.nodes).map((node) => node.name)]));
  const notIncluded = [...allNames].filter((name) => !included.has(name)).sort((a, b) => a.localeCompare(b, 'en'));
  presetRoot.innerHTML = `<div class="preset-card"><div class="preset-card-head"><div><span class="preset-eyebrow">APP NET CONFIG</span><h2>Пресет и дерево сетей</h2><p>Выберите сеть, чтобы увидеть её настройки в таблице ниже.</p></div><label class="preset-select-label">Пресет<select id="preset-select" aria-label="Пресет">${PRESET_CATALOG.map((item) => `<option value="${item.id}" ${item.id === app.presetId ? 'selected' : ''}>${presetEscape(item.title)}</option>`).join('')}</select></label></div>
    <div class="preset-legend"><span><i class="status-active"></i> Активно</span><span><i class="status-noSdk"></i> Нет SDK</span><span><i class="status-noAdUnit"></i> Нет AdUnit</span><span><i class="status-disabled"></i> Отключено</span></div>
    <div class="preset-tree-scroll" data-tree-canvas="true" aria-label="Дерево сетей"><div class="preset-tree-inner"><div class="preset-root"><strong>${presetEscape(definition.root)}</strong><span>${presetEscape(definition.rootRole)}:</span><em>Активно</em></div><div class="preset-branches">${state.nodes.map((node) => branchMarkup(node, app)).join('')}</div></div></div>
    <div class="preset-not-included"><span>Not included:</span> ${notIncluded.length ? notIncluded.map(presetEscape).join(', ') : '—'}</div></div>`;
  configActions.innerHTML = configActionMarkup(app);
}

function refreshPresetTable(app) { window.configTable.updatePresetState(formatMap(app), statusMap(app)); }
function changeNetwork(app, nodeKey) {
  const node = findPresetNode(app, nodeKey);
  if (!node) return;
  if (node.status === 'disabled') node.status = node.previousStatus || 'active';
  else { node.previousStatus = node.status; node.status = 'disabled'; }
  presetState(app).dirty = true;
  presetState(app).validation = null;
  refreshPresetTable(app);
  renderPreset();
  document.dispatchEvent(new CustomEvent('preset-change'));
}

window.presetUI = {
  setApp(app) {
    currentPresetApp = app;
    const state = presetState(app);
    window.configTable.setPreset(app.id, app.presetId, presetConfigs(app), formatMap(app), statusMap(app));
    state.selectedKey = null;
    renderPreset();
  },
  getNetworkRows(app) { return allNodes(app); },
  networkMeta(node) {
    const name = node.name;
    const accounts = name === 'AppLovin' ? ['CAS MAX', 'Games MAX'] : name === 'IronSource' ? ['CAS LevelPlay', 'Games LevelPlay'] : [`CAS ${name}`, `Games ${name}`];
    const param = name === 'Pangle' ? { label: 'Регион', options: ['EU', 'US', 'APAC'] } : name === 'Mintegral' ? { label: 'Тип трафика', options: ['In-app', 'Mixed'] } : null;
    return { accounts, param, accountLabel: node.account || accounts[0] };
  },
  toggleNetwork(app, key) { changeNetwork(app, key); },
  updateAccount(app, key, account) { const node = findPresetNode(app, key); if (node) { node.account = account; presetState(app).dirty = true; presetState(app).validation = null; renderPreset(); } },
  updateParameter(app, key, value) { const node = findPresetNode(app, key); if (node) { node.parameter = value; presetState(app).dirty = true; presetState(app).validation = null; renderPreset(); } },
  syncSelection(networkName) {
    if (!currentPresetApp) return;
    const state = presetState(currentPresetApp);
    state.selectedKey = allNodes(currentPresetApp).find((node) => node.tableName === networkName)?.key || null;
    renderPreset();
  },
  markDirty() {
    if (!currentPresetApp) return;
    const state = presetState(currentPresetApp);
    state.dirty = true;
    state.validation = null;
    const published = state.published ? `Опубликовано: ${state.published.target === 'test' ? 'тестовый' : 'рабочий'} контур (демо)` : 'Нет опубликованной версии';
    const label = configActions.querySelector('.config-action-head p');
    if (label) label.textContent = `${state.draft ? 'Черновик сохранён до перезагрузки' : 'Черновик ещё не сохранён'} · ${published} · Есть изменения`;
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
  if (action === 'select-node') {
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
        state.dirty = true;
        state.validation = null;
      }
      if (app === currentPresetApp && app.presetId === launchedPresetId) { refreshPresetTable(app); renderPreset(); document.dispatchEvent(new CustomEvent('preset-change')); }
    }, 700);
  } else if (action === 'save-draft') {
    state.draft = structuredClone(jsonPayload(app)); state.dirty = false; renderPreset();
  } else if (action === 'validate') {
    state.validation = validatePayload(jsonPayload(app)); renderPreset();
  } else if (action === 'show-json') {
    state.showJson = !state.showJson; renderPreset();
  } else if (action === 'publish') {
    state.validation = validatePayload(jsonPayload(app));
    renderPreset();
    if (state.validation.length) return;
    const target = actionButton.dataset.target;
    presetDialogRoot.innerHTML = `<div class="preset-dialog-backdrop"><div class="preset-dialog" role="dialog" aria-modal="true" aria-labelledby="preset-dialog-title"><h2 id="preset-dialog-title">Публикация на ${target === 'test' ? 'тестовый' : 'рабочий'} контур</h2><p>Прототип сохранит отдельную демонстрационную версию до перезагрузки страницы. Данные никуда не отправляются.</p><div class="preset-dialog-actions"><button type="button" class="preset-outline-button" data-preset-action="cancel-publish">Отмена</button><button type="button" class="preset-primary-button" data-preset-action="confirm-publish" data-target="${target}">Подтвердить</button></div></div></div>`;
  } else if (action === 'cancel-publish') {
    presetDialogRoot.innerHTML = '';
  } else if (action === 'confirm-publish') {
    state.published = { target: actionButton.dataset.target, data: structuredClone(jsonPayload(app)) };
    state.dirty = false;
    presetDialogRoot.innerHTML = '';
    renderPreset();
  }
});

document.addEventListener('change', (event) => {
  if (!currentPresetApp) return;
  if (event.target.id === 'preset-select') {
    currentPresetApp.presetId = event.target.value;
    window.presetUI.setApp(currentPresetApp);
    document.dispatchEvent(new CustomEvent('preset-change'));
  } else if (event.target.matches('[data-preset-format]')) {
    const app = currentPresetApp;
    const node = findPresetNode(app, event.target.dataset.nodeKey);
    const format = event.target.dataset.presetFormat;
    if (!node || !node.supportedFormats.includes(format) || !appSupportsFormat(app, format)) return;
    node.selectedFormats = event.target.checked ? [...new Set([...node.selectedFormats, format])] : node.selectedFormats.filter((item) => item !== format);
    presetState(app).dirty = true;
    presetState(app).validation = null;
    refreshPresetTable(app);
    renderPreset();
    document.dispatchEvent(new CustomEvent('preset-change'));
  }
});
