'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { ImageUpload } from '@/components/ImageUpload';
import { InstancesEditor } from '@/components/InstancesEditor';
import type { VipStatus } from '@/lib/types';
import { VIP_MAX, SOON_VIP_MAX, CHRONICLES } from '@/lib/types';
import styles from './page.module.css';

type AdminTab = 'servers' | 'reviews' | 'requests' | 'money' | 'add';

function slugify(s: string) {
  return s.toLowerCase()
    .replace(/[^a-z0-9\-\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40) || 'server-' + Math.random().toString(36).slice(2, 8);
}

function requestStatusInfo(r: any) {
  if (r.status === 'approved') return { label: 'Одобрена', color: '#4AAA70' };
  if (r.status === 'rejected') return { label: 'Отклонена', color: '#CC6060' };
  if (r.status === 'pending_payment') return { label: 'Ожидает оплаты', color: '#D18A3D' };
  return { label: 'На модерации', color: 'var(--gold-d)' };
}

function requestPaymentInfo(r: any) {
  if (r.paid) return { label: 'Оплачено', className: `${styles.paymentBadge} ${styles.paymentPaid}` };
  if (r.status === 'pending_payment') return { label: 'Оплата не завершена', className: `${styles.paymentBadge} ${styles.paymentWaiting}` };
  return { label: 'Бесплатная заявка', className: `${styles.paymentBadge} ${styles.paymentFree}` };
}

function soonVipKey(serverId: string, instanceId?: string | null) {
  return `${serverId}::${instanceId ?? ''}`;
}

function futureOpenings(servers: any[]) {
  const now = Date.now();
  const result: Array<{ key: string; serverId: string; instanceId?: string | null; label: string; openedAt: string }> = [];
  for (const s of servers) {
    const insts = Array.isArray(s.instances) ? s.instances : [];
    const futureInsts = insts.filter((i: any) => i?.openedDate && new Date(i.openedDate).getTime() > now);
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
    } else if (s.openedDate && new Date(s.openedDate).getTime() > now) {
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

export default function AdminPage() {
  const { user, token, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab]         = useState<AdminTab>('servers');
  const [servers, setServers]     = useState<any[]>([]);
  const [reviews, setReviews]     = useState<any[]>([]);
  const [vipStatus, setVipStatus] = useState<VipStatus | null>(null);
  const [soonVipStatus, setSoonVipStatus] = useState<VipStatus | null>(null);
  const [boosts, setBoosts]       = useState<any[]>([]);
  const [requests, setRequests]   = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [toast, setToast]         = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Модал редактирования
  const [editServer, setEditServer] = useState<any | null>(null);
  const [editForm, setEditForm]   = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);

  // Форма добавления
  const [addForm, setAddForm] = useState({
    id:'', name:'', abbr:'', chronicle:'Interlude', rates:'', rateNum:'1',
    url:'', openedDate:'', country:'RU', statusOverride: 'auto',
    type_new: false, type_featured: false, vip: false,
    icon:'', banner:'', telegram:'', discord:'', vk:'',
    shortDesc:'', fullDesc:'',
    instances: [] as any[],
  });

  useEffect(() => {
    if (!loading && !isAdmin) router.replace('/');
  }, [loading, isAdmin, router]);

  useEffect(() => {
    if (!token || !isAdmin) return;
    loadTab(tab);
  }, [tab, token, isAdmin]);

  async function loadTab(t: AdminTab) {
    if (!token) return;
    setDataLoading(true);
    try {
      if (t === 'servers')  { const r = await api.servers.list({ limit: '200' }); setServers(r.data); }
      if (t === 'reviews')  setReviews(await api.reviews.pending(token));
      if (t === 'requests') setRequests(await api.servers.getRequests(token));
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

  async function deleteServer(id: string) {
    if (!token || !confirm(`Удалить сервер ${id}?`)) return;
    try { await api.servers.delete(id, token); showToast('Удалено'); loadTab('servers'); }
    catch (e: any) { showToast(e.message); }
  }

  async function approveReview(id: string) {
    if (!token) return;
    try { await api.reviews.approve(id, token); showToast('Отзыв одобрен'); loadTab('reviews'); }
    catch (e: any) { showToast(e.message); }
  }

  async function rejectReview(id: string) {
    if (!token) return;
    try { await api.reviews.delete(id, token); showToast('Отзыв удалён'); loadTab('reviews'); }
    catch (e: any) { showToast(e.message); }
  }

  async function recalcAllRatings() {
    if (!token) return;
    if (!confirm('Пересчитать рейтинги всех серверов? Исправит залипшие счётчики отзывов после удаления аккаунтов.')) return;
    try {
      const res = await api.reviews.recalcAll(token);
      showToast(`Пересчитано: ${res.recalculated} серверов`);
    } catch (e: any) { showToast(e.message); }
  }

  async function approveRequest(r: any) {
    if (r.status === 'pending_payment') {
      showToast('Эта заявка еще не оплачена. Одобрение станет доступно после webhook от ЮКассы.');
      return;
    }
    setAddForm({
      id:          slugify(r.name),
      name:        r.name,
      abbr:        r.name.slice(0, 3).toUpperCase(),
      chronicle:   r.chronicle || 'Interlude',
      rates:       r.rates,
      rateNum:     String((r.rates?.match(/\d+/) ?? ['1'])[0]),
      url:         r.url,
      openedDate:  r.openedDate ? r.openedDate.slice(0, 10) : '',
      country:     'RU',
      statusOverride: 'auto',
      type_new: false, type_featured: false, vip: false,
      icon:'', banner:'', telegram:'', discord:'', vk:'',
      shortDesc:'', fullDesc:'',
      instances: [],
    });
    setApprovingId(r.id);
    setTab('add');
    showToast('Заполните детали и сохраните — заявка пометится одобренной');
  }

  async function rejectRequest(id: string) {
    if (!token || !confirm('Отклонить заявку?')) return;
    try { await api.servers.updateRequest(id, 'rejected', token); showToast('Заявка отклонена'); loadTab('requests'); }
    catch (e: any) { showToast(e.message); }
  }

  async function deleteRequest(id: string) {
    if (!token || !confirm('Удалить заявку навсегда?')) return;
    try { await api.servers.deleteRequest(id, token); showToast('Заявка удалена'); loadTab('requests'); }
    catch (e: any) { showToast(e.message); }
  }

  async function grantVip(serverId: string) {
    if (!token) return;
    try { await api.payments.grantVip(serverId, token); showToast('◆ VIP выдан'); loadTab(tab); }
    catch (e: any) { showToast(e.message); }
  }
  async function revokeVip(serverId: string) {
    if (!token || !confirm('Снять VIP с этого сервера?')) return;
    try { await api.payments.revokeVip(serverId, token); showToast('VIP снят'); loadTab(tab); }
    catch (e: any) { showToast(e.message); }
  }
  async function grantSoonVipFromValue(value: string) {
    if (!token) return;
    const [serverId, instanceId = ''] = value.split('::');
    try {
      await api.payments.grantSoonVip(serverId, instanceId || null, token);
      showToast('◆ VIP Скоро выдан');
      loadTab(tab);
    } catch (e: any) {
      showToast(e.message);
    }
  }
  async function revokeSoonVip(serverId: string, instanceId?: string | null) {
    if (!token || !confirm('Снять VIP Скоро с этого запуска?')) return;
    try {
      await api.payments.revokeSoonVip(serverId, instanceId, token);
      showToast('VIP Скоро снят');
      loadTab(tab);
    } catch (e: any) {
      showToast(e.message);
    }
  }
  async function grantBoost(serverId: string) {
    if (!token) return;
    try { await api.payments.grantBoost(serverId, token); showToast('🔥 Буст выдан'); loadTab(tab); }
    catch (e: any) { showToast(e.message); }
  }
  async function revokeBoost(serverId: string) {
    if (!token || !confirm('Снять буст с этого сервера?')) return;
    try { await api.payments.revokeBoost(serverId, token); showToast('Буст снят'); loadTab(tab); }
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
      openedDate:  s.openedDate  ? s.openedDate.slice(0, 10) : '',
      country:     s.country     ?? 'RU',
      statusOverride: s.statusOverride ?? 'auto',
      type_new:    s.type?.includes('new')      ?? false,
      type_featured: s.type?.includes('featured') ?? false,
      icon:        s.icon        ?? '',
      banner:      s.banner      ?? '',
      telegram:    s.telegram    ?? '',
      discord:     s.discord     ?? '',
      vk:          s.vk          ?? '',
      shortDesc:   s.shortDesc   ?? '',
      fullDesc:    s.fullDesc    ?? '',
      instances:   Array.isArray(s.instances) ? s.instances : [],
    });
  }

  async function submitEdit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!token || !editServer) return;
    setEditLoading(true);
    const types: string[] = [];
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
        openedDate:  editForm.openedDate || undefined,
        country:     editForm.country,
        statusOverride: editForm.statusOverride === 'auto' ? null : editForm.statusOverride,
        type:        types,
        icon:        editForm.icon || undefined,
        banner:      editForm.banner || undefined,
        telegram:    editForm.telegram || undefined,
        discord:     editForm.discord || undefined,
        vk:          editForm.vk || undefined,
        shortDesc:   editForm.shortDesc,
        fullDesc:    editForm.fullDesc,
        instances:   editForm.instances ?? [],
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
        openedDate: addForm.openedDate || undefined, country: addForm.country,
        statusOverride: addForm.statusOverride === 'auto' ? null : addForm.statusOverride,
        icon: addForm.icon || undefined, banner: addForm.banner || undefined,
        telegram: addForm.telegram || undefined, discord: addForm.discord || undefined, vk: addForm.vk || undefined,
        shortDesc: addForm.shortDesc, fullDesc: addForm.fullDesc,
        instances: addForm.instances ?? [],
      } as any, token);
      if (approvingId) {
        try { await api.servers.updateRequest(approvingId, 'approved', token); } catch {}
        setApprovingId(null);
      }
      showToast(`✅ Сервер ${addForm.name} добавлен!`);
      setTab('servers');
    } catch (e: any) { showToast(`❌ ${e.message}`); }
  }

  if (loading || !isAdmin) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', gap:'.6rem', color:'var(--text3)' }}>
      <span className="spin" /> Загрузка...
    </div>
  );

  const pendingRequests = requests.filter(r => r.status === 'pending').length;
  const TABS: { k: AdminTab; l: string }[] = [
    { k: 'servers',  l: `Серверы (${servers.length})` },
    { k: 'reviews',  l: `Отзывы (${reviews.length})` },
    { k: 'requests', l: `Заявки${pendingRequests ? ` (${pendingRequests})` : ''}` },
    { k: 'money',    l: `Монетизация${vipStatus ? ` (${vipStatus.taken}/${vipStatus.max})` : ''}` },
    { k: 'add',      l: approvingId ? '+ Заявка → сервер' : '+ Добавить сервер' },
  ];

  const sodServer = servers.find((s: any) => s._isSod);
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
                  </>
                )}
                <AField label="Сайт *"><input className="input" required type="url" value={editForm.url} onChange={e => setEditForm((p:any) => ({...p,url:e.target.value}))} /></AField>
                <AField label="Дата открытия"><input className="input" type="date" value={editForm.openedDate} onChange={e => setEditForm((p:any) => ({...p,openedDate:e.target.value}))} /></AField>
                <AField label="Страна">
                  <select className="input" value={editForm.country} onChange={e => setEditForm((p:any) => ({...p,country:e.target.value}))}>
                    {['RU','EU','US','DE','PL','BY','UA'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </AField>
                <AField label="Ручной статус">
                  <select className="input" value={editForm.statusOverride} onChange={e => setEditForm((p:any) => ({...p,statusOverride:e.target.value}))}>
                    <option value="auto">Авто мониторинг</option>
                    <option value="online">Всегда online</option>
                    <option value="offline">Всегда offline</option>
                    <option value="unknown">Неизвестно</option>
                  </select>
                </AField>
                <ImageUpload label="Иконка" value={editForm.icon} type="icon" token={token!} onChange={url => setEditForm((p:any) => ({...p,icon:url}))} />
                <ImageUpload label="Баннер" value={editForm.banner} type="banner" token={token!} onChange={url => setEditForm((p:any) => ({...p,banner:url}))} />
                <AField label="Telegram"><input className="input" type="url" value={editForm.telegram} onChange={e => setEditForm((p:any) => ({...p,telegram:e.target.value}))} placeholder="https://t.me/…" /></AField>
                <AField label="Discord"><input className="input" type="url" value={editForm.discord} onChange={e => setEditForm((p:any) => ({...p,discord:e.target.value}))} placeholder="https://discord.gg/…" /></AField>
                <AField label="ВКонтакте"><input className="input" type="url" value={editForm.vk} onChange={e => setEditForm((p:any) => ({...p,vk:e.target.value}))} placeholder="https://vk.com/…" /></AField>
              </div>

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
                          <td><strong>{s.name}</strong>{s._isSod && <span title="Сервер недели" style={{ marginLeft:'.35rem', color:'#5AB482' }}>★</span>}</td>
                          <td>{s.chronicle}</td>
                          <td>{s.rates}</td>
                          <td style={{ fontSize:'.72rem' }}>
                            <div style={{ display:'flex', flexDirection:'column', gap:'.15rem' }}>
                              {s._isVip && <span className={styles.planBadge}>◆ VIP{s.subscription?.endDate ? ` · до ${new Date(s.subscription.endDate).toLocaleDateString('ru-RU')}` : ''}</span>}
                              {s._isBoosted && <span className={styles.planBadge} style={{ background:'rgba(240,140,70,.1)', color:'#F08C46', borderColor:'rgba(240,140,70,.25)' }}>🔥 Буст{s._boostEnd ? ` · до ${new Date(s._boostEnd).toLocaleDateString('ru-RU')}` : ''}</span>}
                              {s.statusOverride && <span className={styles.planBadge} style={{ background:'rgba(90,180,130,.1)', color:'#5AB482', borderColor:'rgba(90,180,130,.25)' }}>Статус: {s.statusOverride}</span>}
                              {!s._isVip && !s._isBoosted && !s.statusOverride && <span style={{ color:'var(--text3)' }}>—</span>}
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
                <div className={styles.sectionTitle}>Монетизация</div>

                {sodServer && (
                  <div style={{ background:'var(--bg2)', border:'1px solid rgba(90,180,130,.35)', borderRadius:3, padding:'.8rem 1rem', display:'flex', alignItems:'center', gap:'.8rem', flexWrap:'wrap' }}>
                    <span style={{ fontFamily:"'Cinzel',serif", fontSize:'.6rem', color:'#5AB482', textTransform:'uppercase', letterSpacing:'.14em' }}>★ Сервер недели</span>
                    <strong style={{ color:'var(--text)' }}>{sodServer.name}</strong>
                    <span style={{ fontSize:'.76rem', color:'var(--text3)' }}>({sodServer.chronicle} · {sodServer.rates})</span>
                  </div>
                )}

                {/* VIP слоты */}
                <div>
                  <div style={{ display:'flex', alignItems:'baseline', gap:'.8rem', flexWrap:'wrap', marginBottom:'.7rem' }}>
                    <h3 style={{ fontFamily:"'Cinzel',serif", fontSize:'.86rem', color:'var(--gold)', margin:0 }}>◆ VIP слоты</h3>
                    <span style={{ fontSize:'.78rem', color:'var(--text3)' }}>
                      {vipStatus ? `${vipStatus.taken} из ${vipStatus.max}` : '…'}
                      {vipStatus?.nextFreeAt && vipStatus.taken >= vipStatus.max && ` · ближайшее освободится ${new Date(vipStatus.nextFreeAt).toLocaleDateString('ru-RU')}`}
                    </span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'.7rem' }}>
                    {Array.from({ length: VIP_MAX }).map((_, i) => {
                      const slot = vipStatus?.slots[i];
                      return (
                        <div key={i} style={{ background:'var(--bg2)', border:`1px solid ${slot ? 'var(--gold-d)' : 'var(--border)'}`, borderRadius:3, padding:'.8rem 1rem', display:'flex', flexDirection:'column', gap:'.4rem' }}>
                          <div style={{ fontFamily:"'Cinzel',serif", fontSize:'.6rem', color:'var(--gold-d)', textTransform:'uppercase', letterSpacing:'.14em' }}>Слот #{i+1}</div>
                          {slot ? (
                            <>
                              <strong style={{ fontSize:'.9rem', color:'var(--text)' }}>{slot.server.name}</strong>
                              <span style={{ fontSize:'.76rem', color:'var(--text3)' }}>до {new Date(slot.endDate).toLocaleDateString('ru-RU', { day:'numeric', month:'long', year:'numeric' })}</span>
                              <button className={`${styles.btnSm} ${styles.btnDanger}`} style={{ alignSelf:'flex-start' }} onClick={() => revokeVip(slot.serverId)}>Снять VIP</button>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize:'.84rem', color:'#5AB482' }}>Свободно</span>
                              <select
                                className="input"
                                style={{ fontSize:'.76rem', padding:'.3rem .5rem' }}
                                defaultValue=""
                                onChange={e => { if (e.target.value) { grantVip(e.target.value); e.target.value = ''; } }}
                              >
                                <option value="">Выдать VIP…</option>
                                {servers
                                  .filter((sv: any) => !vipServerIds.has(sv.id))
                                  .map((sv: any) => <option key={sv.id} value={sv.id}>{sv.name}</option>)}
                              </select>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* VIP Скоро открытие */}
                <div>
                  <div style={{ display:'flex', alignItems:'baseline', gap:'.8rem', flexWrap:'wrap', marginBottom:'.7rem' }}>
                    <h3 style={{ fontFamily:"'Cinzel',serif", fontSize:'.86rem', color:'var(--gold)', margin:0 }}>◆ VIP Скоро открытие</h3>
                    <span style={{ fontSize:'.78rem', color:'var(--text3)' }}>
                      {soonVipStatus ? `${soonVipStatus.taken} из ${soonVipStatus.max}` : '…'}
                      {soonVipStatus?.nextFreeAt && soonVipStatus.taken >= soonVipStatus.max && ` · ближайшее освободится ${new Date(soonVipStatus.nextFreeAt).toLocaleDateString('ru-RU')}`}
                    </span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'.7rem' }}>
                    {Array.from({ length: SOON_VIP_MAX }).map((_, i) => {
                      const slot = soonVipStatus?.slots[i];
                      return (
                        <div key={i} style={{ background:'var(--bg2)', border:`1px solid ${slot ? 'var(--gold-d)' : 'var(--border)'}`, borderRadius:3, padding:'.8rem 1rem', display:'flex', flexDirection:'column', gap:'.4rem' }}>
                          <div style={{ fontFamily:"'Cinzel',serif", fontSize:'.6rem', color:'var(--gold-d)', textTransform:'uppercase', letterSpacing:'.14em' }}>Слот #{i+1}</div>
                          {slot ? (
                            <>
                              <strong style={{ fontSize:'.9rem', color:'var(--text)' }}>{slot.server.name}{slot.instanceLabel ? ` · ${slot.instanceLabel}` : ''}</strong>
                              <span style={{ fontSize:'.76rem', color:'var(--text3)' }}>до {new Date(slot.endDate).toLocaleDateString('ru-RU', { day:'numeric', month:'long', year:'numeric' })}</span>
                              <span style={{ fontSize:'.72rem', color:'var(--text3)' }}>{slot.instanceId ? 'Оплачен конкретный запуск' : 'VIP проекта'}</span>
                              <button className={`${styles.btnSm} ${styles.btnDanger}`} style={{ alignSelf:'flex-start' }} onClick={() => revokeSoonVip(slot.serverId, slot.instanceId)}>Снять VIP Скоро</button>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize:'.84rem', color:'#5AB482' }}>Свободно</span>
                              <select
                                className="input"
                                style={{ fontSize:'.76rem', padding:'.3rem .5rem' }}
                                defaultValue=""
                                onChange={e => { if (e.target.value) { grantSoonVipFromValue(e.target.value); e.target.value = ''; } }}
                              >
                                <option value="">Выдать VIP Скоро…</option>
                                {soonVipOptions.map(o => (
                                  <option key={o.key} value={o.key}>
                                    {o.label} · {new Date(o.openedAt).toLocaleDateString('ru-RU')}
                                  </option>
                                ))}
                              </select>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Бусты */}
                <div>
                  <div style={{ display:'flex', alignItems:'baseline', gap:'.8rem', flexWrap:'wrap', marginBottom:'.7rem' }}>
                    <h3 style={{ fontFamily:"'Cinzel',serif", fontSize:'.86rem', color:'#F08C46', margin:0 }}>🔥 Активные бусты</h3>
                    <span style={{ fontSize:'.78rem', color:'var(--text3)' }}>{boosts.filter(b => new Date(b.endDate) > new Date()).length} активн.</span>
                    <select
                      className="input"
                      style={{ fontSize:'.76rem', padding:'.3rem .5rem', marginLeft:'auto', width:'auto' }}
                      defaultValue=""
                      onChange={e => { if (e.target.value) { grantBoost(e.target.value); e.target.value = ''; } }}
                    >
                      <option value="">+ Выдать буст (7 дн)…</option>
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
                                    ? <span className={styles.planBadge} style={{ background:'rgba(240,140,70,.1)', color:'#F08C46', borderColor:'rgba(240,140,70,.25)' }}>🔥 в топе</span>
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

            {/* Отзывы на модерации */}
            {tab === 'reviews' && (
              <div className={styles.section}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.6rem', flexWrap: 'wrap' }}>
                  <div className={styles.sectionTitle}>Отзывы на модерации ({reviews.length})</div>
                  <button className={styles.btnSm} onClick={recalcAllRatings} title="Пересчитать rating/ratingCount на всех серверах">
                    ↻ Пересчитать рейтинги
                  </button>
                </div>
                {reviews.length === 0 ? <p className={styles.empty}>Нет отзывов на модерации</p> : (
                  <div className={styles.reviewCards}>
                    {reviews.map((r: any) => (
                      <div key={r.id} className={styles.reviewCard}>
                        <div className={styles.reviewMeta}>
                          <strong>{r.server?.name}</strong>
                          <span>от {r.user?.nickname ?? r.user?.email}</span>
                          <span>{'★'.repeat(r.rating)}</span>
                          <span className={styles.reviewDate}>{new Date(r.createdAt).toLocaleDateString('ru-RU')}</span>
                        </div>
                        <p className={styles.reviewTxt}>{r.text}</p>
                        <div style={{ display:'flex', gap:'.4rem', marginTop:'.6rem' }}>
                          <button className={`${styles.btnSm} ${styles.btnSuccess}`} onClick={() => approveReview(r.id)}>✓ Одобрить</button>
                          <button className={`${styles.btnSm} ${styles.btnDanger}`} onClick={() => rejectReview(r.id)}>✕ Удалить</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Заявки */}
            {tab === 'requests' && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Заявки на добавление ({requests.length})</div>
                {requests.length === 0 ? <p className={styles.empty}>Заявок пока нет</p> : (
                  <div className={styles.reviewCards}>
                    {requests.map((r: any) => {
                      const u = r.user;
                      const name = u?.nickname ?? u?.name ?? u?.email ?? 'Аноним';
                      const status = requestStatusInfo(r);
                      const payment = requestPaymentInfo(r);
                      return (
                        <div key={r.id} className={styles.reviewCard}>
                          <div style={{ display:'flex', alignItems:'center', gap:'.6rem', marginBottom:'.5rem', flexWrap:'wrap' }}>
                            {u?.avatar && <img src={u.avatar} alt="" style={{ width:24, height:24, borderRadius:'50%' }} />}
                            <strong style={{ color:'var(--text)' }}>{name}</strong>
                            {u?.vkId && <span style={{ fontSize:'.7rem', color:'var(--text3)' }}>VK {u.vkId}</span>}
                            <span className={styles.reviewDate}>{new Date(r.createdAt).toLocaleString('ru-RU')}</span>
                            <span className={payment.className}>{payment.label}</span>
                            <span style={{ marginLeft:'auto', fontSize:'.7rem', color: status.color, fontFamily:"'Cinzel',serif", letterSpacing:'.08em', textTransform:'uppercase' }}>{status.label}</span>
                          </div>
                          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'.4rem .9rem', fontSize:'.82rem', color:'var(--text2)' }}>
                            <div><span style={{ color:'var(--text3)' }}>Название: </span><strong style={{ color:'var(--text)' }}>{r.name}</strong></div>
                            <div><span style={{ color:'var(--text3)' }}>Хроника: </span>{r.chronicle}</div>
                            <div><span style={{ color:'var(--text3)' }}>Рейты: </span>{r.rates}</div>
                            <div><span style={{ color:'var(--text3)' }}>Открытие: </span>{r.openedDate ? new Date(r.openedDate).toLocaleDateString('ru-RU') : '—'}</div>
                            {r.contact && <div><span style={{ color:'var(--text3)' }}>Контакт: </span><strong style={{ color:'var(--text)' }}>{r.contact}</strong></div>}
                            {r.paymentId && <div><span style={{ color:'var(--text3)' }}>Платеж: </span><span className={styles.tdMono}>{r.paymentId}</span></div>}
                            <div style={{ gridColumn:'1/-1' }}><span style={{ color:'var(--text3)' }}>URL: </span><a href={r.url} target="_blank" rel="noopener" style={{ color:'var(--gold)' }}>{r.url}</a></div>
                          </div>
                          {r.status === 'pending' && (
                            <div style={{ display:'flex', gap:'.4rem', marginTop:'.7rem', flexWrap:'wrap' }}>
                              <button className={`${styles.btnSm} ${styles.btnSuccess}`} onClick={() => approveRequest(r)}>✓ Одобрить → создать сервер</button>
                              <button className={styles.btnSm} onClick={() => rejectRequest(r.id)}>✕ Отклонить</button>
                              <button className={`${styles.btnSm} ${styles.btnDanger}`} onClick={() => deleteRequest(r.id)}>🗑 Удалить</button>
                            </div>
                          )}
                          {r.status === 'pending_payment' && (
                            <div style={{ display:'flex', gap:'.4rem', marginTop:'.7rem', alignItems:'center', flexWrap:'wrap' }}>
                              <span style={{ fontSize:'.78rem', color:'var(--text3)' }}>Одобрение появится после успешной оплаты.</span>
                              <button className={`${styles.btnSm} ${styles.btnDanger}`} onClick={() => deleteRequest(r.id)}>🗑 Удалить</button>
                            </div>
                          )}
                          {r.status !== 'pending' && r.status !== 'pending_payment' && (
                            <div style={{ display:'flex', gap:'.4rem', marginTop:'.7rem' }}>
                              <button className={`${styles.btnSm} ${styles.btnDanger}`} onClick={() => deleteRequest(r.id)}>🗑 Удалить</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Добавить сервер */}
            {tab === 'add' && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>
                  {approvingId ? 'Одобрение заявки — заполните детали сервера' : 'Добавить сервер вручную'}
                </div>
                {approvingId && (
                  <div style={{ background:'rgba(200,168,75,.08)', border:'1px solid var(--gold-d)', borderRadius:3, padding:'.7rem 1rem', display:'flex', gap:'.6rem', alignItems:'center', flexWrap:'wrap' }}>
                    <span style={{ fontSize:'.82rem', color:'var(--text1)' }}>После сохранения заявка пометится <strong>approved</strong>.</span>
                    <button
                      type="button"
                      className={styles.btnSm}
                      style={{ marginLeft:'auto' }}
                      onClick={() => { setApprovingId(null); showToast('Отвязано от заявки'); }}
                    >
                      Отвязать от заявки
                    </button>
                  </div>
                )}
                <form className={styles.addForm} onSubmit={submitAdd}>
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
                      </>
                    )}
                    {/* Строка 3 */}
                    <AField label="Сайт *"><input className="input" required type="url" value={addForm.url} onChange={e => setAddForm(p => ({...p,url:e.target.value}))} placeholder="https://…" /></AField>
                    <AField label="Дата открытия"><input className="input" type="date" value={addForm.openedDate} onChange={e => setAddForm(p => ({...p,openedDate:e.target.value}))} /></AField>
                    <AField label="Страна">
                      <select className="input" value={addForm.country} onChange={e => setAddForm(p => ({...p,country:e.target.value}))}>
                        {['RU','EU','US','DE','PL','BY','UA'].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </AField>
                    <AField label="Ручной статус">
                      <select className="input" value={addForm.statusOverride} onChange={e => setAddForm(p => ({...p,statusOverride:e.target.value}))}>
                        <option value="auto">Авто мониторинг</option>
                        <option value="online">Всегда online</option>
                        <option value="offline">Всегда offline</option>
                        <option value="unknown">Неизвестно</option>
                      </select>
                    </AField>
                    {/* Строка 4 */}
                    <ImageUpload label="Иконка" value={addForm.icon} type="icon" token={token!} onChange={url => setAddForm(p => ({...p,icon:url}))} />
                    <ImageUpload label="Баннер" value={addForm.banner} type="banner" token={token!} onChange={url => setAddForm(p => ({...p,banner:url}))} />
                    {/* Строка 5 */}
                    <AField label="Telegram"><input className="input" type="url" value={addForm.telegram} onChange={e => setAddForm(p => ({...p,telegram:e.target.value}))} placeholder="https://t.me/…" /></AField>
                    <AField label="Discord"><input className="input" type="url" value={addForm.discord} onChange={e => setAddForm(p => ({...p,discord:e.target.value}))} placeholder="https://discord.gg/…" /></AField>
                    <AField label="ВКонтакте"><input className="input" type="url" value={addForm.vk} onChange={e => setAddForm(p => ({...p,vk:e.target.value}))} placeholder="https://vk.com/…" /></AField>
                  </div>

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
