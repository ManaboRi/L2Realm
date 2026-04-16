'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import styles from './page.module.css';

type AdminTab = 'servers' | 'reviews' | 'add';

export default function AdminPage() {
  const { user, token, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab]         = useState<AdminTab>('servers');
  const [servers, setServers]     = useState<any[]>([]);
  const [reviews, setReviews]     = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [toast, setToast]         = useState('');

  // Модал редактирования
  const [editServer, setEditServer] = useState<any | null>(null);
  const [editForm, setEditForm]   = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);

  // Форма добавления
  const [addForm, setAddForm] = useState({
    id:'', name:'', abbr:'', chronicle:'Interlude', rates:'', rateNum:'1',
    url:'', openedDate:'', country:'RU', donate:'cosmetic',
    type_pvp: false, type_pve: false, type_new: false, type_featured: false, vip: false,
    icon:'', banner:'', telegram:'', discord:'', vk:'',
    shortDesc:'', fullDesc:'',
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

  async function activateSub(serverId: string, plan: string) {
    if (!token) return;
    try { await api.payments.activate({ serverId, plan }, token); showToast(`Тариф изменён на ${plan}`); loadTab(tab); }
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
      donate:      s.donate      ?? 'cosmetic',
      type_pvp:    s.type?.includes('pvp')      ?? false,
      type_pve:    s.type?.includes('pve')      ?? false,
      type_new:    s.type?.includes('new')      ?? false,
      type_featured: s.type?.includes('featured') ?? false,
      icon:        s.icon        ?? '',
      banner:      s.banner      ?? '',
      telegram:    s.telegram    ?? '',
      discord:     s.discord     ?? '',
      vk:          s.vk          ?? '',
      shortDesc:   s.shortDesc   ?? '',
      fullDesc:    s.fullDesc    ?? '',
    });
  }

  async function submitEdit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!token || !editServer) return;
    setEditLoading(true);
    const types: string[] = [];
    if (editForm.type_pvp)      types.push('pvp');
    if (editForm.type_pve)      types.push('pve');
    if (editForm.type_new)      types.push('new');
    if (editForm.type_featured) types.push('featured');
    try {
      await api.servers.update(editServer.id, {
        name:        editForm.name,
        abbr:        editForm.abbr || editForm.name.slice(0, 2).toUpperCase(),
        chronicle:   editForm.chronicle,
        rates:       editForm.rates,
        rateNum:     Number(editForm.rateNum),
        url:         editForm.url,
        openedDate:  editForm.openedDate || undefined,
        country:     editForm.country,
        donate:      editForm.donate,
        type:        types,
        icon:        editForm.icon || undefined,
        banner:      editForm.banner || undefined,
        telegram:    editForm.telegram || undefined,
        discord:     editForm.discord || undefined,
        vk:          editForm.vk || undefined,
        shortDesc:   editForm.shortDesc,
        fullDesc:    editForm.fullDesc,
      }, token);
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
    if (addForm.type_pvp)      types.push('pvp');
    if (addForm.type_pve)      types.push('pve');
    if (addForm.type_new)      types.push('new');
    if (addForm.type_featured) types.push('featured');
    try {
      await api.servers.create({
        id: addForm.id, name: addForm.name, abbr: addForm.abbr || addForm.name.slice(0,2).toUpperCase(),
        url: addForm.url, chronicle: addForm.chronicle, rates: addForm.rates, rateNum: Number(addForm.rateNum),
        donate: addForm.donate as any, type: types, vip: addForm.vip,
        openedDate: addForm.openedDate || undefined, country: addForm.country,
        icon: addForm.icon || undefined, banner: addForm.banner || undefined,
        telegram: addForm.telegram || undefined, discord: addForm.discord || undefined, vk: addForm.vk || undefined,
        shortDesc: addForm.shortDesc, fullDesc: addForm.fullDesc,
      }, token);
      showToast(`✅ Сервер ${addForm.name} добавлен!`);
      setTab('servers');
    } catch (e: any) { showToast(`❌ ${e.message}`); }
  }

  if (loading || !isAdmin) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', gap:'.6rem', color:'var(--text3)' }}>
      <span className="spin" /> Загрузка...
    </div>
  );

  const TABS: { k: AdminTab; l: string }[] = [
    { k: 'servers', l: `Серверы (${servers.length})` },
    { k: 'reviews', l: `Отзывы (${reviews.length})` },
    { k: 'add',     l: '+ Добавить сервер' },
  ];

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
                <AField label="Хроника *">
                  <select className="input" value={editForm.chronicle} onChange={e => setEditForm((p:any) => ({...p,chronicle:e.target.value}))}>
                    {['Interlude','High Five','Classic','Essence','Gracia'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </AField>
                <AField label="Рейты *"><input className="input" required value={editForm.rates} onChange={e => setEditForm((p:any) => ({...p,rates:e.target.value}))} placeholder="x100" /></AField>
                <AField label="Рейт (число)"><input className="input" type="number" min={1} value={editForm.rateNum} onChange={e => setEditForm((p:any) => ({...p,rateNum:e.target.value}))} /></AField>
                <AField label="Сайт *"><input className="input" required type="url" value={editForm.url} onChange={e => setEditForm((p:any) => ({...p,url:e.target.value}))} /></AField>
                <AField label="Дата открытия"><input className="input" type="date" value={editForm.openedDate} onChange={e => setEditForm((p:any) => ({...p,openedDate:e.target.value}))} /></AField>
                <AField label="Страна">
                  <select className="input" value={editForm.country} onChange={e => setEditForm((p:any) => ({...p,country:e.target.value}))}>
                    {['RU','EU','US','DE','PL','BY','UA'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </AField>
                <AField label="Донат">
                  <select className="input" value={editForm.donate} onChange={e => setEditForm((p:any) => ({...p,donate:e.target.value}))}>
                    <option value="free">Без доната</option>
                    <option value="cosmetic">Косметика</option>
                    <option value="p2w">Pay-to-win</option>
                  </select>
                </AField>
                <AField label="Иконка (URL)"><input className="input" type="url" value={editForm.icon} onChange={e => setEditForm((p:any) => ({...p,icon:e.target.value}))} placeholder="https://…" /></AField>
                <AField label="Баннер (URL)"><input className="input" type="url" value={editForm.banner} onChange={e => setEditForm((p:any) => ({...p,banner:e.target.value}))} placeholder="https://…" /></AField>
                <AField label="Telegram"><input className="input" type="url" value={editForm.telegram} onChange={e => setEditForm((p:any) => ({...p,telegram:e.target.value}))} placeholder="https://t.me/…" /></AField>
                <AField label="Discord"><input className="input" type="url" value={editForm.discord} onChange={e => setEditForm((p:any) => ({...p,discord:e.target.value}))} placeholder="https://discord.gg/…" /></AField>
                <AField label="ВКонтакте"><input className="input" type="url" value={editForm.vk} onChange={e => setEditForm((p:any) => ({...p,vk:e.target.value}))} placeholder="https://vk.com/…" /></AField>
              </div>

              <div className={styles.checkRow}>
                {([['type_pvp','PvP'],['type_pve','PvE'],['type_new','Новый'],['type_featured','🔥 Популярный']] as const).map(([k,l]) => (
                  <label key={k} className={styles.checkLabel}>
                    <input type="checkbox" checked={editForm[k]} onChange={e => setEditForm((p:any) => ({...p,[k]:e.target.checked}))} />
                    {l}
                  </label>
                ))}
              </div>

              <AField label="Краткое описание">
                <input className="input" value={editForm.shortDesc} onChange={e => setEditForm((p:any) => ({...p,shortDesc:e.target.value}))} />
              </AField>
              <AField label="Полное описание">
                <textarea className="input" rows={5} value={editForm.fullDesc} onChange={e => setEditForm((p:any) => ({...p,fullDesc:e.target.value}))} style={{ resize:'vertical' }} />
              </AField>

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
                    <thead><tr><th>ID</th><th>Название</th><th>Хроника</th><th>Рейты</th><th>Тариф</th><th>До</th><th>Действия</th></tr></thead>
                    <tbody>
                      {servers.map(s => (
                        <tr key={s.id}>
                          <td className={styles.tdMono}>{s.id}</td>
                          <td><strong>{s.name}</strong></td>
                          <td>{s.chronicle}</td>
                          <td>{s.rates}</td>
                          <td><span className={styles.planBadge}>{s.subscription?.plan ?? 'FREE'}</span></td>
                          <td style={{ fontSize:'.72rem', color:'var(--text3)' }}>
                            {s.subscription?.endDate ? new Date(s.subscription.endDate).toLocaleDateString('ru-RU') : '—'}
                          </td>
                          <td>
                            <div style={{ display:'flex', gap:'.3rem', flexWrap:'wrap', alignItems:'center' }}>
                              <select
                                className="input"
                                style={{ width:'auto', fontSize:'.72rem', padding:'.2rem .5rem' }}
                                defaultValue=""
                                onChange={e => { if (e.target.value) { activateSub(s.id, e.target.value); e.target.value = ''; } }}
                              >
                                <option value="">Тариф…</option>
                                {['free','standard','premium','vip'].map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
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

            {/* Отзывы на модерации */}
            {tab === 'reviews' && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Отзывы на модерации ({reviews.length})</div>
                {reviews.length === 0 ? <p className={styles.empty}>Нет отзывов на модерации</p> : (
                  <div className={styles.reviewCards}>
                    {reviews.map((r: any) => (
                      <div key={r.id} className={styles.reviewCard}>
                        <div className={styles.reviewMeta}>
                          <strong>{r.server?.name}</strong>
                          <span>от {r.user?.name ?? r.user?.email}</span>
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

            {/* Добавить сервер */}
            {tab === 'add' && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Добавить сервер вручную</div>
                <form className={styles.addForm} onSubmit={submitAdd}>
                  <div className={styles.formGrid}>
                    {/* Строка 1 */}
                    <AField label="ID *"><input className="input" required value={addForm.id} onChange={e => setAddForm(p => ({...p,id:e.target.value}))} placeholder="l2fantasy" /></AField>
                    <AField label="Название *"><input className="input" required value={addForm.name} onChange={e => setAddForm(p => ({...p,name:e.target.value}))} placeholder="L2Fantasy" /></AField>
                    <AField label="Аббревиатура"><input className="input" value={addForm.abbr} maxLength={3} onChange={e => setAddForm(p => ({...p,abbr:e.target.value}))} placeholder="LF" /></AField>
                    {/* Строка 2 */}
                    <AField label="Хроника *">
                      <select className="input" value={addForm.chronicle} onChange={e => setAddForm(p => ({...p,chronicle:e.target.value}))}>
                        {['Interlude','High Five','Classic','Essence','Gracia'].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </AField>
                    <AField label="Рейты *"><input className="input" required value={addForm.rates} onChange={e => setAddForm(p => ({...p,rates:e.target.value}))} placeholder="x100" /></AField>
                    <AField label="Рейт (число)"><input className="input" type="number" min={1} value={addForm.rateNum} onChange={e => setAddForm(p => ({...p,rateNum:e.target.value}))} /></AField>
                    {/* Строка 3 */}
                    <AField label="Сайт *"><input className="input" required type="url" value={addForm.url} onChange={e => setAddForm(p => ({...p,url:e.target.value}))} placeholder="https://…" /></AField>
                    <AField label="Дата открытия"><input className="input" type="date" value={addForm.openedDate} onChange={e => setAddForm(p => ({...p,openedDate:e.target.value}))} /></AField>
                    <AField label="Страна">
                      <select className="input" value={addForm.country} onChange={e => setAddForm(p => ({...p,country:e.target.value}))}>
                        {['RU','EU','US','DE','PL','BY','UA'].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </AField>
                    {/* Строка 4 */}
                    <AField label="Донат">
                      <select className="input" value={addForm.donate} onChange={e => setAddForm(p => ({...p,donate:e.target.value}))}>
                        <option value="free">Без доната</option>
                        <option value="cosmetic">Косметика</option>
                        <option value="p2w">Pay-to-win</option>
                      </select>
                    </AField>
                    <AField label="Иконка (URL)"><input className="input" type="url" value={addForm.icon} onChange={e => setAddForm(p => ({...p,icon:e.target.value}))} placeholder="https://…" /></AField>
                    <AField label="Баннер (URL)"><input className="input" type="url" value={addForm.banner} onChange={e => setAddForm(p => ({...p,banner:e.target.value}))} placeholder="https://…" /></AField>
                    {/* Строка 5 */}
                    <AField label="Telegram"><input className="input" type="url" value={addForm.telegram} onChange={e => setAddForm(p => ({...p,telegram:e.target.value}))} placeholder="https://t.me/…" /></AField>
                    <AField label="Discord"><input className="input" type="url" value={addForm.discord} onChange={e => setAddForm(p => ({...p,discord:e.target.value}))} placeholder="https://discord.gg/…" /></AField>
                    <AField label="ВКонтакте"><input className="input" type="url" value={addForm.vk} onChange={e => setAddForm(p => ({...p,vk:e.target.value}))} placeholder="https://vk.com/…" /></AField>
                  </div>

                  <div className={styles.checkRow}>
                    {([['type_pvp','PvP'],['type_pve','PvE'],['type_new','Новый'],['type_featured','🔥 Популярный'],['vip','⭐ VIP']] as const).map(([k,l]) => (
                      <label key={k} className={styles.checkLabel}>
                        <input type="checkbox" checked={(addForm as any)[k]} onChange={e => setAddForm(p => ({...p,[k]:e.target.checked}))} />
                        {l}
                      </label>
                    ))}
                  </div>

                  <AField label="Краткое описание">
                    <input className="input" value={addForm.shortDesc} onChange={e => setAddForm(p => ({...p,shortDesc:e.target.value}))} placeholder="Одна строка для карточки" />
                  </AField>
                  <AField label="Полное описание">
                    <textarea className="input" rows={6} value={addForm.fullDesc} onChange={e => setAddForm(p => ({...p,fullDesc:e.target.value}))} placeholder="## Заголовок&#10;- пункт 1&#10;- пункт 2" style={{ resize:'vertical' }} />
                  </AField>

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
