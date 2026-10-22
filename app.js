const PAGE_SIZE = 50;
const MANAGERS = ['Dmytro', 'Rashid', 'Anton', 'Buha', 'Serhii'];
const CLIENTS = [
  { name: 'Play Play', id: '883', contact: 'contact@playplay.example' },
  { name: 'Game World', id: '73', contact: 'team@gameworld.example' },
  { name: 'Pixel Games', id: '208', contact: 'hello@pixelgames.example' },
  { name: 'Game Games', id: '2', contact: 'contact@gamegames.example' },
  { name: 'Fun World', id: '691', contact: 'team@funworld.example' },
  { name: 'Nova Zone', id: '1155', contact: 'hello@novazone.example' },
  { name: 'Hyper Media', id: '467', contact: 'contact@hypermedia.example' },
  { name: 'App Labs', id: '1084', contact: 'team@applabs.example' },
  { name: 'Fun Forge', id: '822', contact: 'hello@funforge.example' },
  { name: 'Vibe Logic', id: '2831', contact: 'contact@vibelogic.example' },
  { name: 'Go Logic', id: '2316', contact: 'team@gologic.example' },
  { name: 'Mega Apps', id: '622', contact: 'hello@megaapps.example' }
];
const STORES = ['Android', 'iOS', 'Huawei', 'Amazon', 'RuStore', 'Samsung Galaxystore', 'Xiaomi'];
const PLACEMENTS = ['Interstitial', 'Rewarded', 'Banner', 'Banner_native', 'Native', 'App_open', 'Mrec', 'Mrec_native'];
const SEED_APPS = [
  ['Wild Wolf Family Simulator', '1186203029', 'iOS', 0, 0, '🐺', '#1577b8'],
  ['MG Puzzle: photo puzzles maker', '1515280069', 'iOS', 1, 0, '🧩', '#794dce'],
  ['Hover Skirt: stack & dress up', '1572616704', 'iOS', 2, 0, '👗', '#f36ca2'],
  ['Hello Kitty: Supermarket Game', '1589204819', 'iOS', 3, 1, '🛒', '#ec7383'],
  ['', '1658256212', 'iOS', 4, 2, '', '#e7e4e0'],
  ['Mad Racers: Buggy Kart Compete', '1659105546', 'iOS', 5, 3, '🏎️', '#e7a530'],
  ['', '6448585670', 'iOS', 6, 1, '', '#e7e4e0'],
  ['Bolts Puzzle: Nuts & Screw Pin', '6468445799', 'iOS', 7, 4, '🔩', '#3699d9'],
  ['Cartoon Arena', '6752237306', 'iOS', 8, 1, '⚔️', '#ed9246'],
  ['', '6753981582', 'iOS', 9, 2, '', '#e7e4e0'],
  ['Symphonic Piano', 'com.bigappstore.kundlibananasikhe', 'Android', 10, 2, '🎹', '#383f57'],
  ['Zombie Van: Tower Defense TD', 'com.eidoloncrop.idlevan', 'Android', 11, 2, '🧟', '#2b9660']
];
const icons = ['🎯', '🌴', '🚀', '🏰', '🎨', '⚽', '💎', '🦊', '🛸', '🧠', '🐱', '🎲'];
const colors = ['#6c72cb', '#e2825b', '#44a49b', '#805ec4', '#ce6592', '#6198bf', '#75a35f', '#e5a641'];
const uiEscape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const slug = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20);

function makeApp(seed, index) {
  const [name, storeId, platform, clientIndex, managerIndex, icon, color] = seed;
  const bundleId = platform === 'iOS' ? `com.cas.demo.${slug(name || 'app')}${index + 1}` : storeId;
  const otherStore = platform === 'iOS' ? 'Android' : 'iOS';
  const relatedBundle = platform === 'iOS' ? `com.demo.${slug(name || 'app')}${index + 1}` : `com.cas.demo.${slug(name || 'app')}${index + 1}.ios`;
  return {
    id: `app-${String(index + 1).padStart(2, '0')}`, name, storeId, bundleId, platform,
    client: CLIENTS[clientIndex], manager: MANAGERS[managerIndex], icon, color,
    added: new Date(Date.UTC(2024, 0, 1 + index * 5)).toISOString().slice(0, 10),
    updated: `2026-09-${String(Math.max(1, 18 - index)).padStart(2, '0')}`,
    maturity: index % 5 === 0 ? 'Teens' : 'Kids', orientation: index % 3 === 0 ? 'Landscape' : 'Portrait',
    placements: index % 4 === 0 ? ['Interstitial', 'Rewarded', 'Banner', 'Native', 'App_open', 'Mrec'] : ['Interstitial', 'Rewarded', 'Banner'],
    appVersion: `${2 + index % 4}.${index % 10}.${index % 3}`, casVersion: `4.${7 + index % 3}.${index % 2}`,
    admobAppId: `ca-app-pub-demo~${String(100000 + index)}`, admobAccount: index % 2 ? 'CAS Main' : 'Petition Apps', oneCId: String(12000 + index),
    inStore: index !== 7 && index % 13 !== 12,
    storeBundles: { [platform]: bundleId, ...(index % 3 === 0 || index === 5 ? { [otherStore]: relatedBundle } : {}), ...(index === 5 ? { Huawei: relatedBundle } : {}) },
    lastEditedBy: ['Анна Орлова', 'Максим Волков', 'Елена Миронова'][index % 3], lastEditedAt: '18.10.2026',
    lastNetworkSync: 'Сегодня, 09:42'
  };
}

const apps = SEED_APPS.map(makeApp);
const generatedNames = ['Sky Runner', 'Color Sort', 'Farm Quest', 'Puzzle House', 'Road Legends', 'Merge Garden', 'Tower Story', 'Idle Factory', 'Ocean Match', 'City Builder', 'Word Trails', 'Space Arena', 'Magic Blocks'];
for (let index = SEED_APPS.length; index < 64; index++) {
  const name = `${generatedNames[index % generatedNames.length]} ${Math.floor(index / generatedNames.length) + 1}`;
  const platform = index % 3 === 0 ? 'Android' : 'iOS';
  const storeId = platform === 'iOS' ? String(6700000000 + index) : `com.demo.${slug(name)}${index}`;
  const app = makeApp([name, storeId, platform, index % CLIENTS.length, index % MANAGERS.length, icons[index % icons.length], colors[index % colors.length]], index);
  app.updated = `2026-08-${String(1 + index % 27).padStart(2, '0')}`;
  apps.push(app);
}

const uiState = { query: '', manager: 'all', platform: 'all', sortKey: 'updated', sortDirection: 'desc', page: 1, activeAppId: null, activeTab: 'overview', waterfallFormat: 'all' };
const listView = document.querySelector('#list-view');
const detailView = document.querySelector('#detail-view');
const tableBody = document.querySelector('#apps-table-body');
const listCount = document.querySelector('#list-count');
const clientCount = document.querySelector('#client-count');
const listRange = document.querySelector('#list-range');
const pagination = document.querySelector('#pagination');
const clientModalRoot = document.querySelector('#client-modal-root');
const appById = (id) => apps.find((app) => app.id === id);
const displayName = (app) => app.name || app.storeId;
window.recordAppEdit = (app) => {
  app.lastEditedBy = 'Олег Демин';
  app.lastEditedAt = 'Только что · демо';
  if (uiState.activeAppId === app.id && uiState.activeTab === 'overview') renderOverview(app);
};
const initials = (name) => name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
function countLabel(count, forms) {
  const lastTwo = count % 100;
  const index = lastTwo >= 11 && lastTwo <= 14 ? 2 : count % 10 === 1 ? 0 : count % 10 >= 2 && count % 10 <= 4 ? 1 : 2;
  return `${count} ${forms[index]}`;
}

function appIcon(app, large = false) {
  return `<div class="app-icon ${large ? 'app-icon-large' : ''} ${app.icon ? '' : 'is-fallback'}" style="--icon-bg:${uiEscape(app.color)}" aria-hidden="true">${app.icon || (app.platform === 'iOS' ? 'iOS' : '◆')}</div>`;
}

function filteredApps() {
  const query = uiState.query.trim().toLocaleLowerCase();
  const filtered = apps.filter((app) => {
    const searchable = `${app.name} ${app.storeId} ${app.client.name} ${app.client.id}`.toLocaleLowerCase();
    return (!query || searchable.includes(query)) && (uiState.manager === 'all' || app.manager === uiState.manager) && (uiState.platform === 'all' || app.platform === uiState.platform);
  });
  const direction = uiState.sortDirection === 'asc' ? 1 : -1;
  const collator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' });
  filtered.sort((a, b) => {
    const valueA = uiState.sortKey === 'clientName' ? a.client.name : uiState.sortKey === 'name' ? displayName(a) : a[uiState.sortKey];
    const valueB = uiState.sortKey === 'clientName' ? b.client.name : uiState.sortKey === 'name' ? displayName(b) : b[uiState.sortKey];
    return direction * collator.compare(String(valueA), String(valueB)) || collator.compare(a.id, b.id);
  });
  return filtered;
}

function renderList() {
  const filtered = filteredApps();
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  uiState.page = Math.min(uiState.page, pages);
  const from = (uiState.page - 1) * PAGE_SIZE;
  const pageApps = filtered.slice(from, from + PAGE_SIZE);
  listCount.textContent = countLabel(filtered.length, ['приложение', 'приложения', 'приложений']);
  clientCount.textContent = countLabel(new Set(filtered.map((app) => app.client.id)).size, ['клиент', 'клиента', 'клиентов']);
  tableBody.innerHTML = pageApps.length ? pageApps.map((app) => `<tr class="app-data-row" tabindex="0" data-open-app="${app.id}" aria-label="Открыть ${uiEscape(displayName(app))}"><td><div class="app-cell">${appIcon(app)}<div class="app-cell-copy"><strong>${uiEscape(displayName(app))}</strong><small>${app.name ? uiEscape(app.storeId) : uiEscape(app.platform)}</small></div></div></td><td><span class="platform-symbol ${app.platform === 'iOS' ? 'platform-ios' : 'platform-android'}" aria-hidden="true">${app.platform === 'iOS' ? '●' : '◆'}</span> ${app.platform}</td><td><button type="button" class="client-link" data-client="${uiEscape(app.client.id)}">${uiEscape(app.client.name)}</button><span class="client-sub">#${uiEscape(app.client.id)}</span></td><td><span class="manager-cell"><span class="manager-avatar">${uiEscape(initials(app.manager))}</span>${uiEscape(app.manager)}</span></td><td class="muted-date">${uiEscape(app.added)}</td></tr>`).join('') : '<tr><td colspan="5" class="empty-apps">Приложения не найдены</td></tr>';
  listRange.textContent = filtered.length ? `${from + 1}–${from + pageApps.length} из ${filtered.length}` : '0 из 0';
  pagination.innerHTML = `<button type="button" data-page="${uiState.page - 1}" ${uiState.page === 1 ? 'disabled' : ''} aria-label="Предыдущая страница">‹</button>${Array.from({ length: pages }, (_, index) => `<button type="button" data-page="${index + 1}" class="${uiState.page === index + 1 ? 'is-current' : ''}" ${uiState.page === index + 1 ? 'aria-current="page"' : ''}>${index + 1}</button>`).join('')}<button type="button" data-page="${uiState.page + 1}" ${uiState.page === pages ? 'disabled' : ''} aria-label="Следующая страница">›</button>`;
  document.querySelectorAll('[data-sort]').forEach((button) => {
    const active = button.dataset.sort === uiState.sortKey;
    button.classList.toggle('is-sorted', active);
    button.querySelector('.sort-mark').textContent = active ? (uiState.sortDirection === 'asc' ? '↑' : '↓') : '↕';
  });
}

function renderOverview(app) {
  const storeUrl = app.platform === 'iOS' ? `https://apps.apple.com/app/id${encodeURIComponent(app.storeId)}` : `https://play.google.com/store/apps/details?id=${encodeURIComponent(app.storeId)}`;
  const stores = STORES.map((store) => {
    const bundle = app.storeBundles[store];
    if (store === app.platform) return app.inStore ? `<a class="store-chip is-current" href="${storeUrl}" target="_blank" rel="noopener noreferrer" title="Открыть приложение в ${store}">${store} ↗</a>` : `<span class="store-chip is-unavailable" title="Приложение не в сторе">${store} · Не в Store</span>`;
    return bundle ? `<button type="button" class="store-chip has-bundle" data-copy="${uiEscape(bundle)}" title="Bundle: ${uiEscape(bundle)} · нажмите, чтобы скопировать">${store} ⧉</button>` : `<span class="store-chip">${store}</span>`;
  }).join('');
  document.querySelector('#overview-panel').innerHTML = `<div class="info-card"><div class="card-heading"><h2>Основная информация</h2><p>Данные приложения из 1С</p></div><div class="info-grid">
    <div class="info-field"><span class="info-label">App name</span><div class="info-value">${uiEscape(displayName(app))}</div></div>
    <div class="info-field"><span class="info-label">${app.platform === 'iOS' ? 'Store ID' : 'Bundle ID'}</span><div class="info-value monospace">${uiEscape(app.storeId)}</div></div>
    <div class="info-field"><span class="info-label">Maturity</span><select data-app-field="maturity" aria-label="Maturity">${['Kids', 'Teens', 'Mature', 'Adult'].map((option) => `<option ${app.maturity === option ? 'selected' : ''}>${option}</option>`).join('')}</select></div>
    <div class="info-field wide"><span class="info-label">Store</span><div class="store-list">${stores}</div></div>
    <div class="info-field wide"><span class="info-label">Placements</span><div class="placement-list">${PLACEMENTS.map((placement) => `<span class="placement-chip ${app.placements.includes(placement) ? 'is-active' : ''}">${placement}</span>`).join('')}</div></div>
    <div class="info-field"><span class="info-label">Orientation</span><div class="info-value">${uiEscape(app.orientation)}</div></div>
    <div class="info-field"><span class="info-label">Client name</span><button type="button" class="copy-inline" data-client="${uiEscape(app.client.id)}">${uiEscape(app.client.name)} ↗</button></div>
    <div class="info-field"><span class="info-label">Client contact</span><button type="button" class="copy-inline" data-copy="${uiEscape(app.client.contact)}">${uiEscape(app.client.contact)} ⧉</button></div>
    <div class="info-divider"></div>
    <div class="info-field"><span class="info-label">AdMob Account</span><button type="button" class="admob-account" data-copy="${uiEscape(app.bundleId)}" title="Bundle: ${uiEscape(app.bundleId)} · нажмите, чтобы скопировать">${uiEscape(app.admobAccount)} ⧉</button></div>
    <div class="info-field"><span class="info-label">1С ID</span><div class="info-value monospace">${uiEscape(app.oneCId)}</div></div>
    <div class="info-field"><span class="info-label">Менеджер приложения</span><div class="info-value">${uiEscape(app.manager)}</div></div>
    <div class="info-field"><span class="info-label">CAS version</span><div class="info-value">${uiEscape(app.casVersion)}</div></div>
    <div class="info-field"><span class="info-label">App version</span><div class="info-value">${uiEscape(app.appVersion)}</div></div>
    <div class="info-field last-edited"><span class="info-label">Последние изменения</span><div class="info-value">${uiEscape(app.lastEditedBy)}</div><small>${uiEscape(app.lastEditedAt)}</small></div>
  </div></div>`;
}

function renderNetworks(app) {
  const nodes = window.presetUI.getNetworkRows(app);
  document.querySelector('#networks-panel').innerHTML = `<div class="networks-card"><div class="card-heading"><h2>Состав сетей</h2><p>Сети выбранного пресета · аккаунты и App Key показаны на демо-данных</p></div><div class="networks-scroll"><table class="networks-table"><thead><tr><th>Сеть</th><th>Подключена</th><th>Аккаунт</th><th>Параметры</th><th>App Key</th><th>Placements</th><th>Статус</th></tr></thead><tbody>${nodes.map((node) => {
    const meta = window.presetUI.networkMeta(node);
    const enabled = node.status !== 'disabled';
    const intersection = node.selectedFormats.filter((format) => appSupportsFormat(app, format));
    const accounts = [...new Set(meta.accounts)];
    const sync = window.presetUI.connectionStatus(app, node);
    return `<tr class="${enabled ? '' : 'is-disabled'}"><td class="network-name-cell"><strong>${uiEscape(node.tableName)}</strong><small>${node.mode ? `<span class="network-mode">${node.mode === 'bidding' ? 'Bidding' : 'Waterfall'}</span>` : ''}<span class="status-pill status-${node.status}">${PRESET_STATUS_LABELS[node.status]}</span></small></td><td><button type="button" class="toggle-switch" role="switch" aria-checked="${enabled}" aria-label="${enabled ? 'Отключить' : 'Включить'} ${uiEscape(node.tableName)}" data-toggle-network="${node.key}"></button></td><td><select class="account-select ${node.account ? '' : 'is-placeholder'}" data-account-network="${node.key}" aria-label="Аккаунт ${uiEscape(node.tableName)}" ${enabled ? '' : 'disabled'}><option value="" ${node.account ? '' : 'selected'} disabled>Выберите аккаунт</option>${accounts.map((account) => `<option value="${uiEscape(account)}" ${node.account === account ? 'selected' : ''}>${uiEscape(account)}</option>`).join('')}</select></td><td>${meta.param ? `<select class="special-select" data-param-network="${node.key}" aria-label="${meta.param.label} ${uiEscape(node.tableName)}" ${enabled ? '' : 'disabled'}><option value="" ${node.parameter ? '' : 'selected'} disabled>Выберите параметр</option>${meta.param.options.map((option) => `<option ${node.parameter === option ? 'selected' : ''}>${uiEscape(option)}</option>`).join('')}</select>` : '<span class="param-muted">—</span>'}</td><td><span class="network-key">${uiEscape(node.appKey)}</span></td><td><div class="network-placement-list">${intersection.length ? intersection.map((format) => `<span>${uiEscape(format)}</span>`).join('') : '<span>Нет выбранных форматов</span>'}</div></td><td><span class="connection-status connection-${sync.kind}"><i aria-hidden="true"></i>${sync.label}</span></td></tr>`;
  }).join('')}</tbody></table></div><div class="networks-footer">Последняя синхронизация: ${uiEscape(app.lastNetworkSync)} · Форматы сети пересечены с форматами приложения</div></div>`;
}

const TECHNICAL_PLACEMENT_NAMES = { Banner_native: 'Banner Native', Mrec: 'MREC', Mrec_native: 'MREC Native', App_open: 'App Open' };
const TECHNICAL_FORMAT_ORDER = ['Banner', 'Banner Native', 'Interstitial', 'Rewarded', 'MREC', 'MREC Native', 'App Open', 'Native'];
function technicalStore(app) {
  if (!app.technicalBasePrices) {
    let saved = null;
    try { saved = JSON.parse(window.localStorage?.getItem(`cas-prototype-technical:${app.id}`) || 'null'); } catch { /* Browser storage may be unavailable for a local file. */ }
    app.technicalBasePrices = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  }
  return app.technicalBasePrices;
}
function saveTechnicalStore(app) {
  try { window.localStorage?.setItem(`cas-prototype-technical:${app.id}`, JSON.stringify(technicalStore(app))); } catch { /* Keep the current session usable without storage. */ }
}
function technicalFormats(app) {
  const configured = window.configTable.getWaterfallData().formats;
  const formats = configured.length ? configured : app.placements.map((format) => TECHNICAL_PLACEMENT_NAMES[format] || format);
  return [...new Set(formats)].sort((a, b) => TECHNICAL_FORMAT_ORDER.indexOf(a) - TECHNICAL_FORMAT_ORDER.indexOf(b));
}
function basePricesFor(app, country, formats = technicalFormats(app)) {
  const saved = technicalStore(app)[country] || {};
  return Object.fromEntries(formats.map((format) => {
    const price = Number(saved[format]);
    return [format, Number.isFinite(price) && price > 0 ? price : 1];
  }));
}
function renderTechnical(app) {
  const { countries, selected } = window.presetUI.countrySelection(app);
  const formats = technicalFormats(app);
  const pricesByCountry = Object.fromEntries(countries.map((country) => [country, basePricesFor(app, country, formats)]));
  const rows = countries.flatMap((country) => formats.map((format) => {
    const price = pricesByCountry[country][format];
    return `<tr class="${country === selected ? 'is-selected-country' : ''}"><td>${country === 'GLOBAL' ? 'Global' : uiEscape(country)}</td><td>${uiEscape(format)}</td><td><label class="technical-price-field"><span>$</span><input type="number" min="0.01" step="0.01" inputmode="decimal" value="${price.toFixed(2)}" data-technical-price data-country="${uiEscape(country)}" data-format="${uiEscape(format)}" aria-label="Базовая цена ${uiEscape(country)} · ${uiEscape(format)}"></label></td></tr>`;
  })).join('');
  document.querySelector('#technical-panel').innerHTML = `<div class="technical-card"><div class="card-heading"><h2>Техническое</h2><p>Справочные данные для расчёта водопада</p></div><section class="technical-note"><h3>Базовая цена для AdMob из 1С</h3><p>Для коэффициентов x итоговая цена равна базовой цене страны и формата, умноженной на x. Начальное значение — $1.00.</p><div class="technical-scroll"><table class="technical-table"><thead><tr><th>Страна</th><th>Формат</th><th>Цена</th></tr></thead><tbody>${rows || '<tr><td colspan="3">Форматы приложения пока не указаны</td></tr>'}</tbody></table></div></section></div>`;
}

function waterfallRowsMarkup(rows, mode) {
  if (!rows.length) return `<div class="waterfall-empty">${mode === 'bidding' ? 'Флоров пока нет' : 'Юнитов пока нет'}</div>`;
  let step = 0;
  return `<div class="waterfall-steps">${rows.map((row) => {
    const active = !row.paused && !row.networkDisabled && Number(row.price) > 0;
    const number = active ? `№${++step}` : '—';
    const status = row.paused ? 'Не выгружать' : row.networkDisabled ? 'Сеть выключена' : row.pending ? row.newlyAdded ? 'Новый · не отправлен' : 'Изменён · не отправлен' : '';
    const basePrice = Number(row.basePrice) > 0 ? Number(row.basePrice) : 1;
    const effectivePrice = row.effectivePrice ?? Number(row.price) * (row.priceKind === 'multiplier' ? basePrice : 1);
    const price = Number(row.price) > 0 ? `$${Number(effectivePrice).toFixed(2)}` : '—';
    const calculation = row.priceKind === 'multiplier' && Number(row.price) > 0 ? `<small>$${basePrice.toFixed(2)} × x${Number(row.price).toFixed(2)}</small>` : '';
    return `<div class="waterfall-step ${row.paused || row.networkDisabled ? 'is-paused' : row.pending ? 'is-pending' : ''}"><span class="waterfall-step-number">${number}</span><div class="waterfall-step-source"><strong>${uiEscape(row.network)}</strong><small>${row.unitId ? `unit_id ${uiEscape(row.unitId)}` : 'unit_id появится после синхронизации'}</small></div><div class="waterfall-step-price"><strong>${price}</strong>${calculation}</div><span class="waterfall-step-status">${status ? uiEscape(status) : 'В конфигурации'}</span></div>`;
  }).join('')}</div>`;
}

function renderWaterfall(app) {
  const panel = document.querySelector('#waterfall-panel');
  const { countries, selected: country } = window.presetUI.countrySelection?.(app) || { countries: ['GLOBAL'], selected: 'GLOBAL' };
  const { formats, rows } = window.configTable.getWaterfallData(basePricesFor(app, country));
  if (!formats.includes(uiState.waterfallFormat)) uiState.waterfallFormat = 'all';
  const selectedFormats = uiState.waterfallFormat === 'all' ? formats : [uiState.waterfallFormat];
  const globe = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-3 3-4 6-4 9s1 6 4 9m0-18c3 3 4 6 4 9s-1 6-4 9"/></svg>';
  const countryTabs = countries.map((code) => `<button type="button" class="country-tab ${country === code ? 'is-active' : ''}" data-waterfall-country="${uiEscape(code)}" aria-pressed="${country === code}" title="${code === 'GLOBAL' ? 'Глобальная конфигурация' : uiEscape(code)}">${code === 'GLOBAL' ? globe : ''}<span>${code === 'GLOBAL' ? 'Global' : uiEscape(code)}</span></button>`).join('');
  const sections = selectedFormats.map((format) => {
    const formatRows = rows.filter((row) => row.format === format);
    const waterfall = formatRows.filter((row) => row.mode === 'waterfall');
    const bidding = formatRows.filter((row) => row.mode === 'bidding');
    return `<section class="waterfall-format"><div class="waterfall-mode-head"><strong>${uiEscape(format)} · Waterfall</strong><span>По итоговой цене</span></div>${waterfallRowsMarkup(waterfall, 'waterfall')}${bidding.length ? `<div class="waterfall-mode-head bidding"><strong>${uiEscape(format)} · Bidding floors</strong><span>По итоговой цене</span></div>${waterfallRowsMarkup(bidding, 'bidding')}` : ''}</section>`;
  }).join('');
  panel.innerHTML = `<div class="waterfall-card"><div class="waterfall-toolbar"><div><h2>Водопад</h2><p>Шаги по итоговой цене в $; при равенстве — сеть по алфавиту</p></div><div class="country-tabs waterfall-country-tabs" role="group" aria-label="Страна водопада">${countryTabs}</div><label class="waterfall-filter">Формат<select id="waterfall-format" aria-label="Формат водопада"><option value="all" ${uiState.waterfallFormat === 'all' ? 'selected' : ''}>Все форматы</option>${formats.map((format) => `<option value="${uiEscape(format)}" ${uiState.waterfallFormat === format ? 'selected' : ''}>${uiEscape(format)}</option>`).join('')}</select></label></div><div class="waterfall-legend"><span><i class="legend-pending"></i>Ждёт отправки</span><span><i class="legend-paused"></i>Не выгружать — скрыт для 1С и JSON</span></div>${sections || '<div class="waterfall-empty">Нет записей для выбранного пресета</div>'}</div>`;
}

function renderDetail(app, tab) {
  document.querySelector('#detail-crumb').textContent = displayName(app);
  document.querySelector('#detail-icon').outerHTML = appIcon(app, true).replace('class="app-icon', 'id="detail-icon" class="app-icon');
  document.querySelector('#detail-name').textContent = displayName(app);
  document.querySelector('#detail-store-alert').hidden = app.inStore;
  document.querySelector('#detail-platform').textContent = app.platform;
  document.querySelector('#detail-client').textContent = app.client.name;
  document.querySelector('#detail-manager').textContent = app.manager;
  document.querySelector('#detail-identifiers').innerHTML = `${app.platform === 'iOS' ? `<button type="button" class="store-id-button" data-copy="${uiEscape(app.storeId)}" title="Скопировать числовой ID">${uiEscape(app.storeId)} ⧉</button>` : ''}<button type="button" class="store-id-button" data-copy="${uiEscape(app.bundleId)}" title="Скопировать bundle_id">${uiEscape(app.bundleId)} ⧉</button>`;
  if (uiState.activeAppId !== app.id) {
    uiState.activeAppId = app.id;
    uiState.waterfallFormat = 'all';
    window.presetUI.setApp(app);
  }
  uiState.activeTab = tab;
  if (tab === 'config') window.presetUI.render?.();
  renderOverview(app);
  renderNetworks(app);
  renderWaterfall(app);
  renderTechnical(app);
  document.querySelectorAll('[data-detail-tab]').forEach((button) => {
    const active = button.dataset.detailTab === tab;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
  document.querySelector('#overview-panel').hidden = tab !== 'overview';
  document.querySelector('#networks-panel').hidden = tab !== 'networks';
  document.querySelector('#config-panel').hidden = tab !== 'config';
  document.querySelector('#waterfall-panel').hidden = tab !== 'waterfall';
  document.querySelector('#technical-panel').hidden = tab !== 'technical';
}

function renderRoute() {
  const [, kind, appId, tabName] = location.hash.match(/^#(app)\/([^/]+)(?:\/([^/]+))?$/) || [];
  const app = kind === 'app' ? appById(appId) : null;
  if (!app) {
    listView.hidden = false;
    detailView.hidden = true;
    renderList();
    return;
  }
  listView.hidden = true;
  detailView.hidden = false;
  renderDetail(app, ['overview', 'networks', 'config', 'waterfall', 'technical'].includes(tabName) ? tabName : 'overview');
}

function showUiToast(message) {
  const root = document.querySelector('#toast-root');
  root.innerHTML = `<div class="toast">${uiEscape(message)}</div>`;
  clearTimeout(showUiToast.timer);
  showUiToast.timer = setTimeout(() => { root.innerHTML = ''; }, 2700);
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const field = document.createElement('textarea');
    field.value = value;
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.append(field);
    field.select();
    document.execCommand('copy');
    field.remove();
  }
  showUiToast('Скопировано');
}

function openClient(id) {
  const client = CLIENTS.find((item) => item.id === id);
  if (!client) return;
  clientModalRoot.innerHTML = `<div class="client-card-overlay" data-close-client><div class="client-card" role="dialog" aria-modal="true" aria-labelledby="client-dialog-title"><div class="client-card-head"><h2 id="client-dialog-title">${uiEscape(client.name)}</h2><button type="button" class="client-card-close" data-close-client aria-label="Закрыть">×</button></div><p>Карточка клиента — отдельный сценарий, состав полей пока не определён.</p><div class="client-id">ID клиента: #${uiEscape(client.id)}</div></div></div>`;
}

document.querySelector('#manager-filter').innerHTML += MANAGERS.map((manager) => `<option value="${manager}">${manager}</option>`).join('');
document.querySelector('#app-search').addEventListener('input', (event) => { uiState.query = event.target.value; uiState.page = 1; renderList(); });
document.querySelector('#manager-filter').addEventListener('change', (event) => { uiState.manager = event.target.value; uiState.page = 1; renderList(); });
document.querySelector('#platform-filter').addEventListener('change', (event) => { uiState.platform = event.target.value; uiState.page = 1; renderList(); });

document.addEventListener('click', (event) => {
  const sortButton = event.target.closest('[data-sort]');
  if (sortButton) {
    const key = sortButton.dataset.sort;
    uiState.sortDirection = uiState.sortKey === key && uiState.sortDirection === 'asc' ? 'desc' : 'asc';
    uiState.sortKey = key;
    uiState.page = 1;
    renderList();
    return;
  }
  const pageButton = event.target.closest('[data-page]');
  if (pageButton) { uiState.page = Number(pageButton.dataset.page); renderList(); return; }
  const clientButton = event.target.closest('[data-client]');
  if (clientButton) { event.stopPropagation(); openClient(clientButton.dataset.client); return; }
  const appRow = event.target.closest('[data-open-app]');
  if (appRow) { location.hash = `#app/${appRow.dataset.openApp}/overview`; return; }
  const tabButton = event.target.closest('[data-detail-tab]');
  if (tabButton) { location.hash = `#app/${uiState.activeAppId}/${tabButton.dataset.detailTab}`; return; }
  const waterfallCountry = event.target.closest('[data-waterfall-country]');
  if (waterfallCountry) {
    const app = appById(uiState.activeAppId);
    if (app && window.presetUI.selectCountry(app, waterfallCountry.dataset.waterfallCountry)) renderWaterfall(app);
    return;
  }
  const toggle = event.target.closest('[data-toggle-network]');
  if (toggle) {
    const app = appById(uiState.activeAppId);
    window.presetUI.toggleNetwork(app, toggle.dataset.toggleNetwork);
    renderNetworks(app);
    showUiToast('Состояние сети обновлено (демо)');
    return;
  }
  const copy = event.target.closest('[data-copy]');
  if (copy) { copyText(copy.dataset.copy); return; }
  if (event.target.closest('#back-to-list')) { location.hash = '#apps'; return; }
  const closeClient = event.target.closest('[data-close-client]');
  if (closeClient && (event.target === closeClient || event.target.closest('.client-card-close'))) { clientModalRoot.innerHTML = ''; return; }
  const syncButton = event.target.closest('#sync-1c,#sync-networks');
  if (syncButton) {
    const app = appById(uiState.activeAppId);
    const isNetworkSync = syncButton.id === 'sync-networks';
    if (isNetworkSync) {
      const lastSynced = app.configWorkspace?.lastSynced;
      const countries = window.presetUI.countrySelection(app).countries;
      const sentCountries = lastSynced?.data.countries.map((item) => item.country) || [];
      const forceAll = !lastSynced || lastSynced.presetId !== app.presetId || countries.length !== sentCountries.length || countries.some((country) => !sentCountries.includes(country));
      const run = window.configTable.startSyncAllCountries(app.id, app.presetId, countries, forceAll);
      if (!run.networks.length) {
        if (forceAll) {
          window.presetUI.startConnectionSync(app, app.presetId, []);
          window.presetUI.completeNetworkSync(app, app.presetId, true);
          showUiToast('Конфигурация синхронизирована (демо)');
        } else showUiToast('Нет сетей, требующих обновления');
        return;
      }
      const presetId = app.presetId;
      window.presetUI.startConnectionSync(app, presetId, run.networks);
      renderNetworks(app);
      window.recordAppEdit(app);
      syncButton.disabled = true;
      syncButton.textContent = 'Сети в работе…';
      let remaining = run.networks.length;
      let failed = 0;
      run.networks.forEach((network, index) => {
        setTimeout(() => {
          const result = window.configTable.finishSyncAllCountries(run, network);
          if (!result.success) failed++;
          window.presetUI.finishConnectionSync(app, presetId, network, result.success, result.entriesByCountry);
          if (result.success && result.mediatorChanged) window.presetUI.finishMediatorSync(app, presetId, network, result.entriesByCountry.GLOBAL || Object.values(result.entriesByCountry)[0] || []);
          if (result.success && network === 'AdMob') {
            app.admobAccount = window.presetUI.admobAccount(app, presetId) || app.admobAccount;
            if (uiState.activeAppId === app.id) renderOverview(app);
          }
          if (uiState.activeAppId === app.id && app.presetId === presetId) renderNetworks(app);
          if (--remaining === 0) {
            window.presetUI.completeNetworkSync(app, presetId, failed === 0);
            syncButton.disabled = false;
            syncButton.innerHTML = '↻ &nbsp;Sync Networks';
            if (failed < run.networks.length) app.lastNetworkSync = 'Только что';
            if (uiState.activeAppId === app.id && app.presetId === presetId) renderNetworks(app);
            showUiToast(failed ? `Обновлено ${run.networks.length - failed} из ${run.networks.length} сетей; ошибок: ${failed} (демо)` : `Обновлено ${run.networks.length} сетей (демо)`);
          }
        }, Math.min(9500, 5200 + index * 850));
      });
      return;
    }
    const original = syncButton.innerHTML;
    syncButton.disabled = true;
    syncButton.textContent = 'Синхронизация…';
    setTimeout(() => {
      syncButton.disabled = false;
      syncButton.innerHTML = original;
      showUiToast('Данные 1С обновлены (демо)');
    }, 600);
  }
});

document.addEventListener('change', (event) => {
  const app = appById(uiState.activeAppId);
  if (!app) return;
  if (event.target.id === 'waterfall-format') {
    uiState.waterfallFormat = event.target.value;
    renderWaterfall(app);
  } else if (event.target.matches('[data-technical-price]')) {
    const { country, format } = event.target.dataset;
    if (!window.presetUI.countrySelection(app).countries.includes(country) || !technicalFormats(app).includes(format)) return;
    const price = Number(event.target.value);
    if (!Number.isFinite(price) || price <= 0) { renderTechnical(app); showUiToast('Укажите цену больше нуля'); return; }
    technicalStore(app)[country] ||= {};
    technicalStore(app)[country][format] = price;
    saveTechnicalStore(app);
    window.recordAppEdit(app);
    renderTechnical(app);
    renderWaterfall(app);
  } else if (event.target.matches('[data-app-field]')) {
    app[event.target.dataset.appField] = event.target.value;
    window.recordAppEdit(app);
    showUiToast('Параметр обновлён (демо)');
  } else if (event.target.matches('[data-account-network]')) {
    window.presetUI.updateAccount(app, event.target.dataset.accountNetwork, event.target.value);
    showUiToast('Аккаунт обновлён (демо)');
  } else if (event.target.matches('[data-param-network]')) {
    window.presetUI.updateParameter(app, event.target.dataset.paramNetwork, event.target.value);
    showUiToast('Параметр сети обновлён (демо)');
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && clientModalRoot.innerHTML) { clientModalRoot.innerHTML = ''; return; }
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-open-app]')) {
    event.preventDefault();
    location.hash = `#app/${event.target.dataset.openApp}/overview`;
  }
});

window.addEventListener('hashchange', () => { renderRoute(); window.scrollTo(0, 0); });
document.addEventListener('preset-change', () => { const app = appById(uiState.activeAppId); if (app) { renderNetworks(app); renderTechnical(app); if (uiState.activeTab === 'waterfall') renderWaterfall(app); } });
window.onCountryListChange = (app, action, country) => {
  if (action === 'delete') delete technicalStore(app)[country];
  if (action === 'add') technicalStore(app)[country] ||= {};
  saveTechnicalStore(app);
  if (uiState.activeAppId === app.id) { renderTechnical(app); if (uiState.activeTab === 'waterfall') renderWaterfall(app); }
};
window.onConfigurationChange = () => { const app = appById(uiState.activeAppId); if (app) window.presetUI.render?.(); if (app && uiState.activeTab === 'waterfall') renderWaterfall(app); if (app && uiState.activeTab === 'technical') renderTechnical(app); };
if (!location.hash) history.replaceState(null, '', `${location.pathname}${location.search}#apps`);
renderRoute();
