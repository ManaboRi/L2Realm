'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { isOpeningStillSoon } from '@/lib/opening';
import { ImageUpload } from '@/components/ImageUpload';
import { InstancesEditor } from '@/components/InstancesEditor';
import type { VipStatus, OpeningClickReport } from '@/lib/types';
import { CHRONICLES, SERVER_TYPES } from '@/lib/types';
import styles from './page.module.css';

type AdminTab = 'servers' | 'money' | 'banners' | 'clicks' | 'add';

function slugify(s: string) {
  return s.toLowerCase()
    .replace(/[^a-z0-9\-\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40) || 'server-' + Math.random().toString(36).slice(2, 8);
}

function soonVipKey(serverId: string, instanceId?: string | null) {
  return `${serverId}::${instanceId ?? ''}`;
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, '0');
  const utcMidnight = date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0;
  if (utcMidnight) {
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T00:00`;
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDateTimeLocal(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function toDateInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromDateInput(value?: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function futureOpenings(servers: any[]) {
  const now = Date.now();
  const result: Array<{ key: string; serverId: string; instanceId?: string | null; label: string; openedAt: string }> = [];
  for (const s of servers) {
    const insts = Array.isArray(s.instances) ? s.instances : [];
    const futureInsts = insts.filter((i: any) => isOpeningStillSoon(i?.openedDate, now));
    if (futureInsts.length > 0) {
      for (const i of futureInsts) {
        result.push({
          key: soonVipKey(s.id, i.id),
          serverId: s.id,
          instanceId: i.id,
          label: `${s.name}${i.label ? ` · ${i.label}` : ''} (${i.chronicle} · ${i.rates})`,
          openedAt: i.openedDate,
        });
      }
    } else if (isOpeningStillSoon(s.openedDate, now)) {
      result.push({
        key: soonVipKey(s.id, null),
        serverId: s.id,
        instanceId: null,
        label: `${s.name} (${s.chronicle} · ${s.rates})`,
        openedAt: s.openedDate,
      });
    }
  }
  return result.sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime());
}

function hasProjectLaunches(s: any): boolean {
  return Array.isArray(s?.instances) && s.instances.length > 0;
}

function lastCompleteMonth(): string {
  const now = new Date();
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, '0')}`;
}

function similarwebUrl(projectUrl?: string | null): string | null {
  try {
    const host = new URL(projectUrl || '').hostname.replace(/^www\./, '').toLowerCase();
    return host ? `https://www.similarweb.com/website/${host}/` : null;
  } catch {
    return null;
  }
}

type TrafficDraft = {
  period: string;
  monthly: string;
  source: string;
};

function previousMonth(period: string): string {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function trafficDrafts(server: any): TrafficDraft[] {
  const history = Array.isArray(server?.trafficHistory) ? server.trafficHistory : [];
  const entries = history
    .filter((item: any) => item?.period && item?.monthly != null)
    .map((item: any) => ({ period: item.period, monthly: String(item.monthly), source: item.source || 'similarweb' }));
  if (entries.length > 0) return entries.sort((left: TrafficDraft, right: TrafficDraft) => right.period.localeCompare(left.period));
  if (server?.trafficPeriod && server?.trafficMonthly != null) {
    return [{ period: server.trafficPeriod, monthly: String(server.trafficMonthly), source: server.trafficSource || 'similarweb' }];
  }
  return [];
}

function trafficPayload(entries: TrafficDraft[]) {
  return entries
    .filter(entry => entry.period && entry.monthly !== '' && Number.isFinite(Number(entry.monthly)))
    .map(entry => ({ period: entry.period, monthly: Number(entry.monthly), source: entry.source || 'similarweb' }));
}

function applyTrafficPatch<T extends { id?: string }>(server: T, patch: any): T {
  return {
    ...server,
    trafficHistory: patch.trafficHistory ?? [],
    trafficMonthly: patch.trafficMonthly ?? null,
    trafficThreeMonths: patch.trafficThreeMonths ?? null,
    trafficPeriod: patch.trafficPeriod ?? null,
    trafficSource: patch.trafficSource ?? null,
  };
}

function projectInstancesPayload(instances: any[]) {
  return instances.map(({ donate: _donate, ...instance }) => instance);
}

function normalizeImportText(value: string) {
  return value.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
}

function importInstanceId() {
  return `inst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function importRateNum(value?: string | null) {
  const match = String(value ?? '').match(/\d+(?:[.,]\d+)?/);
  return match ? Math.max(1, Math.round(Number(match[0].replace(',', '.')))) : 1;
}

function importChronicle(value?: string | null) {
  const text = normalizeImportText(value ?? '');
  if (!text) return '';
  const aliases: Array<[string, string]> = [
    ['hf', 'High Five'], ['h5', 'High Five'], ['хф', 'High Five'], ['хай файв', 'High Five'],
    ['interlude', 'Interlude'], ['интерлюд', 'Interlude'], ['ил', 'Interlude'],
    ['essence', 'Essence'], ['эссенс', 'Essence'],
    ['classic', 'Classic'], ['классик', 'Classic'],
    ['main', 'Main'], ['мейн', 'Main'],
    ['kamael', 'Kamael'], ['камаэль', 'Kamael'],
  ];
  const alias = aliases.find(([key]) => text === key || text.includes(key));
  if (alias) return alias[1];
  return CHRONICLES.find(c => normalizeImportText(c) === text || text.includes(normalizeImportText(c))) ?? value?.trim() ?? '';
}

function importServerType(value?: string | null) {
  const text = normalizeImportText(value ?? '');
  if (!text) return 'pvp-pve';
  if ((text.includes('multi') && text.includes('craft')) || (text.includes('мульти') && text.includes('крафт'))) return 'multicraft';
  if (text.includes('multiproff') || text.includes('мультипроф')) return 'multiproff';
  if (text.includes('gve')) return 'gve';
  if (text.includes('rvr')) return 'rvr';
  if ((text.includes('pvp') && text.includes('pve')) || text.includes('mixed') || text.includes('смеш')) return 'pvp-pve';
  if (text.includes('pve')) return 'pve';
  if (text.includes('pvp')) return 'pvp';
  return SERVER_TYPES.some(t => t.v === text) ? text : 'pvp-pve';
}

function importActivity(value?: string | null) {
  const text = normalizeImportText(value ?? '');
  if (!text) return 'unknown';
  if ((text.includes('очень') && text.includes('низ')) || (text.includes('very') && text.includes('low'))) return 'very_low';
  if (text.includes('выс') || text.includes('high')) return 'high';
  if (text.includes('сред') || text.includes('medium')) return 'medium';
  if (text.includes('низ') || text.includes('low')) return 'low';
  return 'unknown';
}

function importTrust(value?: string | null) {
  const match = String(value ?? '').toUpperCase().match(/[ABC]/);
  return match?.[0] ?? '';
}

function importDateIso(value?: string | null) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const monthNames: Record<string, number> = {
    января: 1, январь: 1, jan: 1,
    февраля: 2, февраль: 2, feb: 2,
    марта: 3, март: 3, mar: 3,
    апреля: 4, апрель: 4, apr: 4,
    мая: 5, май: 5, may: 5,
    июня: 6, июнь: 6, jun: 6,
    июля: 7, июль: 7, jul: 7,
    августа: 8, август: 8, aug: 8,
    сентября: 9, сентябрь: 9, sep: 9,
    октября: 10, октябрь: 10, oct: 10,
    ноября: 11, ноябрь: 11, nov: 11,
    декабря: 12, декабрь: 12, dec: 12,
  };
  const makeDate = (year: number, month: number, day: number, hour?: string, minute?: string) => {
    const date = new Date(year, month - 1, day, hour ? Number(hour) : 20, minute ? Number(minute) : 0);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  };

  let match = raw.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T,]+(\d{1,2}):(\d{2}))?/);
  if (match) return makeDate(Number(match[1]), Number(match[2]), Number(match[3]), match[4], match[5]);

  match = raw.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?:[ T,]+(\d{1,2}):(\d{2}))?/);
  if (match) {
    const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
    return makeDate(year, Number(match[2]), Number(match[1]), match[4], match[5]);
  }

  match = normalizeImportText(raw).match(/(\d{1,2})\s+([а-яa-z]+)\s+(\d{4})(?:[,\s]+(\d{1,2}):(\d{2}))?/);
  if (match && monthNames[match[2]]) return makeDate(Number(match[3]), monthNames[match[2]], Number(match[1]), match[4], match[5]);

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function importFieldKey(value: string) {
  const key = normalizeImportText(value).replace(/[^\p{L}\p{N}]+/gu, '');
  if (['id', 'айди', 'slug', 'идентификатор'].includes(key)) return 'id';
  if (['name', 'название', 'проект', 'сервер', 'server'].includes(key)) return 'name';
  if (['abbr', 'аббревиатура', 'сокращение'].includes(key)) return 'abbr';
  if (['url', 'site', 'сайт', 'ссылка', 'адрес'].includes(key)) return 'url';
  if (['chronicle', 'chronicles', 'хроника', 'хроники'].includes(key)) return 'chronicle';
  if (['rates', 'rate', 'рейты', 'рейт'].includes(key)) return 'rates';
  if (['ratenum', 'рейтчисло', 'числорейта'].includes(key)) return 'rateNum';
  if (['type', 'тип', 'типсервера'].includes(key)) return 'serverType';
  if (['date', 'start', 'openeddate', 'открытие', 'дата', 'старт', 'датаоткрытия'].includes(key)) return 'openedDate';
  if (['country', 'languages', 'language', 'языки', 'страна'].includes(key)) return 'country';
  if (['trust', 'trustlevel', 'доверие'].includes(key)) return 'trustLevel';
  if (['activity', 'activitylevel', 'активность'].includes(key)) return 'activityLevel';
  if (['telegram', 'tg', 'телеграм'].includes(key)) return 'telegram';
  if (['discord', 'дискорд'].includes(key)) return 'discord';
  if (['vk', 'вк', 'vkontakte', 'вконтакте'].includes(key)) return 'vk';
  if (['icon', 'иконка', 'лого'].includes(key)) return 'icon';
  if (['banner', 'баннер', 'фон'].includes(key)) return 'banner';
  if (['shortdesc', 'short', 'кратко', 'коротко', 'описание'].includes(key)) return 'shortDesc';
  if (['fulldesc', 'full', 'полноеописание', 'текст', 'подробно'].includes(key)) return 'fullDesc';
  if (['instances', 'worlds', 'launches', 'миры', 'запуски', 'сервера'].includes(key)) return 'instances';
  return '';
}

function parseImportKeyValue(line: string) {
  const cleaned = line.replace(/^\s*[-*]\s*/, '');
  const match = cleaned.match(/^([^:=|]{2,42})\s*[:=]\s*(.+)$/);
  if (!match) return null;
  const key = importFieldKey(match[1]);
  return key ? { key, value: match[2].trim() } : null;
}

function applyImportedField(target: any, key: string, value: string, root = true) {
  if (key === 'chronicle') target.chronicle = importChronicle(value);
  else if (key === 'rates') {
    target.rates = value.trim();
    target.rateNum = root ? String(importRateNum(value)) : importRateNum(value);
  } else if (key === 'rateNum') target.rateNum = root ? String(importRateNum(value)) : importRateNum(value);
  else if (key === 'serverType') {
    if (root) target.serverType = importServerType(value);
    else target.type = importServerType(value);
  } else if (key === 'openedDate') {
    const iso = importDateIso(value);
    target.openedDate = root ? toDateTimeLocal(iso) : (iso || null);
  } else if (key === 'trustLevel') target.trustLevel = importTrust(value);
  else if (key === 'activityLevel') target.activityLevel = importActivity(value);
  else if (key !== 'instances') target[key] = value.trim();
}

function parseImportInstance(line: string, rootUrl: string) {
  const cleaned = line.replace(/^\s*[-*]\s*/, '').trim();
  if (!cleaned) return null;
  const instance: any = {
    id: importInstanceId(),
    label: '',
    shortDesc: '',
    chronicle: '',
    rates: '',
    rateNum: 1,
    type: 'pvp-pve',
    url: rootUrl,
    openedDate: null,
    lifecycleStatus: undefined,
    statusNote: '',
  };

  if (cleaned.includes('|') && !cleaned.includes(':')) {
    const parts = cleaned.split('|').map(part => part.trim()).filter(Boolean);
    const [label, chronicle, rates, type, openedDate, url, shortDesc] = parts;
    if (label) instance.label = label;
    if (chronicle) instance.chronicle = importChronicle(chronicle);
    if (rates) {
      instance.rates = rates;
      instance.rateNum = importRateNum(rates);
    }
    if (type) instance.type = importServerType(type);
    if (openedDate) instance.openedDate = importDateIso(openedDate) || null;
    if (url?.startsWith('http')) instance.url = url;
    if (shortDesc) instance.shortDesc = shortDesc;
    return instance;
  }

  const chunks = cleaned.split(/\s*[;|]\s*/).filter(Boolean);
  for (const chunk of chunks) {
    const pair = parseImportKeyValue(chunk);
    if (pair) applyImportedField(instance, pair.key, pair.value, false);
    else if (!instance.label) instance.label = chunk.trim();
  }
  if (!instance.chronicle && instance.label) instance.chronicle = importChronicle(instance.label);
  return instance;
}

function parseServerTextImport(text: string) {
  const patch: any = {};
  const warnings: string[] = [];
  const lines = text.replace(/\r/g, '').split('\n');
  let inInstances = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const pair = parseImportKeyValue(line);
    if (pair?.key === 'instances') {
      inInstances = true;
      continue;
    }
    if (inInstances && (line.startsWith('-') || line.startsWith('*') || line.includes('|'))) {
      const instance = parseImportInstance(line, patch.url || '');
      if (instance) patch.instances = [...(patch.instances ?? []), instance];
      continue;
    }
    if (!pair) {
      if (!patch.fullDesc && line.length > 35) patch.fullDesc = line;
      continue;
    }
    applyImportedField(patch, pair.key, pair.value, true);
  }

  if (!patch.id && patch.name) patch.id = slugify(patch.name);
  if (!patch.abbr && patch.name) patch.abbr = patch.name.slice(0, 3).toUpperCase();
  if (!patch.rateNum && patch.rates) patch.rateNum = String(importRateNum(patch.rates));
  if (patch.instances?.length) {
    patch.instances = patch.instances.map((instance: any) => ({
      ...instance,
      url: instance.url || patch.url || '',
      chronicle: instance.chronicle || patch.chronicle || 'Interlude',
      rates: instance.rates || patch.rates || '',
      rateNum: instance.rateNum || importRateNum(instance.rates || patch.rates),
      type: instance.type || patch.serverType || 'pvp-pve',
    }));
  }

  for (const [key, label] of [
    ['id', 'ID'],
    ['name', 'название'],
    ['url', 'сайт'],
  ] as const) {
    if (!patch[key]) warnings.push(`не найдено поле: ${label}`);
  }
  if (!patch.instances?.length && !patch.rates) warnings.push('не найдены рейты');
  if (!patch.instances?.length && !patch.chronicle) warnings.push('не найдена хроника');

  return { patch, warnings };
}

// Скрытый вход в админку по email+паролю (публичной регистрации на сайте нет).
function AdminLogin({ onLogin }: { onLogin: (token: string, user: any) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const res = await api.auth.login(email.trim(), password);
      onLogin(res.access_token, res.user);
    } catch (err: any) {
      setError(err?.message || 'Не удалось войти');
      setBusy(false);
    }
  }

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'70vh', padding:'1rem' }}>
      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        style={{ width:'min(360px,100%)', display:'grid', gap:'.7rem', padding:'1.6rem', border:'1px solid rgba(210,171,82,.2)', borderRadius:10, background:'rgba(11,16,23,.92)' }}
      >
        <h1 style={{ fontFamily:"'Cinzel',serif", fontSize:'1rem', letterSpacing:'.12em', textTransform:'uppercase', color:'var(--gold)', textAlign:'center', margin:'0 0 .4rem' }}>Вход</h1>
        <input className="input" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username" required />
        <input className="input" type="password" placeholder="Пароль" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required />
        {error && <p style={{ color:'#ec7464', fontSize:'.8rem', margin:0 }}>{error}</p>}
        <button className="btn-gold" type="submit" disabled={busy}>{busy ? <span className="spin" /> : 'Войти'}</button>
      </form>
    </div>
  );
}

export default function AdminPage() {
  const { user, token, isAdmin, loading, login } = useAuth();
  const router = useRouter();
  const [tab, setTab]         = useState<AdminTab>('servers');
  const [servers, setServers]     = useState<any[]>([]);
  const [vipStatus, setVipStatus] = useState<VipStatus | null>(null);
  const [soonVipStatus, setSoonVipStatus] = useState<VipStatus | null>(null);
  const [boosts, setBoosts]       = useState<any[]>([]);
  const [banners, setBanners]     = useState<any[]>([]);
  const [clickReport, setClickReport] = useState<OpeningClickReport | null>(null);
  const [clickReportDays, setClickReportDays] = useState(30);
  const [dataLoading, setDataLoading] = useState(false);
  const [toast, setToast]         = useState('');
  const [keyChecking, setKeyChecking] = useState(true);

  // Вход по файлу-ярлыку: открываешь /admin#k=<ключ> → автологин,
  // ключ сразу стираем из адреса и истории, чтобы не светился.
  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const match = hash.match(/[#&]k=([^&]+)/);
    if (!match) { setKeyChecking(false); return; }
    const key = decodeURIComponent(match[1]);
    history.replaceState(null, '', window.location.pathname);
    api.auth.keyLogin(key)
      .then(res => login(res.access_token, res.user))
      .catch(() => {})
      .finally(() => setKeyChecking(false));
  }, [login]);

  // Модал редактирования
  const [editServer, setEditServer] = useState<any | null>(null);
  const [editForm, setEditForm]   = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);

  // Форма баннера (создание/редактирование)
  const emptyBanner = { id: '', slot: 1, title: '', subtitle: '', image: '', href: '', advertiser: '', erid: '', endDate: '', active: true };
  const [bannerForm, setBannerForm] = useState<any>(emptyBanner);

  async function saveBanner() {
    if (!token) return;
    if (!bannerForm.title.trim() || !bannerForm.href.trim()) { showToast('Заголовок и ссылка обязательны'); return; }
    try {
      if (bannerForm.id) await api.banners.update(bannerForm.id, bannerForm, token);
      else await api.banners.create(bannerForm, token);
      showToast(bannerForm.id ? 'Баннер обновлён' : 'Баннер создан');
      setBannerForm(emptyBanner);
      loadTab('banners');
    } catch (e: any) { showToast(e.message); }
  }
  async function deleteBanner(id: string) {
    if (!token || !confirm('Удалить баннер?')) return;
    try { await api.banners.remove(id, token); showToast('Баннер удалён'); loadTab('banners'); }
    catch (e: any) { showToast(e.message); }
  }

  // Форма добавления
  const [addForm, setAddForm] = useState({
    id:'', name:'', abbr:'', chronicle:'Interlude', rates:'', rateNum:'1',
    url:'', openedDate:'', country:'RU', statusOverride: 'auto',
    manualCheckAt: '', trustLevel: '', activityLevel: 'unknown',
    serverType: 'pvp-pve',
    type_new: false, type_featured: false, vip: false, voteRewardsEnabled: false,
    icon:'', banner:'', telegram:'', discord:'', vk:'',
    shortDesc:'', fullDesc:'',
    trafficHistory: [] as TrafficDraft[],
    instances: [] as any[],
  });
  const [textImportOpen, setTextImportOpen] = useState(false);
  const [serverTextDraft, setServerTextDraft] = useState('');
  const [serverTextResult, setServerTextResult] = useState('');

  useEffect(() => {
    if (!token || !isAdmin) return;
    loadTab(tab);
  }, [tab, token, isAdmin, clickReportDays]);

  async function loadTab(t: AdminTab) {
    if (!token) return;
    setDataLoading(true);
    try {
      if (t === 'servers')  { const r = await api.servers.list({ limit: '200' }); setServers(r.data); }
      if (t === 'banners')  setBanners(await api.banners.adminList(token));
      if (t === 'clicks') setClickReport(await api.openingWaits.clickReport(clickReportDays, token));
      if (t === 'money') {
        const [vs, svs, bs, sl] = await Promise.all([
          api.payments.vipStatus(),
          api.payments.soonVipStatus(),
          api.payments.allBoosts(token),
          api.servers.list({ limit: '500' }),
        ]);
        setVipStatus(vs);
        setSoonVipStatus(svs);
        setBoosts(bs);
        setServers(sl.data);
      }
    } catch {}
    setDataLoading(false);
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  function applyServerTextImport() {
    const source = serverTextDraft.trim();
    if (!source) {
      showToast('Вставьте текстовый блок сервера');
      return;
    }
    const { patch, warnings } = parseServerTextImport(source);
    const parsedKeys = Object.keys(patch);
    if (parsedKeys.length === 0) {
      setServerTextResult('Не смог разобрать поля. Попробуйте формат "Название: ...", "Сайт: ...", "Рейты: ...".');
      return;
    }
    setAddForm(prev => ({
      ...prev,
      ...patch,
      icon: patch.icon ?? prev.icon,
      banner: patch.banner ?? prev.banner,
      trafficHistory: prev.trafficHistory,
    }));
    const parsedLabel = parsedKeys
      .filter(key => key !== 'instances')
      .join(', ');
    const worldCount = patch.instances?.length ?? 0;
    setServerTextResult([
      `Заполнено: ${parsedLabel || 'основные поля'}${worldCount ? `, миров: ${worldCount}` : ''}.`,
      warnings.length ? `Проверьте вручную: ${warnings.join(', ')}.` : 'Можно проверить форму и загрузить иконку/баннер.',
    ].join(' '));
    showToast('Текст разобран и перенесен в форму');
  }

  async function deleteServer(id: string) {
    if (!token || !confirm(`Удалить сервер ${id}?`)) return;
    try { await api.servers.delete(id, token); showToast('Удалено'); loadTab('servers'); }
    catch (e: any) { showToast(e.message); }
  }

  async function grantVip(serverId: string) {
    if (!token) return;
    try { await api.payments.grantVip(serverId, token); showToast('◆ Добавлен в «Рекомендуем»'); loadTab(tab); }
    catch (e: any) { showToast(e.message); }
  }
  async function revokeVip(serverId: string) {
    if (!token || !confirm('Убрать из «Рекомендуем»?')) return;
    try { await api.payments.revokeVip(serverId, token); showToast('Убран из «Рекомендуем»'); loadTab(tab); }
    catch (e: any) { showToast(e.message); }
  }
  async function grantSoonVipFromValue(value: string) {
    if (!token) return;
    const [serverId, instanceId = ''] = value.split('::');
    try {
      await api.payments.grantSoonVip(serverId, instanceId || null, token);
      showToast('◆ Добавлен в «Рекомендуем · Скоро»');
      loadTab(tab);
    } catch (e: any) {
      showToast(e.message);
    }
  }
  async function revokeSoonVip(serverId: string, instanceId?: string | null) {
    if (!token || !confirm('Убрать из «Рекомендуем · Скоро»?')) return;
    try {
      await api.payments.revokeSoonVip(serverId, instanceId, token);
      showToast('Убран из «Рекомендуем · Скоро»');
      loadTab(tab);
    } catch (e: any) {
      showToast(e.message);
    }
  }
  async function grantBoost(serverId: string) {
    if (!token) return;
    try { await api.payments.grantBoost(serverId, token); showToast('◆ В фокусе'); loadTab(tab); }
    catch (e: any) { showToast(e.message); }
  }
  async function revokeBoost(serverId: string) {
    if (!token || !confirm('Убрать из «В фокусе»?')) return;
    try { await api.payments.revokeBoost(serverId, token); showToast('Убран из «В фокусе»'); loadTab(tab); }
    catch (e: any) { showToast(e.message); }
  }

  function openEdit(s: any) {
    setEditServer(s);
    setEditForm({
      name:        s.name        ?? '',
      abbr:        s.abbr        ?? '',
      chronicle:   s.chronicle   ?? 'Interlude',
      rates:       s.rates       ?? '',
      rateNum:     String(s.rateNum ?? '1'),
      url:         s.url         ?? '',
      openedDate:  toDateTimeLocal(s.openedDate),
      country:     s.country     ?? 'RU',
      statusOverride: s.statusOverride ?? 'auto',
      manualCheckAt: toDateInput(s.manualCheckAt),
      trustLevel: s.trustLevel ?? '',
      activityLevel: s.activityLevel ?? 'unknown',
      serverType:  (s.type ?? []).find((t: string) => SERVER_TYPES.some(st => st.v === t)) ?? 'pvp-pve',
      type_new:    s.type?.includes('new')      ?? false,
      type_featured: s.type?.includes('featured') ?? false,
      voteRewardsEnabled: !!s.voteRewardsEnabled,
      icon:        s.icon        ?? '',
      banner:      s.banner      ?? '',
      telegram:    s.telegram    ?? '',
      discord:     s.discord     ?? '',
      vk:          s.vk          ?? '',
      shortDesc:   s.shortDesc   ?? '',
      fullDesc:    s.fullDesc    ?? '',
      trafficHistory: trafficDrafts(s),
      instances:   Array.isArray(s.instances) ? s.instances : [],
    });
  }

  async function submitEdit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!token || !editServer) return;
    setEditLoading(true);
    const types: string[] = [];
    if ((editForm.instances?.length ?? 0) === 0 && editForm.serverType) types.push(editForm.serverType);
    if (editForm.type_new)      types.push('new');
    if (editForm.type_featured) types.push('featured');
    // Если у проекта есть instances — chronicle/rates/rateNum скрыты в UI.
    // Берём значения из первого instance (минимальный rateNum), чтобы при сортировке
    // и базовых фильтрах проект имел осмысленные значения.
    const insts = editForm.instances ?? [];
    const sortedInsts = [...insts].sort((a:any,b:any) => (a.rateNum||0)-(b.rateNum||0));
    const baseChron = sortedInsts.length > 0 ? sortedInsts[0].chronicle : editForm.chronicle;
    const baseRates = sortedInsts.length > 0 ? sortedInsts[0].rates     : editForm.rates;
    const baseRateN = sortedInsts.length > 0 ? sortedInsts[0].rateNum   : Number(editForm.rateNum);
    try {
      await api.servers.update(editServer.id, {
        name:        editForm.name,
        abbr:        editForm.abbr || editForm.name.slice(0, 2).toUpperCase(),
        chronicle:   baseChron,
        rates:       baseRates,
        rateNum:     baseRateN,
        url:         editForm.url,
        openedDate:  fromDateTimeLocal(editForm.openedDate) || undefined,
        country:     editForm.country,
        voteRewardsEnabled: !!editForm.voteRewardsEnabled,
        manualCheckAt: fromDateInput(editForm.manualCheckAt),
        trustLevel: editForm.trustLevel || null,
        activityLevel: editForm.activityLevel || 'unknown',
        statusOverride: editForm.statusOverride === 'auto' ? null : editForm.statusOverride,
        type:        types,
        icon:        editForm.icon || undefined,
        banner:      editForm.banner || undefined,
        telegram:    editForm.telegram || undefined,
        discord:     editForm.discord || undefined,
        vk:          editForm.vk || undefined,
        shortDesc:   editForm.shortDesc,
        fullDesc:    editForm.fullDesc,
        instances:   projectInstancesPayload(editForm.instances ?? []),
      } as any, token);
      showToast(`✅ Сервер ${editForm.name} обновлён`);
      setEditServer(null);
      loadTab('servers');
    } catch (err: any) {
      showToast(`❌ ${err.message}`);
    }
    setEditLoading(false);
  }

  async function submitAdd(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!token) return;
    const types: string[] = [];
    if ((addForm.instances?.length ?? 0) === 0 && addForm.serverType) types.push(addForm.serverType);
    if (addForm.type_new)      types.push('new');
    if (addForm.type_featured) types.push('featured');
    // Если у проекта есть instances — chronicle/rates/rateNum скрыты, берём из первого
    const aInsts = addForm.instances ?? [];
    const aSorted = [...aInsts].sort((a:any,b:any) => (a.rateNum||0)-(b.rateNum||0));
    const aChron  = aSorted.length > 0 ? aSorted[0].chronicle : addForm.chronicle;
    const aRates  = aSorted.length > 0 ? aSorted[0].rates     : addForm.rates;
    const aRateN  = aSorted.length > 0 ? aSorted[0].rateNum   : Number(addForm.rateNum);
    try {
      await api.servers.create({
        id: addForm.id, name: addForm.name, abbr: addForm.abbr || addForm.name.slice(0,2).toUpperCase(),
        url: addForm.url, chronicle: aChron, rates: aRates, rateNum: aRateN,
        type: types, vip: addForm.vip,
        voteRewardsEnabled: !!addForm.voteRewardsEnabled,
        openedDate: fromDateTimeLocal(addForm.openedDate) || undefined, country: addForm.country,
        manualCheckAt: fromDateInput(addForm.manualCheckAt),
        trustLevel: addForm.trustLevel || null,
        activityLevel: addForm.activityLevel || 'unknown',
        statusOverride: addForm.statusOverride === 'auto' ? null : addForm.statusOverride,
        icon: addForm.icon || undefined, banner: addForm.banner || undefined,
        telegram: addForm.telegram || undefined, discord: addForm.discord || undefined, vk: addForm.vk || undefined,
        shortDesc: addForm.shortDesc, fullDesc: addForm.fullDesc,
        trafficHistory: trafficPayload(addForm.trafficHistory ?? []),
        instances: projectInstancesPayload(addForm.instances ?? []),
      } as any, token);
      showToast(`✅ Сервер ${addForm.name} добавлен!`);
      setTab('servers');
    } catch (e: any) { showToast(`❌ ${e.message}`); }
  }

  if (loading || keyChecking) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', gap:'.6rem', color:'var(--text3)' }}>
      <span className="spin" /> Загрузка...
    </div>
  );

  if (!isAdmin) return <AdminLogin onLogin={login} />;

  const TABS: { k: AdminTab; l: string }[] = [
    { k: 'servers',  l: `Серверы (${servers.length})` },
    { k: 'money',    l: `Продвижение${vipStatus ? ` (${vipStatus.taken})` : ''}` },
    { k: 'banners',  l: `Баннеры${banners.length ? ` (${banners.length})` : ''}` },
    { k: 'clicks',   l: `Переходы${clickReport ? ` (${clickReport.total})` : ''}` },
    { k: 'add',      l: '+ Добавить сервер' },
  ];

  const vipServerIds = new Set((vipStatus?.slots ?? []).map(s => s.serverId));
  const soonVipKeys = new Set((soonVipStatus?.slots ?? []).map(s => soonVipKey(s.serverId, s.instanceId)));
  const soonVipOptions = futureOpenings(servers).filter(o => !soonVipKeys.has(o.key));
  const boostServerIds = new Set(boosts.filter(b => new Date(b.endDate) > new Date()).map(b => b.serverId));

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* Модал редактирования */}
      {editServer && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'2rem 1rem' }}>
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'1rem', padding:'1.8rem', width:'100%', maxWidth:'680px', position:'relative' }}>
            <button onClick={() => setEditServer(null)} style={{ position:'absolute', top:'1rem', right:'1rem', background:'none', border:'none', color:'var(--text2)', fontSize:'1.3rem', cursor:'pointer', lineHeight:1 }}>✕</button>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:'.7rem', color:'var(--gold)', textTransform:'uppercase', letterSpacing:'.12em', marginBottom:'1.2rem' }}>
              Редактирование: {editServer.name}
            </div>
            <form onSubmit={submitEdit} className={styles.addForm}>
              <div className={styles.formGrid}>
                <AField label="Название *"><input className="input" required value={editForm.name} onChange={e => setEditForm((p:any) => ({...p,name:e.target.value}))} /></AField>
                <AField label="Аббревиатура"><input className="input" value={editForm.abbr} maxLength={3} onChange={e => setEditForm((p:any) => ({...p,abbr:e.target.value}))} /></AField>
                {/* Хроника/Рейты/rateNum скрыты если у проекта есть instances —
                    они подтягиваются из Карточек проекта (см. редактор внизу). */}
                {(editForm.instances?.length ?? 0) === 0 && (
                  <>
                    <AField label="Хроника *">
                      <select className="input" value={editForm.chronicle} onChange={e => setEditForm((p:any) => ({...p,chronicle:e.target.value}))}>
                        {CHRONICLES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </AField>
                    <AField label="Рейты *"><input className="input" required value={editForm.rates} onChange={e => setEditForm((p:any) => ({...p,rates:e.target.value}))} placeholder="x100" /></AField>
                    <AField label="Рейт (число)"><input className="input" type="number" min={1} value={editForm.rateNum} onChange={e => setEditForm((p:any) => ({...p,rateNum:e.target.value}))} /></AField>
                    <AField label="Тип сервера">
                      <select className="input" value={editForm.serverType} onChange={e => setEditForm((p:any) => ({...p,serverType:e.target.value}))}>
                        {SERVER_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                      </select>
                    </AField>
                  </>
                )}
                <AField label="Сайт *"><input className="input" required type="url" value={editForm.url} onChange={e => setEditForm((p:any) => ({...p,url:e.target.value}))} /></AField>
                <AField label="Дата и время открытия"><input className="input" type="datetime-local" value={editForm.openedDate} onChange={e => setEditForm((p:any) => ({...p,openedDate:e.target.value}))} /></AField>
                <AField label="Языки">
                  <input
                    className="input"
                    value={editForm.country}
                    onChange={e => setEditForm((p:any) => ({...p,country:e.target.value}))}
                    placeholder="🇷🇺 🇺🇦 🇪🇺 или RU EU"
                  />
                </AField>
                <AField label="Ручной статус">
                  <select className="input" value={editForm.statusOverride} onChange={e => setEditForm((p:any) => ({...p,statusOverride:e.target.value}))}>
                    <option value="auto">Авто мониторинг</option>
                    <option value="online">Всегда работает</option>
                    <option value="offline">Не работает</option>
                    <option value="unknown">Неизвестно</option>
                  </select>
                </AField>
                <AField label="Дата ручной проверки">
                  <input className="input" type="date" value={editForm.manualCheckAt} onChange={e => setEditForm((p:any) => ({...p,manualCheckAt:e.target.value}))} />
                </AField>
                <AField label="Доверие">
                  <select className="input" value={editForm.trustLevel} onChange={e => setEditForm((p:any) => ({...p,trustLevel:e.target.value}))}>
                    <option value="">Не указано</option>
                    <option value="A">A — проверено хорошо</option>
                    <option value="B">B — есть мелкие вопросы</option>
                    <option value="C">C — доверие низкое</option>
                  </select>
                </AField>
                <AField label="Активность">
                  <select className="input" value={editForm.activityLevel} onChange={e => setEditForm((p:any) => ({...p,activityLevel:e.target.value}))}>
                    <option value="unknown">Не указана</option>
                    <option value="high">Высокая</option>
                    <option value="medium">Средняя</option>
                    <option value="low">Низкая</option>
                    <option value="very_low">Очень низкая</option>
                  </select>
                </AField>
                <AField label="Vote Manager">
                  <label style={{ display:'flex', alignItems:'center', gap:'.5rem', minHeight:38, color:'var(--text2)', fontSize:'.84rem' }}>
                    <input type="checkbox" checked={!!editForm.voteRewardsEnabled} onChange={e => setEditForm((p:any) => ({...p,voteRewardsEnabled:e.target.checked}))} />
                    Бонусы за голос подключены
                  </label>
                </AField>
                <ImageUpload label="Иконка" value={editForm.icon} type="icon" token={token!} onChange={url => setEditForm((p:any) => ({...p,icon:url}))} />
                <ImageUpload label="Баннер" value={editForm.banner} type="banner" token={token!} onChange={url => setEditForm((p:any) => ({...p,banner:url}))} />
                <AField label="Telegram"><input className="input" type="url" value={editForm.telegram} onChange={e => setEditForm((p:any) => ({...p,telegram:e.target.value}))} placeholder="https://t.me/…" /></AField>
                <AField label="Discord"><input className="input" type="url" value={editForm.discord} onChange={e => setEditForm((p:any) => ({...p,discord:e.target.value}))} placeholder="https://discord.gg/…" /></AField>
                <AField label="ВКонтакте"><input className="input" type="url" value={editForm.vk} onChange={e => setEditForm((p:any) => ({...p,vk:e.target.value}))} placeholder="https://vk.com/…" /></AField>
              </div>

              <TrafficEditorV2
                serverId={editServer.id}
                token={token}
                projectUrl={editForm.url}
                entries={editForm.trafficHistory ?? []}
                onChange={(trafficHistory) => setEditForm((p:any) => ({ ...p, trafficHistory }))}
                onPersisted={(patch) => {
                  setEditForm((p:any) => applyTrafficPatch(p, patch));
                  setServers(prev => prev.map(server => server.id === patch.id ? applyTrafficPatch(server, patch) : server));
                }}
              />

              <AField label="Краткое описание">
                <input className="input" value={editForm.shortDesc} onChange={e => setEditForm((p:any) => ({...p,shortDesc:e.target.value}))} />
              </AField>
              <AField label="Полное описание">
                <textarea className="input" rows={5} value={editForm.fullDesc} onChange={e => setEditForm((p:any) => ({...p,fullDesc:e.target.value}))} style={{ resize:'vertical' }} />
              </AField>

              <div style={{ marginTop:'.4rem' }}>
                <InstancesEditor
                  value={editForm.instances ?? []}
                  onChange={v => setEditForm((p:any) => ({ ...p, instances: v }))}
                />
              </div>

              <div style={{ display:'flex', gap:'.8rem', marginTop:'.4rem' }}>
                <button className="btn-primary" type="submit" disabled={editLoading} style={{ padding:'.5rem 1.6rem' }}>
                  {editLoading ? 'Сохранение…' : '💾 Сохранить'}
                </button>
                <button type="button" onClick={() => setEditServer(null)} style={{ padding:'.5rem 1.2rem', background:'none', border:'1px solid var(--border)', color:'var(--text2)', borderRadius:'.5rem', cursor:'pointer' }}>
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className={styles.hero}>
        <span className={styles.badge}>Admin Panel</span>
        <h1 className={styles.title}>L2Realm — Управление</h1>
        <p className={styles.sub}>Вы вошли как <strong>{user?.email}</strong></p>
      </div>

      <div className={styles.wrap}>
        <div className={styles.tabs}>
          {TABS.map(({ k, l }) => (
            <button key={k} className={`${styles.tab} ${tab === k ? styles.tabActive : ''}`} onClick={() => setTab(k)}>{l}</button>
          ))}
          <Link
            href="/admin/articles"
            className={styles.tab}
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
          >
            ✎ Статьи блога
          </Link>
        </div>

        {dataLoading ? (
          <div className={styles.loadWrap}><span className="spin" /> Загрузка данных...</div>
        ) : (

          <>
            {/* Серверы */}
            {tab === 'servers' && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Список серверов ({servers.length})</div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead><tr><th>ID</th><th>Название</th><th>Хроника</th><th>Рейты</th><th>Статус</th><th>Действия</th></tr></thead>
                    <tbody>
                      {servers.map(s => (
                        <tr key={s.id}>
                          <td className={styles.tdMono}>{s.id}</td>
                          <td><strong>{s.name}</strong></td>
                          <td>{hasProjectLaunches(s) ? '—' : s.chronicle}</td>
                          <td>{hasProjectLaunches(s) ? '—' : s.rates}</td>
                          <td style={{ fontSize:'.72rem' }}>
                            <div style={{ display:'flex', flexDirection:'column', gap:'.15rem' }}>
                              {s._isVip && <span className={styles.planBadge}>◆ Рекомендуем{s.subscription?.endDate ? ` · до ${new Date(s.subscription.endDate).toLocaleDateString('ru-RU')}` : ''}</span>}
                              {s._isBoosted && <span className={styles.planBadge} style={{ background:'rgba(240,140,70,.1)', color:'#F08C46', borderColor:'rgba(240,140,70,.25)' }}>◆ В фокусе{s._boostEnd ? ` · до ${new Date(s._boostEnd).toLocaleDateString('ru-RU')}` : ''}</span>}
                              {s.statusOverride && <span className={styles.planBadge} style={{ background:'rgba(90,180,130,.1)', color:'#5AB482', borderColor:'rgba(90,180,130,.25)' }}>Статус: {s.statusOverride}</span>}
                              {s.voteRewardsEnabled && <span className={styles.planBadge} style={{ background:'rgba(90,180,130,.1)', color:'#8ED9A7', borderColor:'rgba(90,180,130,.25)' }}>Vote Manager</span>}
                              {!s._isVip && !s._isBoosted && !s.statusOverride && !s.voteRewardsEnabled && <span style={{ color:'var(--text3)' }}>—</span>}
                            </div>
                          </td>
                          <td>
                            <div style={{ display:'flex', gap:'.3rem', flexWrap:'wrap', alignItems:'center' }}>
                              <button className={styles.btnSm} onClick={() => openEdit(s)}>Редактировать</button>
                              <a href={s.url} target="_blank" rel="noopener" className={styles.btnSm}>Сайт</a>
                              <button className={`${styles.btnSm} ${styles.btnDanger}`} onClick={() => deleteServer(s.id)}>Удалить</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Монетизация */}
            {tab === 'money' && (
              <div className={styles.section} style={{ gap:'1.4rem' }}>
                <div className={styles.sectionTitle}>Продвижение</div>

                {/* «Рекомендуем» — поднятие проекта (без лимита мест) */}
                <div>
                  <div style={{ display:'flex', alignItems:'baseline', gap:'.8rem', flexWrap:'wrap', marginBottom:'.7rem' }}>
                    <h3 style={{ fontFamily:"'Cinzel',serif", fontSize:'.86rem', color:'var(--gold)', margin:0 }}>◆ Рекомендуем</h3>
                    <span style={{ fontSize:'.78rem', color:'var(--text3)' }}>{vipStatus ? `${vipStatus.taken} активн.` : '…'}</span>
                    <select
                      className="input"
                      style={{ fontSize:'.76rem', padding:'.3rem .5rem', marginLeft:'auto', width:'auto' }}
                      defaultValue=""
                      onChange={e => { if (e.target.value) { grantVip(e.target.value); e.target.value = ''; } }}
                    >
                      <option value="">+ Добавить в «Рекомендуем» (31 дн)…</option>
                      {servers
                        .filter((sv: any) => !vipServerIds.has(sv.id))
                        .map((sv: any) => <option key={sv.id} value={sv.id}>{sv.name}</option>)}
                    </select>
                  </div>
                  {(vipStatus?.slots.length ?? 0) === 0 ? (
                    <p className={styles.empty}>Пока никого не рекомендуем</p>
                  ) : (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'.7rem' }}>
                      {vipStatus!.slots.map(slot => (
                        <div key={slot.serverId} style={{ background:'var(--bg2)', border:'1px solid var(--gold-d)', borderRadius:3, padding:'.8rem 1rem', display:'flex', flexDirection:'column', gap:'.4rem' }}>
                          <strong style={{ fontSize:'.9rem', color:'var(--text)' }}>{slot.server?.name ?? slot.serverId}</strong>
                          <span style={{ fontSize:'.76rem', color:'var(--text3)' }}>до {new Date(slot.endDate).toLocaleDateString('ru-RU', { day:'numeric', month:'long', year:'numeric' })}</span>
                          <button className={`${styles.btnSm} ${styles.btnDanger}`} style={{ alignSelf:'flex-start' }} onClick={() => revokeVip(slot.serverId)}>Снять</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* «Рекомендуем» в «Скоро открытие» (без лимита мест) */}
                <div>
                  <div style={{ display:'flex', alignItems:'baseline', gap:'.8rem', flexWrap:'wrap', marginBottom:'.7rem' }}>
                    <h3 style={{ fontFamily:"'Cinzel',serif", fontSize:'.86rem', color:'var(--gold)', margin:0 }}>◆ Рекомендуем · Скоро открытие</h3>
                    <span style={{ fontSize:'.78rem', color:'var(--text3)' }}>{soonVipStatus ? `${soonVipStatus.taken} активн.` : '…'}</span>
                    <select
                      className="input"
                      style={{ fontSize:'.76rem', padding:'.3rem .5rem', marginLeft:'auto', width:'auto' }}
                      defaultValue=""
                      onChange={e => { if (e.target.value) { grantSoonVipFromValue(e.target.value); e.target.value = ''; } }}
                    >
                      <option value="">+ Добавить (до открытия)…</option>
                      {soonVipOptions.map(o => (
                        <option key={o.key} value={o.key}>
                          {o.label} · {new Date(o.openedAt).toLocaleDateString('ru-RU')}
                        </option>
                      ))}
                    </select>
                  </div>
                  {(soonVipStatus?.slots.length ?? 0) === 0 ? (
                    <p className={styles.empty}>Пока никого не рекомендуем в «Скоро»</p>
                  ) : (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'.7rem' }}>
                      {soonVipStatus!.slots.map(slot => (
                        <div key={`${slot.serverId}:${slot.instanceId ?? ''}`} style={{ background:'var(--bg2)', border:'1px solid var(--gold-d)', borderRadius:3, padding:'.8rem 1rem', display:'flex', flexDirection:'column', gap:'.4rem' }}>
                          <strong style={{ fontSize:'.9rem', color:'var(--text)' }}>{slot.server?.name ?? slot.serverId}{slot.instanceLabel ? ` · ${slot.instanceLabel}` : ''}</strong>
                          <span style={{ fontSize:'.76rem', color:'var(--text3)' }}>до {new Date(slot.endDate).toLocaleDateString('ru-RU', { day:'numeric', month:'long', year:'numeric' })}</span>
                          <button className={`${styles.btnSm} ${styles.btnDanger}`} style={{ alignSelf:'flex-start' }} onClick={() => revokeSoonVip(slot.serverId, slot.instanceId)}>Снять</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Бусты */}
                <div>
                  <div style={{ display:'flex', alignItems:'baseline', gap:'.8rem', flexWrap:'wrap', marginBottom:'.7rem' }}>
                    <h3 style={{ fontFamily:"'Cinzel',serif", fontSize:'.86rem', color:'#F08C46', margin:0 }}>◆ В фокусе</h3>
                    <span style={{ fontSize:'.78rem', color:'var(--text3)' }}>{boosts.filter(b => new Date(b.endDate) > new Date()).length} активн.</span>
                    <select
                      className="input"
                      style={{ fontSize:'.76rem', padding:'.3rem .5rem', marginLeft:'auto', width:'auto' }}
                      defaultValue=""
                      onChange={e => { if (e.target.value) { grantBoost(e.target.value); e.target.value = ''; } }}
                    >
                      <option value="">+ Добавить в «В фокусе» (7 дн)…</option>
                      {servers
                        .filter((sv: any) => !boostServerIds.has(sv.id))
                        .map((sv: any) => <option key={sv.id} value={sv.id}>{sv.name}</option>)}
                    </select>
                  </div>

                  {boosts.length === 0 ? (
                    <p className={styles.empty}>Активных бустов пока нет</p>
                  ) : (
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead><tr><th>Сервер</th><th>Начался</th><th>До</th><th>Статус</th><th>Действия</th></tr></thead>
                        <tbody>
                          {boosts.map((b: any) => {
                            const active = new Date(b.endDate) > new Date();
                            return (
                              <tr key={b.id}>
                                <td><strong>{b.server?.name ?? b.serverId}</strong></td>
                                <td style={{ fontSize:'.74rem', color:'var(--text3)' }}>{new Date(b.startDate).toLocaleDateString('ru-RU')}</td>
                                <td style={{ fontSize:'.74rem' }}>{new Date(b.endDate).toLocaleDateString('ru-RU', { day:'numeric', month:'long' })}</td>
                                <td>
                                  {active
                                    ? <span className={styles.planBadge} style={{ background:'rgba(240,140,70,.1)', color:'#F08C46', borderColor:'rgba(240,140,70,.25)' }}>◆ в фокусе</span>
                                    : <span style={{ fontSize:'.72rem', color:'var(--text3)' }}>истёк</span>}
                                </td>
                                <td>
                                  {active && <button className={`${styles.btnSm} ${styles.btnDanger}`} onClick={() => revokeBoost(b.serverId)}>Снять</button>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Переходы по кнопке "Жду" */}
            {tab === 'clicks' && (
              <div className={styles.section}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'.8rem', flexWrap:'wrap' }}>
                  <div className={styles.sectionTitle}>Переходы на сайты из «Скоро открытие»</div>
                  <select
                    className="input"
                    style={{ width:'auto', minWidth:150, padding:'.38rem .6rem', fontSize:'.78rem' }}
                    value={clickReportDays}
                    onChange={e => setClickReportDays(Number(e.target.value))}
                  >
                    <option value={7}>7 дней</option>
                    <option value={30}>30 дней</option>
                    <option value={90}>90 дней</option>
                    <option value={365}>365 дней</option>
                  </select>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'.7rem' }}>
                  <div style={{ border:'1px solid var(--border)', background:'var(--bg2)', borderRadius:6, padding:'.8rem' }}>
                    <div style={{ color:'var(--text3)', fontSize:'.72rem', textTransform:'uppercase', letterSpacing:'.08em' }}>Всего переходов</div>
                    <strong style={{ display:'block', marginTop:'.25rem', fontFamily:"'Cinzel',serif", fontSize:'1.35rem', color:'var(--gold)' }}>{clickReport?.total ?? 0}</strong>
                  </div>
                  <div style={{ border:'1px solid var(--border)', background:'var(--bg2)', borderRadius:6, padding:'.8rem' }}>
                    <div style={{ color:'var(--text3)', fontSize:'.72rem', textTransform:'uppercase', letterSpacing:'.08em' }}>Период</div>
                    <strong style={{ display:'block', marginTop:'.25rem', fontFamily:"'Cinzel',serif", fontSize:'1.05rem', color:'var(--text)' }}>{clickReportDays} дней</strong>
                  </div>
                </div>

                {!clickReport || clickReport.items.length === 0 ? (
                  <p className={styles.empty}>Переходов пока нет</p>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead><tr><th>Сервер</th><th>Запуск</th><th>Переходы</th><th>Последний</th><th>Сайт</th></tr></thead>
                      <tbody>
                        {clickReport.items.map(item => (
                          <tr key={item.key}>
                            <td><strong>{item.server?.name ?? item.serverId}</strong></td>
                            <td style={{ fontSize:'.76rem', color:'var(--text2)' }}>
                              {item.server?.label ? `${item.server.label} · ` : ''}{item.server?.chronicle ?? '—'} {item.server?.rates ?? ''}
                            </td>
                            <td><span className={styles.planBadge}>{item.count}</span></td>
                            <td style={{ fontSize:'.74rem', color:'var(--text3)' }}>
                              {item.lastClickAt ? new Date(item.lastClickAt).toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) : '—'}
                            </td>
                            <td>
                              {item.targetUrl
                                ? <a href={item.targetUrl} target="_blank" rel="noopener" className={styles.btnSm}>Открыть</a>
                                : <span style={{ color:'var(--text3)' }}>—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}


            {/* Баннеры (реклама) */}
            {tab === 'banners' && (
              <div className={styles.section} style={{ gap:'1.2rem' }}>
                <div className={styles.sectionTitle}>Рекламные баннеры</div>
                <p style={{ fontSize:'.82rem', color:'var(--text3)', margin:0 }}>
                  Показываются справа сверху на всех страницах (слоты 1 и 2). Продаются вручную через Telegram —
                  здесь только создаёшь/правишь. Пометка «Реклама» ставится автоматически.
                </p>

                {/* Форма создания/редактирования */}
                <div style={{ display:'grid', gap:'.7rem', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:6, padding:'1rem' }}>
                  <strong style={{ color:'var(--gold)', fontSize:'.86rem' }}>{bannerForm.id ? 'Редактировать баннер' : 'Новый баннер'}</strong>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'.6rem' }}>
                    <label className={styles.field}><span>Слот</span>
                      <select className="input" value={bannerForm.slot} onChange={e => setBannerForm((p:any)=>({...p,slot:Number(e.target.value)}))}>
                        <option value={1}>Слот 1 (верхний)</option>
                        <option value={2}>Слот 2</option>
                      </select>
                    </label>
                    <label className={styles.field}><span>Заголовок *</span>
                      <input className="input" value={bannerForm.title} onChange={e => setBannerForm((p:any)=>({...p,title:e.target.value}))} placeholder="Asgard x50 — открытие 20 июня" />
                    </label>
                    <label className={styles.field}><span>Подзаголовок</span>
                      <input className="input" value={bannerForm.subtitle} onChange={e => setBannerForm((p:any)=>({...p,subtitle:e.target.value}))} placeholder="Interlude · без p2w" />
                    </label>
                    <label className={styles.field}><span>Ссылка (куда ведёт) *</span>
                      <input className="input" value={bannerForm.href} onChange={e => setBannerForm((p:any)=>({...p,href:e.target.value}))} placeholder="https://asgard.ru" />
                    </label>
                    <label className={styles.field}><span>Рекламодатель (для маркировки)</span>
                      <input className="input" value={bannerForm.advertiser} onChange={e => setBannerForm((p:any)=>({...p,advertiser:e.target.value}))} placeholder="ИП / ИНН / название" />
                    </label>
                    <label className={styles.field}><span>erid (если есть)</span>
                      <input className="input" value={bannerForm.erid} onChange={e => setBannerForm((p:any)=>({...p,erid:e.target.value}))} placeholder="токен ОРД (пока можно пусто)" />
                    </label>
                    <label className={styles.field}><span>Крутить до (дата, опц.)</span>
                      <input className="input" type="date" value={bannerForm.endDate} onChange={e => setBannerForm((p:any)=>({...p,endDate:e.target.value}))} />
                    </label>
                    <label className={styles.field} style={{ flexDirection:'row', alignItems:'center', gap:'.5rem' }}>
                      <input type="checkbox" checked={bannerForm.active} onChange={e => setBannerForm((p:any)=>({...p,active:e.target.checked}))} />
                      <span>Активен</span>
                    </label>
                  </div>
                  <ImageUpload label="Картинка баннера (опц.)" value={bannerForm.image} type="icon" token={token!} onChange={url => setBannerForm((p:any)=>({...p,image:url}))} />
                  <div style={{ display:'flex', gap:'.5rem' }}>
                    <button className="btn-gold" type="button" onClick={saveBanner}>{bannerForm.id ? 'Сохранить' : 'Создать баннер'}</button>
                    {bannerForm.id && <button className={styles.btnSm} type="button" onClick={() => setBannerForm(emptyBanner)}>Отмена</button>}
                  </div>
                </div>

                {/* Список баннеров */}
                {banners.length === 0 ? <p className={styles.empty}>Баннеров пока нет</p> : (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'.7rem' }}>
                    {banners.map((b:any) => (
                      <div key={b.id} style={{ background:'var(--bg2)', border:`1px solid ${b.active ? 'var(--gold-d)' : 'var(--border)'}`, borderRadius:6, padding:'.8rem', display:'flex', flexDirection:'column', gap:'.35rem' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'.5rem' }}>
                          <span style={{ fontSize:'.6rem', color:'var(--gold-d)', textTransform:'uppercase', letterSpacing:'.1em' }}>Слот {b.slot}</span>
                          {!b.active && <span style={{ fontSize:'.62rem', color:'#CC6060' }}>выключен</span>}
                          <span style={{ marginLeft:'auto', fontSize:'.66rem', color:'var(--text3)' }}>{b.clicks} клик.</span>
                        </div>
                        <strong style={{ color:'var(--text)', fontSize:'.88rem' }}>{b.title}</strong>
                        {b.subtitle && <span style={{ fontSize:'.76rem', color:'var(--text3)' }}>{b.subtitle}</span>}
                        <a href={b.href} target="_blank" rel="noopener" style={{ fontSize:'.72rem', color:'var(--gold)', wordBreak:'break-all' }}>{b.href}</a>
                        {b.endDate && <span style={{ fontSize:'.7rem', color:'var(--text3)' }}>до {new Date(b.endDate).toLocaleDateString('ru-RU')}</span>}
                        <div style={{ display:'flex', gap:'.4rem', marginTop:'.3rem' }}>
                          <button className={styles.btnSm} type="button" onClick={() => setBannerForm({ id:b.id, slot:b.slot, title:b.title, subtitle:b.subtitle??'', image:b.image??'', href:b.href, advertiser:b.advertiser??'', erid:b.erid??'', endDate:b.endDate?b.endDate.slice(0,10):'', active:b.active })}>Править</button>
                          <button className={`${styles.btnSm} ${styles.btnDanger}`} type="button" onClick={() => deleteBanner(b.id)}>Удалить</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Добавить сервер */}
            {tab === 'add' && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Добавить сервер вручную</div>
                <form className={styles.addForm} onSubmit={submitAdd}>
                  <section className={styles.textImport}>
                    <div className={styles.textImportHeader}>
                      <div>
                        <h3>Вставить сервер текстом</h3>
                        <p>Вставьте готовый блок: поля перенесутся в обычную форму. Картинки можно загрузить ниже через иконку и баннер.</p>
                      </div>
                      <button type="button" className={styles.trafficAddButton} onClick={() => setTextImportOpen(value => !value)}>
                        {textImportOpen ? 'Скрыть' : 'Открыть'}
                      </button>
                    </div>
                    {textImportOpen && (
                      <>
                        <textarea
                          className={`input ${styles.textImportTextarea}`}
                          rows={11}
                          value={serverTextDraft}
                          onChange={e => setServerTextDraft(e.target.value)}
                          placeholder={[
                            'id: destarion',
                            'Название: Destarion',
                            'Сайт: https://destarion.com',
                            'Хроника: High Five',
                            'Рейты: x300',
                            'Тип: PvP',
                            'Дата: 5 июня 2026 20:00',
                            'Кратко: Новый High Five сервер с PvP и живым стартом.',
                            'Миры:',
                            '- Summer PvP | High Five | x300 | PvP | 05.06.2026 20:00 | https://destarion.com',
                          ].join('\n')}
                        />
                        <div className={styles.textImportActions}>
                          <button type="button" className={styles.trafficSaveButton} onClick={applyServerTextImport}>
                            Разобрать и заполнить
                          </button>
                          <button type="button" className={styles.btnSm} onClick={() => { setServerTextDraft(''); setServerTextResult(''); }}>
                            Очистить
                          </button>
                          <span>Если время не указано, парсер поставит 20:00.</span>
                        </div>
                        {serverTextResult && <div className={styles.textImportResult}>{serverTextResult}</div>}
                      </>
                    )}
                  </section>

                  <div className={styles.formGrid}>
                    {/* Строка 1 */}
                    <AField label="ID *"><input className="input" required value={addForm.id} onChange={e => setAddForm(p => ({...p,id:e.target.value}))} placeholder="l2fantasy" /></AField>
                    <AField label="Название *"><input className="input" required value={addForm.name} onChange={e => setAddForm(p => ({...p,name:e.target.value}))} placeholder="L2Fantasy" /></AField>
                    <AField label="Аббревиатура"><input className="input" value={addForm.abbr} maxLength={3} onChange={e => setAddForm(p => ({...p,abbr:e.target.value}))} placeholder="LF" /></AField>
                    {/* Строка 2 — скрыта если у проекта есть instances (теги из них) */}
                    {(addForm.instances?.length ?? 0) === 0 && (
                      <>
                        <AField label="Хроника *">
                          <select className="input" value={addForm.chronicle} onChange={e => setAddForm(p => ({...p,chronicle:e.target.value}))}>
                            {CHRONICLES.map(c => <option key={c}>{c}</option>)}
                          </select>
                        </AField>
                        <AField label="Рейты *"><input className="input" required value={addForm.rates} onChange={e => setAddForm(p => ({...p,rates:e.target.value}))} placeholder="x100" /></AField>
                        <AField label="Рейт (число)"><input className="input" type="number" min={1} value={addForm.rateNum} onChange={e => setAddForm(p => ({...p,rateNum:e.target.value}))} /></AField>
                        <AField label="Тип сервера">
                          <select className="input" value={addForm.serverType} onChange={e => setAddForm(p => ({...p,serverType:e.target.value}))}>
                            {SERVER_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                          </select>
                        </AField>
                      </>
                    )}
                    {/* Строка 3 */}
                    <AField label="Сайт *"><input className="input" required type="url" value={addForm.url} onChange={e => setAddForm(p => ({...p,url:e.target.value}))} placeholder="https://…" /></AField>
                    <AField label="Дата и время открытия"><input className="input" type="datetime-local" value={addForm.openedDate} onChange={e => setAddForm(p => ({...p,openedDate:e.target.value}))} /></AField>
                    <AField label="Языки">
                      <input
                        className="input"
                        value={addForm.country}
                        onChange={e => setAddForm(p => ({...p,country:e.target.value}))}
                        placeholder="🇷🇺 🇺🇦 🇪🇺 или RU EU"
                      />
                    </AField>
                    <AField label="Ручной статус">
                      <select className="input" value={addForm.statusOverride} onChange={e => setAddForm(p => ({...p,statusOverride:e.target.value}))}>
                        <option value="auto">Авто мониторинг</option>
                        <option value="online">Всегда работает</option>
                        <option value="offline">Не работает</option>
                        <option value="unknown">Неизвестно</option>
                      </select>
                    </AField>
                    <AField label="Дата ручной проверки">
                      <input className="input" type="date" value={addForm.manualCheckAt} onChange={e => setAddForm(p => ({...p,manualCheckAt:e.target.value}))} />
                    </AField>
                    <AField label="Доверие">
                      <select className="input" value={addForm.trustLevel} onChange={e => setAddForm(p => ({...p,trustLevel:e.target.value}))}>
                        <option value="">Не указано</option>
                        <option value="A">A — проверено хорошо</option>
                        <option value="B">B — есть мелкие вопросы</option>
                        <option value="C">C — доверие низкое</option>
                      </select>
                    </AField>
                    <AField label="Активность">
                      <select className="input" value={addForm.activityLevel} onChange={e => setAddForm(p => ({...p,activityLevel:e.target.value}))}>
                        <option value="unknown">Не указана</option>
                        <option value="high">Высокая</option>
                        <option value="medium">Средняя</option>
                        <option value="low">Низкая</option>
                        <option value="very_low">Очень низкая</option>
                      </select>
                    </AField>
                    <AField label="Vote Manager">
                      <label style={{ display:'flex', alignItems:'center', gap:'.5rem', minHeight:38, color:'var(--text2)', fontSize:'.84rem' }}>
                        <input type="checkbox" checked={!!addForm.voteRewardsEnabled} onChange={e => setAddForm(p => ({...p,voteRewardsEnabled:e.target.checked}))} />
                        Бонусы за голос подключены
                      </label>
                    </AField>
                    {/* Строка 4 */}
                    <ImageUpload label="Иконка" value={addForm.icon} type="icon" token={token!} onChange={url => setAddForm(p => ({...p,icon:url}))} />
                    <ImageUpload label="Баннер" value={addForm.banner} type="banner" token={token!} onChange={url => setAddForm(p => ({...p,banner:url}))} />
                    {/* Строка 5 */}
                    <AField label="Telegram"><input className="input" type="url" value={addForm.telegram} onChange={e => setAddForm(p => ({...p,telegram:e.target.value}))} placeholder="https://t.me/…" /></AField>
                    <AField label="Discord"><input className="input" type="url" value={addForm.discord} onChange={e => setAddForm(p => ({...p,discord:e.target.value}))} placeholder="https://discord.gg/…" /></AField>
                    <AField label="ВКонтакте"><input className="input" type="url" value={addForm.vk} onChange={e => setAddForm(p => ({...p,vk:e.target.value}))} placeholder="https://vk.com/…" /></AField>
                  </div>

                  <TrafficEditorV2
                    projectUrl={addForm.url}
                    entries={addForm.trafficHistory}
                    onChange={(trafficHistory) => setAddForm(p => ({ ...p, trafficHistory }))}
                  />

                  <AField label="Краткое описание">
                    <input className="input" value={addForm.shortDesc} onChange={e => setAddForm(p => ({...p,shortDesc:e.target.value}))} placeholder="Одна строка для карточки" />
                  </AField>
                  <AField label="Полное описание">
                    <textarea className="input" rows={6} value={addForm.fullDesc} onChange={e => setAddForm(p => ({...p,fullDesc:e.target.value}))} placeholder="## Заголовок&#10;- пункт 1&#10;- пункт 2" style={{ resize:'vertical' }} />
                  </AField>

                  <InstancesEditor
                    value={addForm.instances ?? []}
                    onChange={v => setAddForm(p => ({ ...p, instances: v }))}
                  />

                  <button className="btn-primary" type="submit" style={{ alignSelf:'flex-start', padding:'.5rem 1.6rem' }}>
                    ✅ Добавить сервер
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'.25rem' }}>
      <label style={{ fontFamily:"'Cinzel',serif", fontSize:'.58rem', color:'var(--text2)', textTransform:'uppercase', letterSpacing:'.12em' }}>{label}</label>
      {children}
    </div>
  );
}

function TrafficEditor({
  projectUrl,
  entries,
  onChange,
}: {
  projectUrl?: string;
  entries: TrafficDraft[];
  onChange: (entries: TrafficDraft[]) => void;
}) {
  const reportUrl = similarwebUrl(projectUrl);
  const addEntry = () => {
    const used = new Set(entries.map(entry => entry.period));
    let period = lastCompleteMonth();
    while (used.has(period)) period = previousMonth(period);
    onChange([{ period, monthly: '', source: 'similarweb' }, ...entries]);
  };
  const updateEntry = (index: number, patch: Partial<TrafficDraft>) => {
    onChange(entries.map((entry, current) => current === index ? { ...entry, ...patch } : entry));
  };
  const removeEntry = (index: number) => onChange(entries.filter((_, current) => current !== index));
  return (
    <section className={styles.trafficEditor}>
      <div className={styles.trafficEditorHeader}>
        <div>
          <h3>Посещаемость сайта</h3>
          <p>Добавь месяцы и значения <b>Total Visits</b> из отчёта. Всё сохранится вместе с проектом одной кнопкой.</p>
        </div>
        <div className={styles.trafficEditorActions}>
          {reportUrl ? (
            <a className={styles.trafficReportLink} href={reportUrl} target="_blank" rel="noopener noreferrer">
              Открыть Similarweb <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <span className={styles.trafficReportDisabled}>Сначала укажи сайт</span>
          )}
          <button className={styles.trafficAddButton} type="button" onClick={addEntry}>+ Месяц</button>
        </div>
      </div>
      {entries.length === 0 ? (
        <div className={styles.trafficEmpty}>Пока нет внесённых месяцев</div>
      ) : (
        <div className={styles.trafficMonths}>
          {entries.map((entry, index) => (
            <div className={styles.trafficMonthRow} key={`${entry.period}-${index}`}>
              <input className="input" aria-label="Месяц отчёта" type="month" value={entry.period} onChange={e => updateEntry(index, { period: e.target.value })} />
              <input className="input" aria-label="Визиты за месяц" type="number" min={0} value={entry.monthly} onChange={e => updateEntry(index, { monthly: e.target.value })} placeholder="68500" />
              <select className="input" aria-label="Источник трафика" value={entry.source} onChange={e => updateEntry(index, { source: e.target.value })}>
                <option value="similarweb">Similarweb</option>
                <option value="pr-cy">PR-CY</option>
                <option value="semrush">Semrush</option>
                <option value="be1">Be1</option>
                <option value="owner">Данные владельца</option>
              </select>
              <button type="button" className={styles.trafficRemoveButton} onClick={() => removeEntry(index)} aria-label="Удалить месяц">×</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TrafficEditorV2({
  serverId,
  token,
  projectUrl,
  entries,
  onChange,
  onPersisted,
}: {
  serverId?: string;
  token?: string | null;
  projectUrl?: string;
  entries: TrafficDraft[];
  onChange: (entries: TrafficDraft[]) => void;
  onPersisted?: (serverPatch: any) => void;
}) {
  const reportUrl = similarwebUrl(projectUrl);
  const [draft, setDraft] = React.useState<TrafficDraft>({ period: lastCompleteMonth(), monthly: '', source: 'similarweb' });
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const sortedEntries = [...entries].sort((left, right) => right.period.localeCompare(left.period));
  const selectedEntry = sortedEntries.find(entry => entry.period === draft.period);

  React.useEffect(() => {
    if (selectedEntry) {
      setDraft(prev => ({ ...prev, monthly: selectedEntry.monthly, source: selectedEntry.source || 'similarweb' }));
    } else {
      setDraft(prev => prev.monthly === '' ? prev : { ...prev, monthly: '' });
    }
  }, [draft.period, selectedEntry?.period, selectedEntry?.monthly, selectedEntry?.source]);

  const upsertLocal = (entry: TrafficDraft) => {
    const next = [
      entry,
      ...entries.filter(item => item.period !== entry.period),
    ].sort((left, right) => right.period.localeCompare(left.period));
    onChange(next);
  };

  const saveEntry = async () => {
    const monthly = Number(draft.monthly);
    if (!draft.period || !Number.isFinite(monthly) || monthly < 0) {
      setMessage('Укажи месяц и посещения');
      return;
    }

    const entry = { period: draft.period, monthly: String(Math.round(monthly)), source: draft.source || 'similarweb' };
    if (!serverId) {
      upsertLocal(entry);
      setMessage('Месяц добавлен к новому проекту');
      return;
    }
    if (!token) {
      setMessage('Нужно войти админом');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      const patch = await api.servers.saveTrafficSnapshot(serverId, { ...entry, monthly: Number(entry.monthly) }, token);
      onPersisted?.(patch);
      onChange(trafficDrafts(patch));
      setDraft(prev => ({ ...prev, period: previousMonth(prev.period), monthly: '' }));
      setMessage('Сохранено в базу');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const removeEntry = async (entry: TrafficDraft) => {
    if (!confirm(`Удалить трафик за ${entry.period}?`)) return;
    if (!serverId) {
      onChange(entries.filter(item => item.period !== entry.period));
      return;
    }
    if (!token) {
      setMessage('Нужно войти админом');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const patch = await api.servers.deleteTrafficSnapshot(serverId, entry.period, token);
      onPersisted?.(patch);
      onChange(trafficDrafts(patch));
      setMessage('Месяц удален');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось удалить');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.trafficEditor}>
      <div className={styles.trafficEditorHeader}>
        <div>
          <h3>Посещаемость сайта</h3>
          <p>{serverId ? 'Месяц сохраняется сразу в базу, отдельно от общей формы проекта.' : 'Для нового проекта месяцы сохранятся после создания проекта.'}</p>
        </div>
        <div className={styles.trafficEditorActions}>
          {reportUrl ? (
            <a className={styles.trafficReportLink} href={reportUrl} target="_blank" rel="noopener noreferrer">
              Открыть Similarweb <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <span className={styles.trafficReportDisabled}>Сначала укажи сайт</span>
          )}
        </div>
      </div>

      <div className={styles.trafficQuickRow}>
        <input className="input" aria-label="Месяц отчета" type="month" value={draft.period} onChange={e => setDraft(prev => ({ ...prev, period: e.target.value }))} />
        <input className="input" aria-label="Визиты за месяц" type="number" min={0} value={draft.monthly} onChange={e => setDraft(prev => ({ ...prev, monthly: e.target.value }))} placeholder="68500" />
        <select className="input" aria-label="Источник трафика" value={draft.source} onChange={e => setDraft(prev => ({ ...prev, source: e.target.value }))}>
          <option value="similarweb">Similarweb</option>
          <option value="pr-cy">PR-CY</option>
          <option value="semrush">Semrush</option>
          <option value="be1">Be1</option>
          <option value="owner">Данные владельца</option>
        </select>
        <button className={styles.trafficSaveButton} type="button" onClick={saveEntry} disabled={saving}>
          {saving ? 'Сохранение...' : selectedEntry ? 'Обновить месяц' : 'Сохранить месяц'}
        </button>
      </div>
      {message && <div className={styles.trafficStatus}>{message}</div>}

      {sortedEntries.length === 0 ? (
        <div className={styles.trafficEmpty}>Пока нет сохраненных месяцев</div>
      ) : (
        <div className={styles.trafficSavedSummary}>
          <span><b>{sortedEntries.length}</b> мес. в базе</span>
          {sortedEntries[0] && (
            <span>Последний: {sortedEntries[0].period} · {Number(sortedEntries[0].monthly).toLocaleString('ru-RU')}</span>
          )}
          <select
            className="input"
            aria-label="Выбрать сохраненный месяц"
            value={selectedEntry?.period ?? ''}
            onChange={e => {
              const entry = sortedEntries.find(item => item.period === e.target.value);
              if (entry) setDraft({ ...entry, source: entry.source || 'similarweb' });
            }}
          >
            <option value="">Выбрать месяц</option>
            {sortedEntries.map(entry => (
              <option key={entry.period} value={entry.period}>
                {entry.period} · {Number(entry.monthly).toLocaleString('ru-RU')}
              </option>
            ))}
          </select>
          {selectedEntry && (
            <button type="button" className={styles.trafficRemoveButton} onClick={() => removeEntry(selectedEntry)} aria-label="Удалить выбранный месяц">×</button>
          )}
        </div>
      )}
    </section>
  );
}
