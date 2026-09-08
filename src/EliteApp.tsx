import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, Bot, Building2, CalendarClock,
  Check, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, ClipboardList,
  Clock3, ContactRound, Copy, Database, Download, FileSearch, FileText, Filter,
  Gauge, Home, Layers3, Link2, ListChecks, LockKeyhole, Mail, Menu, MessageSquare,
  MoreHorizontal, Plus, RefreshCw, Save, Search, Send, Settings, ShieldCheck,
  Sparkles, TriangleAlert, UploadCloud, UserRound, Users, WandSparkles, X,
} from 'lucide-react';
import { askIntelligence, coreRequest, getAccessCode, setAccessCode, submitPublicApplication } from './coreApi';

type AnyRow = Record<string, any>;
type ApplicationData = Record<string, string | boolean | undefined>;

type DashboardPayload = {
  counts: { clients: number; contacts: number; applications: number; tasks: number; unlinked_tasks: number; pending_reviews: number; overdue_tasks: number; due_30_days: number; low_quality_clients: number };
  cities: Array<{ city: string; count: number }>;
  taskStatuses: Array<{ status: string; count: number }>;
  due: AnyRow[];
  recent: AnyRow[];
};

type ListPayload = { items: AnyRow[]; total: number; page: number; pageSize: number };

type AiEntry = {
  id: string;
  mode: 'chat' | 'email';
  prompt: string;
  answer: string;
  model: string;
  references: Array<{ type: 'client' | 'task'; id: string; label: string }>;
};

const ACCESS_HINT = 'AQ-••••-••••-••';
const APPLICATION_STATUSES = ['New', 'Reviewing', 'Visit scheduled', 'Completed'];
const TASK_STATUSES = ['Not Started', 'In Progress', 'Awaiting Feedback', 'Completed'];

function ALogo({ compact = false }: { compact?: boolean }) {
  return <div className={compact ? 'a-logo compact' : 'a-logo'} aria-label="AQUAPHOR">
    <svg viewBox="0 0 48 48" role="img" aria-hidden="true">
      <path d="M24 5 43 41H33.6l-3.7-7.4H18.1L14.4 41H5L24 5Zm0 13.4-3.1 7.1h6.2L24 18.4Z" fill="currentColor" />
      <path d="M20.4 29h7.2" stroke="white" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  </div>;
}

function Button({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`button ${className}`} {...props}>{children}</button>;
}

function Skeleton({ rows = 4 }: { rows?: number }) {
  return <div className="skeleton-stack">{Array.from({ length: rows }).map((_, i) => <div className="skeleton" key={i} />)}</div>;
}

function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon">{icon || <FileSearch size={24} />}</div><h3>{title}</h3><p>{text}</p>{action}</div>;
}

function ErrorBox({ error, retry }: { error: string; retry?: () => void }) {
  return <div className="error-box"><TriangleAlert size={18} /><div><strong>Something needs attention</strong><span>{error}</span></div>{retry && <Button className="button-ghost" onClick={retry}><RefreshCw size={15} /> Retry</Button>}</div>;
}

function fmtDate(value?: string | null, withTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-GB', withTime ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function fmtNumber(value: any) { return new Intl.NumberFormat('en-GB').format(Number(value || 0)); }
function displayName(row: AnyRow) { return row.display_name || row.client_name || row.company_name || row.company || [row.name, row.surname].filter(Boolean).join(' ') || 'Unnamed client'; }
function initials(value: string) { return value.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase() || 'A'; }
function statusClass(value?: string) { return `status-pill status-${String(value || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`; }
function isOverdue(value?: string, status?: string) { return !!value && new Date(value) < new Date(new Date().toDateString()) && !['completed', 'done', 'cancelled'].includes(String(status || '').toLowerCase()); }
function safeArray(value: any): any[] { return Array.isArray(value) ? value : []; }

function useRequest<T>(path: string, deps: any[] = []) {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    try { setData(await coreRequest<T>(path)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Request failed'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, deps);
  return { data, loading, error, reload: load, setData };
}

function AccessGate({ children }: { children: ReactNode }) {
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);
  const [code, setCode] = useState(getAccessCode());
  const [error, setError] = useState('');

  async function verify(candidate = code) {
    if (!candidate.trim()) { setError('Enter the testing access code.'); return; }
    setChecking(true); setError(''); setAccessCode(candidate);
    try { await coreRequest('/health'); setVerified(true); }
    catch (e) { setVerified(false); setAccessCode(''); setError(e instanceof Error ? e.message : 'Access could not be verified'); }
    finally { setChecking(false); }
  }

  useEffect(() => { if (code) void verify(code); else setChecking(false); }, []);
  if (checking) return <div className="access-screen"><div className="access-card"><ALogo /><div className="access-loader" /><h2>Opening Customer Intelligence</h2><p>Connecting to the protected testing workspace.</p></div></div>;
  if (!verified) return <div className="access-screen">
    <div className="access-card">
      <div className="access-brand"><ALogo /><div><strong>AQUAPHOR</strong><span>Customer Intelligence</span></div></div>
      <div className="access-kicker"><LockKeyhole size={15} /> Private testing workspace</div>
      <h1>Enter the workspace code</h1>
      <p>This is not a user account or sign-in. It is a temporary access layer because the workspace contains real customer information.</p>
      <form onSubmit={(e) => { e.preventDefault(); void verify(); }}>
        <label><span>Testing access code</span><input autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder={ACCESS_HINT} /></label>
        {error && <div className="inline-error"><AlertTriangle size={15} />{error}</div>}
        <Button className="button-primary" type="submit">Open workspace <ArrowRight size={16} /></Button>
      </form>
      <small>Production authentication can be enabled later without changing the database structure.</small>
    </div>
  </div>;
  return <>{children}</>;
}

const NAV = [
  ['/', 'Overview', Home],
  ['/clients', 'Clients', Users],
  ['/contacts', 'Contacts', ContactRound],
  ['/applications', 'Applications', ClipboardList],
  ['/tasks', 'Service Tasks', ListChecks],
  ['/review', 'Match Review', Link2],
  ['/intelligence', 'AI Intelligence', Sparkles],
  ['/imports', 'Data Imports', Database],
  ['/settings', 'Settings', Settings],
] as const;

function InternalLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [global, setGlobal] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const current = NAV.find(([path]) => path === location.pathname)?.[1] || (location.pathname.startsWith('/clients/') ? 'Client 360' : location.pathname.startsWith('/applications/') ? 'Application' : 'Customer Intelligence');
  return <div className="workspace-shell">
    <aside className={mobileOpen ? 'elite-sidebar open' : 'elite-sidebar'}>
      <div className="brand-lockup"><ALogo compact /><div><strong>AQUAPHOR</strong><span>Customer Intelligence</span></div><button className="sidebar-close" onClick={() => setMobileOpen(false)}><X size={18} /></button></div>
      <div className="workspace-chip"><ShieldCheck size={15} /><div><b>Cyprus workspace</b><span>Protected testing mode</span></div></div>
      <nav>{NAV.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => isActive ? 'elite-nav active' : 'elite-nav'} onClick={() => setMobileOpen(false)}><Icon size={18} /><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-intel"><WandSparkles size={19} /><strong>Intelligence layer active</strong><p>Clients, contacts, applications and service history are connected in one model.</p><Link to="/intelligence">Ask AQUAPHOR AI <ArrowRight size={14} /></Link></div>
      <div className="sidebar-footer"><span className="live-dot" /> Testing data · Frankfurt</div>
    </aside>
    {mobileOpen && <button className="backdrop" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
    <div className="workspace-main">
      <header className="elite-topbar">
        <button className="menu-button" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
        <div className="topbar-title"><span>Workspace</span><ChevronRight size={13} /><strong>{current}</strong></div>
        <form className="global-search" onSubmit={(e) => { e.preventDefault(); if (global.trim()) navigate(`/clients?q=${encodeURIComponent(global.trim())}`); }}><Search size={17} /><input value={global} onChange={(e) => setGlobal(e.target.value)} placeholder="Search clients, contacts or keywords…" /><kbd>↵</kbd></form>
        <div className="test-badge"><span /> Testing mode</div>
      </header>
      <main className="elite-main">{children}</main>
    </div>
  </div>;
}

function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="page-header"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action && <div className="page-actions">{action}</div>}</div>;
}

function MetricCard({ icon, label, value, note, tone = '' }: { icon: ReactNode; label: string; value: any; note?: string; tone?: string }) {
  return <div className={`metric-card ${tone}`}><div className="metric-icon">{icon}</div><div><span>{label}</span><strong>{fmtNumber(value)}</strong>{note && <small>{note}</small>}</div></div>;
}

function Dashboard() {
  const { data, loading, error, reload } = useRequest<DashboardPayload>('/dashboard', []);
  if (error) return <div className="page"><PageHeader title="Customer Intelligence" /><ErrorBox error={error} retry={reload} /></div>;
  const c = data?.counts;
  const maxCity = Math.max(...(data?.cities || []).map((x) => x.count), 1);
  return <div className="page">
    <PageHeader eyebrow="AQUAPHOR OPERATIONS" title="Customer intelligence, in one view." subtitle="A live operational picture across customers, contacts, applications and service work." action={<><Link className="button button-secondary" to="/intelligence"><Sparkles size={16} /> Ask AI</Link><Link className="button button-primary" to="/applications/new"><Plus size={16} /> New application</Link></>} />
    <section className="intelligence-banner"><div><span className="banner-kicker"><Activity size={15} /> LIVE CUSTOMER GRAPH</span><h2>Every relationship and service event, connected.</h2><p>Search a client, understand their complete history, identify overdue work and draft precise follow-up from verified records.</p></div><div className="banner-orbit"><ALogo /><i /><i /><i /></div></section>
    {loading ? <Skeleton rows={4} /> : <>
      <div className="metrics-grid">
        <MetricCard icon={<Users size={21} />} label="Clients" value={c?.clients} note="Canonical customer records" />
        <MetricCard icon={<ContactRound size={21} />} label="Contacts" value={c?.contacts} note="People linked to clients" />
        <MetricCard icon={<ListChecks size={21} />} label="Service tasks" value={c?.tasks} note={`${fmtNumber(c?.unlinked_tasks)} require linking`} />
        <MetricCard icon={<AlertTriangle size={21} />} label="Overdue" value={c?.overdue_tasks} note={`${fmtNumber(c?.due_30_days)} due within 30 days`} tone="danger" />
      </div>
      <div className="dashboard-grid">
        <section className="panel span-2"><div className="panel-head"><div><span className="panel-label">SERVICE CONTROL</span><h2>Next actions</h2></div><Link to="/tasks">View all tasks <ArrowRight size={14} /></Link></div>
          {safeArray(data?.due).length === 0 ? <EmptyState title="No dated service tasks" text="Tasks with due dates will appear here." /> : <div className="task-list">{safeArray(data?.due).map((task) => <Link key={task.id} to={task.client_id ? `/clients/${task.client_id}` : '/review'} className="task-line"><div className={isOverdue(task.due_date, task.status) ? 'task-date overdue' : 'task-date'}><CalendarClock size={16} /><span>{fmtDate(task.due_date)}</span></div><div className="task-copy"><strong>{task.product_service || task.raw_name}</strong><span>{task.client_name || task.customer_hint || 'Unlinked customer'}</span></div><span className={statusClass(task.status)}>{task.status || 'Not provided'}</span><ChevronRight size={16} /></Link>)}</div>}
        </section>
        <section className="panel"><div className="panel-head"><div><span className="panel-label">CLIENT COVERAGE</span><h2>Top cities</h2></div><BarChart3 size={18} /></div><div className="bar-list">{safeArray(data?.cities).map((row) => <div className="bar-row" key={row.city}><div><span>{row.city}</span><strong>{row.count}</strong></div><div className="bar-track"><i style={{ width: `${Math.max(5, (row.count / maxCity) * 100)}%` }} /></div></div>)}</div></section>
        <section className="panel span-2"><div className="panel-head"><div><span className="panel-label">RECENTLY CONNECTED</span><h2>Client records</h2></div><Link to="/clients">Open client register <ArrowRight size={14} /></Link></div><div className="recent-grid">{safeArray(data?.recent).map((client) => <Link to={`/clients/${client.id}`} className="recent-client" key={client.id}><div className="avatar">{initials(displayName(client))}</div><div><strong>{displayName(client)}</strong><span>{client.city || 'City not provided'}</span></div><div className="quality-mini"><small>Quality</small><b>{client.data_quality_score ?? '—'}</b></div></Link>)}</div></section>
        <section className="panel"><div className="panel-head"><div><span className="panel-label">DATA INTEGRITY</span><h2>Review queue</h2></div><Gauge size={18} /></div><div className="integrity-stack"><div><span>Unlinked tasks</span><strong>{fmtNumber(c?.unlinked_tasks)}</strong></div><div><span>Pending matches</span><strong>{fmtNumber(c?.pending_reviews)}</strong></div><div><span>Low-quality clients</span><strong>{fmtNumber(c?.low_quality_clients)}</strong></div></div><Link className="button button-secondary full" to="/review">Resolve uncertain links</Link></section>
      </div>
    </>}
  </div>;
}

function ClientIdentity({ row }: { row: AnyRow }) {
  const name = displayName(row);
  return <div className="identity-cell"><div className="avatar">{initials(name)}</div><div><strong>{name}</strong><span>{row.vat ? `VAT ${row.vat}` : row.origin === 'legacy_import' ? 'Imported customer' : 'Application customer'}</span></div></div>;
}

function QualityBadge({ score }: { score: any }) {
  const n = Number(score || 0); const label = n >= 80 ? 'Strong' : n >= 55 ? 'Fair' : 'Review';
  return <span className={`quality quality-${label.toLowerCase()}`}><i style={{ width: `${Math.max(4, n)}%` }} />{n || '—'} · {label}</span>;
}

function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <div className="pagination"><span>Showing {total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} of {fmtNumber(total)}</span><div><Button className="icon-button" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={16} /></Button><b>{page} / {pages}</b><Button className="icon-button" disabled={page >= pages} onClick={() => onPage(page + 1)}><ChevronRight size={16} /></Button></div></div>;
}

function ClientsPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [city, setCity] = useState(params.get('city') || '');
  const [origin, setOrigin] = useState(params.get('origin') || '');
  const page = Math.max(1, Number(params.get('page') || 1)); const pageSize = 50;
  const path = `/clients?q=${encodeURIComponent(params.get('q') || '')}&city=${encodeURIComponent(params.get('city') || '')}&origin=${encodeURIComponent(params.get('origin') || '')}&page=${page}&pageSize=${pageSize}`;
  const { data, loading, error, reload } = useRequest<ListPayload>(path, [path]);
  function apply() { const next: Record<string, string> = {}; if (query.trim()) next.q = query.trim(); if (city.trim()) next.city = city.trim(); if (origin) next.origin = origin; setParams(next); }
  function exportCsv() {
    const rows = [['Client','Email','Phone','City','VAT','Source','Contacts','Tasks','Applications','Next Service','Quality'], ...(data?.items || []).map((r) => [displayName(r),r.email||'',r.phone||'',r.city||'',r.vat||'',r.origin||'',r.contact_count||0,r.task_count||0,r.application_count||0,r.next_service_due||'',r.data_quality_score||''])];
    const csv = rows.map((row) => row.map((v) => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff'+csv], { type:'text/csv' })); a.download = `AQUAPHOR_Clients_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }
  return <div className="page"><PageHeader eyebrow="CUSTOMER GRAPH" title="Clients" subtitle={`${fmtNumber(data?.total)} canonical customer records — duplicates are collapsed, source data is preserved.`} action={<><Button className="button-secondary" onClick={exportCsv}><Download size={16} /> Export current view</Button><Link className="button button-primary" to="/applications/new"><Plus size={16} /> New application</Link></>} />
    <form className="filter-bar" onSubmit={(e) => { e.preventDefault(); apply(); }}><label className="search-control"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, phone or VAT…" /></label><label><span>City</span><input value={city} onChange={(e) => setCity(e.target.value)} placeholder="All cities" /></label><label><span>Source</span><select value={origin} onChange={(e) => setOrigin(e.target.value)}><option value="">All sources</option><option value="legacy_import">Imported customers</option><option value="application">Staff applications</option><option value="public_application">Public applications</option></select></label><Button className="button-primary" type="submit"><Filter size={16} /> Apply</Button></form>
    {error && <ErrorBox error={error} retry={reload} />}
    <section className="panel table-panel">{loading ? <Skeleton rows={9} /> : !data?.items?.length ? <EmptyState icon={<Users size={24} />} title="No clients found" text="Change the filters or add a new application." /> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Client</th><th>Contact</th><th>City</th><th>Relationship</th><th>Next service</th><th>Data quality</th><th /></tr></thead><tbody>{data.items.map((row) => <tr key={row.id}><td><ClientIdentity row={row} /></td><td><div className="stacked"><span>{row.email || 'No email'}</span><small>{row.phone || 'No phone'}</small></div></td><td>{row.city || '—'}</td><td><div className="relationship-counts"><span>{row.contact_count} contacts</span><span>{row.task_count} tasks</span><span>{row.application_count} forms</span></div></td><td>{row.next_service_due ? <span className={isOverdue(row.next_service_due) ? 'date-alert' : ''}>{fmtDate(row.next_service_due)}</span> : '—'}{row.overdue_count > 0 && <small className="overdue-note">{row.overdue_count} overdue</small>}</td><td><QualityBadge score={row.data_quality_score} /></td><td><Link className="row-action" to={`/clients/${row.id}`}>Open 360 <ArrowRight size={14} /></Link></td></tr>)}</tbody></table></div>}
      {data && <Pagination page={page} pageSize={pageSize} total={data.total} onPage={(p) => { const next = new URLSearchParams(params); next.set('page', String(p)); setParams(next); }} />}
    </section>
  </div>;
}

function ClientProfilePage() {
  const { id } = useParams(); const navigate = useNavigate();
  const { data, loading, error, reload } = useRequest<any>(`/clients/${id}`, [id]);
  if (loading) return <div className="page"><Skeleton rows={8} /></div>;
  if (error) return <div className="page"><ErrorBox error={error} retry={reload} /></div>;
  const client=data?.client||{};const contacts=safeArray(data?.contacts);const tasks=safeArray(data?.tasks);const apps=safeArray(data?.applications);const service=data?.service||{};
  return <div className="page"><div className="back-row"><Link to="/clients"><ChevronLeft size={15} /> Clients</Link><div><Button className="button-secondary" onClick={() => navigate(`/intelligence?prompt=${encodeURIComponent(`Give me a complete operational breakdown of client ${displayName(client)}`)}`)}><Sparkles size={16} /> Ask AI about this client</Button><Link className="button button-primary" to="/applications/new"><Plus size={16} /> New application</Link></div></div>
    <section className="profile-hero"><div className="profile-avatar">{initials(displayName(client))}</div><div className="profile-title"><span className="eyebrow">CLIENT 360</span><h1>{displayName(client)}</h1><p>{client.client_type || 'Customer'} · {client.origin === 'legacy_import' ? 'Imported account' : 'Application account'}</p><div className="profile-tags">{client.city && <span>{client.city}</span>}{client.country && <span>{client.country}</span>}{client.vat && <span>VAT {client.vat}</span>}{client.active === false && <span>Inactive</span>}</div></div><div className="profile-quality"><QualityBadge score={client.data_quality_score} /><small>{client.dedupe_count > 1 ? `${client.dedupe_count} source rows consolidated` : 'Single customer record'}</small></div></section>
    <div className="metrics-grid profile-metrics"><MetricCard icon={<ContactRound size={20} />} label="Contacts" value={contacts.length} /><MetricCard icon={<ClipboardList size={20} />} label="Applications" value={apps.length} /><MetricCard icon={<ListChecks size={20} />} label="Service tasks" value={service.total || tasks.length} /><MetricCard icon={<AlertTriangle size={20} />} label="Overdue work" value={service.overdue} tone="danger" /></div>
    <div className="profile-grid"><section className="panel"><div className="panel-head"><div><span className="panel-label">MASTER DATA</span><h2>Customer details</h2></div><Building2 size={18} /></div><dl className="detail-list">{[['Email',client.email],['Phone',client.phone],['Address',client.address],['City',client.city],['Postcode',client.zip],['Country',client.country],['VAT',client.vat],['Website',client.website],['Created',fmtDate(client.legacy_created_at||client.application_date||client.created_at)],['Deduplication',client.dedupe_reason]].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v||'Not provided'}</dd></div>)}</dl></section>
      <section className="panel"><div className="panel-head"><div><span className="panel-label">SERVICE POSITION</span><h2>Operational summary</h2></div><CalendarClock size={18} /></div><dl className="detail-list"><div><dt>Next service due</dt><dd className={isOverdue(service.next_due) ? 'date-alert' : ''}>{fmtDate(service.next_due)}</dd></div><div><dt>Overdue tasks</dt><dd>{service.overdue || 0}</dd></div><div><dt>Last scheduled date</dt><dd>{fmtDate(service.last_scheduled)}</dd></div><div><dt>Follow-up date</dt><dd>{fmtDate(client.next_follow_up_at)}</dd></div><div><dt>Segment</dt><dd>{client.segment || 'Not assigned'}</dd></div><div><dt>Internal notes</dt><dd>{client.client_notes || 'Not provided'}</dd></div></dl></section></div>
    <section className="panel profile-section"><div className="panel-head"><div><span className="panel-label">PEOPLE</span><h2>Contacts</h2></div><span>{contacts.length}</span></div>{!contacts.length ? <EmptyState title="No contacts linked" text="A matching contact may still be in the Match Review queue." /> : <div className="cards-grid">{contacts.map((contact) => <article className="contact-card" key={contact.id}><div className="avatar">{initials(contact.display_name || 'Contact')}</div><div><strong>{contact.display_name || 'Unnamed contact'}{contact.is_primary && <span className="primary-tag">Primary</span>}</strong><span>{contact.title || 'Role not provided'}</span><a href={contact.email ? `mailto:${contact.email}` : undefined}>{contact.email || 'No email'}</a><small>{contact.phone || 'No phone'}</small></div></article>)}</div>}</section>
    <section className="panel profile-section"><div className="panel-head"><div><span className="panel-label">SERVICE HISTORY</span><h2>Tasks and maintenance</h2></div><Link to={`/tasks?q=${encodeURIComponent(displayName(client))}`}>Open filtered list <ArrowRight size={14} /></Link></div>{!tasks.length ? <EmptyState title="No service tasks linked" text="There is no confirmed task relationship for this client." /> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Product / service</th><th>Status</th><th>Start</th><th>Due</th><th>Assigned</th><th>Interval</th><th>Link</th></tr></thead><tbody>{tasks.map((task) => <tr key={task.id}><td><strong>{task.product_service || task.raw_name}</strong><small className="block-muted">{task.customer_hint}</small></td><td><span className={statusClass(task.status)}>{task.status || '—'}</span></td><td>{fmtDate(task.start_date)}</td><td className={isOverdue(task.due_date,task.status)?'date-alert':''}>{fmtDate(task.due_date)}</td><td>{task.assigned_to || '—'}</td><td>{task.service_interval_months ? `${task.service_interval_months} months` : task.tags || '—'}</td><td><span className="link-confidence">{task.link_method || 'Not recorded'}{task.link_score && <small>{Math.round(Number(task.link_score)*100)}%</small>}</span></td></tr>)}</tbody></table></div>}</section>
    <section className="panel profile-section"><div className="panel-head"><div><span className="panel-label">APPLICATIONS</span><h2>Submitted forms</h2></div><span>{apps.length}</span></div>{!apps.length ? <EmptyState title="No customer application" text="This imported customer has no online application yet." action={<Link className="button button-primary" to="/applications/new">Create application</Link>} /> : <div className="application-cards">{apps.map((app) => <Link key={app.id} to={`/applications/${app.id}`}><ClipboardCheck size={18} /><div><strong>{fmtDate(app.submitted_at)}</strong><span>{app.status}</span></div><ChevronRight size={16} /></Link>)}</div>}</section>
  </div>;
}

function ContactsPage() {
  const [params,setParams]=useSearchParams();const [q,setQ]=useState(params.get('q')||'');const page=Math.max(1,Number(params.get('page')||1));const path=`/contacts?q=${encodeURIComponent(params.get('q')||'')}&page=${page}&pageSize=50`;const {data,loading,error,reload}=useRequest<ListPayload>(path,[path]);
  return <div className="page"><PageHeader eyebrow="RELATIONSHIP DIRECTORY" title="Contacts" subtitle={`${fmtNumber(data?.total)} people connected to customer accounts.`} /><form className="filter-bar simple" onSubmit={(e)=>{e.preventDefault();setParams(q.trim()?{q:q.trim()}:{});}}><label className="search-control"><Search size={17}/><input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search contact, email, phone or company…"/></label><Button className="button-primary" type="submit">Search</Button></form>{error&&<ErrorBox error={error} retry={reload}/>}<section className="panel table-panel">{loading?<Skeleton rows={8}/>:!data?.items?.length?<EmptyState title="No contacts found" text="Change the search or import contact records."/>:<div className="table-scroll"><table className="data-table"><thead><tr><th>Contact</th><th>Customer</th><th>Email</th><th>Phone</th><th>Role</th><th>Link confidence</th></tr></thead><tbody>{data.items.map((row)=><tr key={row.id}><td><div className="identity-cell"><div className="avatar">{initials(row.display_name||'Contact')}</div><div><strong>{row.display_name||'Unnamed contact'}</strong>{row.is_primary&&<span className="primary-tag">Primary</span>}</div></div></td><td>{row.client_id?<Link to={`/clients/${row.client_id}`}>{row.client_name||'Open client'}</Link>:<Link className="unlinked" to="/review">Unlinked</Link>}</td><td>{row.email||'—'}</td><td>{row.phone||'—'}</td><td>{row.title||'—'}</td><td><span className="link-confidence">{row.link_method||'Review required'}{row.link_score&&<small>{Math.round(Number(row.link_score)*100)}%</small>}</span></td></tr>)}</tbody></table></div>}{data&&<Pagination page={page} pageSize={50} total={data.total} onPage={(p)=>{const n=new URLSearchParams(params);n.set('page',String(p));setParams(n)}}/>}</section></div>;
}

function TasksPage() {
  const [params,setParams]=useSearchParams();const [q,setQ]=useState(params.get('q')||'');const [status,setStatus]=useState(params.get('status')||'');const [linked,setLinked]=useState(params.get('linked')||'');const [due,setDue]=useState(params.get('due')||'');const page=Math.max(1,Number(params.get('page')||1));const path=`/tasks?q=${encodeURIComponent(params.get('q')||'')}&status=${encodeURIComponent(params.get('status')||'')}&linked=${params.get('linked')||''}&due=${params.get('due')||''}&page=${page}&pageSize=50`;const {data,loading,error,reload}=useRequest<ListPayload>(path,[path]);
  const apply=()=>{const n:Record<string,string>={};if(q.trim())n.q=q.trim();if(status)n.status=status;if(linked)n.linked=linked;if(due)n.due=due;setParams(n)};
  async function changeStatus(id:string,value:string){try{await coreRequest(`/tasks/${id}`,{method:'PATCH',body:JSON.stringify({status:value})});await reload()}catch(e){alert(e instanceof Error?e.message:'Could not update task')}}
  return <div className="page"><PageHeader eyebrow="SERVICE INTELLIGENCE" title="Service Tasks" subtitle={`${fmtNumber(data?.total)} installation, maintenance and follow-up records.`} action={<Link className="button button-secondary" to="/intelligence?prompt=Show me the most urgent overdue service tasks"><Sparkles size={16}/> Ask AI for priorities</Link>} /><form className="filter-bar task-filters" onSubmit={(e)=>{e.preventDefault();apply()}}><label className="search-control"><Search size={17}/><input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Product, customer, assignee…"/></label><label><span>Status</span><select value={status} onChange={(e)=>setStatus(e.target.value)}><option value="">All statuses</option>{TASK_STATUSES.map(x=><option key={x}>{x}</option>)}</select></label><label><span>Link</span><select value={linked} onChange={(e)=>setLinked(e.target.value)}><option value="">All records</option><option value="yes">Linked</option><option value="no">Unlinked</option></select></label><label><span>Due</span><select value={due} onChange={(e)=>setDue(e.target.value)}><option value="">Any date</option><option value="overdue">Overdue</option><option value="30">Next 30 days</option></select></label><Button className="button-primary" type="submit"><Filter size={16}/> Apply</Button></form>{error&&<ErrorBox error={error} retry={reload}/>}<section className="panel table-panel">{loading?<Skeleton rows={9}/>:!data?.items?.length?<EmptyState title="No service tasks found" text="Change the filters or review the imported task source."/>:<div className="table-scroll"><table className="data-table tasks-table"><thead><tr><th>Product / service</th><th>Customer</th><th>Status</th><th>Start</th><th>Due</th><th>Assigned</th><th>Cycle</th><th>Priority</th></tr></thead><tbody>{data.items.map((row)=><tr key={row.id}><td><strong>{row.product_service||row.raw_name}</strong><small className="block-muted">#{row.source_task_id} · {row.source_file}</small></td><td>{row.client_id?<Link to={`/clients/${row.client_id}`}>{row.client_name}</Link>:<div><span>{row.customer_hint||'Not identified'}</span><Link className="unlinked block-muted" to="/review">Resolve link</Link></div>}</td><td><select className={statusClass(row.status)} value={row.status||''} onChange={(e)=>void changeStatus(row.id,e.target.value)}>{!TASK_STATUSES.includes(row.status)&&<option>{row.status||'Not provided'}</option>}{TASK_STATUSES.map(x=><option key={x}>{x}</option>)}</select></td><td>{fmtDate(row.start_date)}</td><td className={isOverdue(row.due_date,row.status)?'date-alert':''}>{fmtDate(row.due_date)}</td><td>{row.assigned_to||'—'}</td><td>{row.service_interval_months?`${row.service_interval_months} months`:row.tags||'—'}</td><td>{row.priority||'—'}</td></tr>)}</tbody></table></div>}{data&&<Pagination page={page} pageSize={50} total={data.total} onPage={(p)=>{const n=new URLSearchParams(params);n.set('page',String(p));setParams(n)}}/>}</section></div>;
}

function MatchReviewPage() {
  const {data,loading,error,reload}=useRequest<{items:AnyRow[];total:number}>('/reviews',[]);const [working,setWorking]=useState('');
  async function resolve(review:AnyRow,clientId:string){if(!confirm(`Link this ${review.entity_type} to the selected client?`))return;setWorking(review.id);try{await coreRequest(`/reviews/${review.id}/resolve`,{method:'POST',body:JSON.stringify({clientId,note:'Resolved in Match Review workspace'})});await reload()}catch(e){alert(e instanceof Error?e.message:'Could not resolve match')}finally{setWorking('')}}
  return <div className="page"><PageHeader eyebrow="DATA QUALITY" title="Match Review" subtitle="Uncertain contact and task relationships are held here rather than merged by guesswork." action={<Button className="button-secondary" onClick={()=>void reload()}><RefreshCw size={16}/> Refresh</Button>} />{error&&<ErrorBox error={error} retry={reload}/>}<div className="review-summary"><ShieldCheck size={18}/><p><strong>Conservative matching is deliberate.</strong> Exact identifiers are linked automatically. Ambiguous names remain here for human confirmation.</p></div>{loading?<Skeleton rows={7}/>:!data?.items?.length?<EmptyState icon={<CheckCircle2 size={25}/>} title="Match queue is clear" text="Every imported relationship is either linked or has already been reviewed."/>:<div className="review-list">{data.items.map((row)=><article className="review-card" key={row.id}><div className="review-type">{row.entity_type==='task'?<ListChecks size={17}/>:<ContactRound size={17}/>}<span>{row.entity_type}</span></div><div className="review-source"><strong>{row.source_payload?.raw_name||row.source_payload?.company_source_name||row.source_payload?.email||row.source_id}</strong><p>{row.entity_type==='task'?`Customer hint: ${row.source_payload?.customer_hint||'None'} · Product: ${row.source_payload?.product_service||'Not parsed'}`:`Email: ${row.source_payload?.email||'Not provided'} · Phone: ${row.source_payload?.phone||'Not provided'}`}</p></div><div className="candidate-list">{safeArray(row.candidate_payload).length?safeArray(row.candidate_payload).map((candidate:any)=><button disabled={working===row.id} key={candidate.client_id} onClick={()=>void resolve(row,candidate.client_id)}><div className="avatar">{initials(candidate.name||'Client')}</div><div><strong>{candidate.name||candidate.client_id}</strong><span>{Math.round(Number(candidate.score||0)*100)}% confidence</span></div><ArrowRight size={15}/></button>):<span className="no-candidate">No reliable candidate was found. Search the Clients register before resolving manually.</span>}</div></article>)}</div>}</div>;
}

function IntelligencePage() {
  const [params]=useSearchParams();const initial=params.get('prompt')||'';const [mode,setMode]=useState<'chat'|'email'>('chat');const [message,setMessage]=useState(initial);const [history,setHistory]=useState<AiEntry[]>(()=>{try{return JSON.parse(sessionStorage.getItem('aquaphor_ai_history')||'[]')}catch{return[]}});const [busy,setBusy]=useState(false);const [error,setError]=useState('');const bottom=useRef<HTMLDivElement>(null);
  useEffect(()=>{bottom.current?.scrollIntoView({behavior:'smooth'})},[history,busy]);useEffect(()=>{sessionStorage.setItem('aquaphor_ai_history',JSON.stringify(history.slice(-20)))},[history]);
  async function submit(e?:FormEvent){e?.preventDefault();const prompt=message.trim();if(!prompt||busy)return;setBusy(true);setError('');setMessage('');try{const res=await askIntelligence(mode,prompt);setHistory(h=>[...h,{id:crypto.randomUUID(),mode,prompt,answer:res.answer,model:res.model,references:res.references||[]}])}catch(e){setError(e instanceof Error?e.message:'AI request failed')}finally{setBusy(false)}}
  return <div className="page ai-page"><PageHeader eyebrow="GROUNDED CRM COPILOT" title="AQUAPHOR Intelligence" subtitle="Answers are retrieved from connected customer, contact, application and service records — not invented from general knowledge." action={<span className="ai-live"><span/> OpenAI via Supabase</span>} /><div className="ai-mode"><button className={mode==='chat'?'active':''} onClick={()=>setMode('chat')}><MessageSquare size={18}/><div><strong>Chat</strong><span>Client dossiers and operational analysis</span></div></button><button className={mode==='email'?'active':''} onClick={()=>setMode('email')}><Mail size={18}/><div><strong>Email</strong><span>Grounded follow-up drafts</span></div></button></div><section className="ai-console"><div className="ai-stream">{!history.length&&!busy?<div className="ai-welcome"><div className="ai-orb"><ALogo compact/><i/><i/></div><h2>Ask the customer graph.</h2><p>The assistant can connect a customer to their contacts, forms, products, service dates and open work.</p><div className="prompt-grid">{['Give me a complete breakdown of client Marino','Which service tasks are overdue and need attention?','Show clients with no email but upcoming service','Which imported tasks are still not linked to a customer?'].map(x=><button key={x} onClick={()=>setMessage(x)}>{x}<ArrowRight size={14}/></button>)}</div></div>:history.map(entry=><div className="ai-exchange" key={entry.id}><div className="prompt-bubble"><span>{entry.mode==='email'?<Mail size={15}/>:<MessageSquare size={15}/>}</span>{entry.prompt}</div><div className="answer-card"><div className="answer-mark"><ALogo compact/></div><div className="answer-content"><pre>{entry.answer}</pre>{entry.references?.length>0&&<div className="reference-chips">{entry.references.slice(0,10).map((ref,i)=><Link key={`${ref.type}-${ref.id}-${i}`} to={ref.type==='client'?`/clients/${ref.id}`:`/tasks?q=${encodeURIComponent(ref.label)}`}>{ref.type==='client'?<UserRound size={13}/>:<ListChecks size={13}/>} {ref.label}</Link>)}</div>}<div className="answer-footer"><span>{entry.model}</span><Button className="text-button" onClick={()=>void navigator.clipboard.writeText(entry.answer)}><Copy size={14}/> Copy</Button></div></div></div></div>)}{busy&&<div className="answer-card"><div className="answer-mark"><ALogo compact/></div><div className="thinking"><i/><i/><i/><span>Retrieving verified records and reasoning over relationships…</span></div></div>}<div ref={bottom}/></div>{error&&<div className="ai-error"><AlertTriangle size={16}/>{error}</div>}<form className="composer" onSubmit={submit}><textarea value={message} onChange={(e)=>setMessage(e.target.value)} placeholder={mode==='chat'?'Ask about a client, task, service date or pattern…':'Describe the follow-up email you need…'} rows={3}/><div><span><ShieldCheck size={14}/> Grounded data only</span><Button type="submit" className="button-primary" disabled={!message.trim()||busy}>{mode==='chat'?<Send size={16}/>:<Mail size={16}/>} {busy?'Working…':mode==='chat'?'Ask Intelligence':'Draft email'}</Button></div></form></section></div>;
}

function ImportsPage() {
  const {data,loading,error,reload}=useRequest<any>('/imports',[]);const s=data?.summary||{};const contactPct=s.contacts?Math.round((s.contacts_linked/s.contacts)*100):0;const taskPct=s.tasks?Math.round((s.tasks_linked/s.tasks)*100):0;
  return <div className="page"><PageHeader eyebrow="SOURCE PROVENANCE" title="Data Imports" subtitle="Every imported row remains traceable while duplicate customer accounts are consolidated conservatively." action={<Button className="button-secondary" onClick={()=>void reload()}><RefreshCw size={16}/> Refresh audit</Button>} />{error&&<ErrorBox error={error} retry={reload}/>} {loading?<Skeleton rows={6}/>:<><div className="metrics-grid"><MetricCard icon={<Users size={20}/>} label="Imported clients" value={s.imported_clients}/><MetricCard icon={<Layers3 size={20}/>} label="Duplicate rows collapsed" value={s.duplicate_rows_collapsed}/><MetricCard icon={<ContactRound size={20}/>} label="Contacts linked" value={s.contacts_linked} note={`${contactPct}% of ${fmtNumber(s.contacts)}`}/><MetricCard icon={<Link2 size={20}/>} label="Tasks linked" value={s.tasks_linked} note={`${taskPct}% of ${fmtNumber(s.tasks)}`}/></div><div className="imports-grid"><section className="panel"><div className="panel-head"><div><span className="panel-label">IMPORT SOURCES</span><h2>Loaded datasets</h2></div><Database size={18}/></div><div className="source-list">{safeArray(data?.sources).map((row:any,i)=><div key={`${row.source_file}-${i}`}><FileText size={17}/><div><strong>{row.source_file}</strong><span>{fmtNumber(row.rows)} source rows</span></div><CheckCircle2 size={17}/></div>)}</div></section><section className="panel"><div className="panel-head"><div><span className="panel-label">LINK QUALITY</span><h2>Entity resolution</h2></div><Gauge size={18}/></div><div className="coverage-ring-row"><div className="coverage-ring" style={{'--percent':`${contactPct*3.6}deg`} as React.CSSProperties}><strong>{contactPct}%</strong><span>Contacts</span></div><div className="coverage-ring" style={{'--percent':`${taskPct*3.6}deg`} as React.CSSProperties}><strong>{taskPct}%</strong><span>Tasks</span></div></div><div className="review-callout"><AlertTriangle size={17}/><div><strong>{fmtNumber(s.pending_reviews)} relationships require review</strong><p>They were not auto-linked because the available evidence was ambiguous.</p></div></div><Link className="button button-primary full" to="/review">Open Match Review</Link></section></div></>}</div>;
}

function ApplicationsPage() {
  const {data,loading,error,reload}=useRequest<{items:AnyRow[];total:number}>('/applications',[]);
  return <div className="page"><PageHeader eyebrow="DIGITAL INTAKE" title="Applications" subtitle={`${fmtNumber(data?.total)} online customer forms.`} action={<Link className="button button-primary" to="/applications/new"><Plus size={16}/> New application</Link>} />{error&&<ErrorBox error={error} retry={reload}/>}<section className="panel table-panel">{loading?<Skeleton rows={7}/>:!data?.items?.length?<EmptyState title="No applications" text="Imported customers remain visible under Clients. New online forms appear here." action={<Link className="button button-primary" to="/applications/new">Create application</Link>}/>:<div className="application-list">{data.items.map((row:any)=><Link key={row.id} to={`/applications/${row.id}`}><div className="avatar">{initials(row.client_name||'Client')}</div><div><strong>{row.client_name}</strong><span>{row.email||'No email'} · {row.city||'No city'}</span></div><time>{fmtDate(row.submitted_at)}</time><span className={statusClass(row.status)}>{row.status}</span><ChevronRight size={16}/></Link>)}</div>}</section></div>;
}

type FieldSpec={key:string;label:string;type?:'text'|'email'|'tel'|'date'|'textarea'|'check';wide?:boolean};
type FormSection={title:string;page:1|2;fields:FieldSpec[];staffOnly?:boolean;helper?:string};
const FORM_SECTIONS:FormSection[]=[
 {page:1,title:'1. Individual Customer',fields:[{key:'name',label:'Name'},{key:'surname',label:'Surname'},{key:'phone',label:'Phone',type:'tel'},{key:'email',label:'Email',type:'email'},{key:'address',label:'Address',wide:true},{key:'postal',label:'Postal Code'},{key:'city',label:'City'}]},
 {page:1,title:'2. Company Customer (if applicable)',fields:[{key:'company',label:'Company Name'},{key:'companyAddress',label:'Company Address'},{key:'companyPostal',label:'Postal Code'},{key:'companyCity',label:'City'},{key:'contactName',label:'Contact Person Name'},{key:'contactRole',label:'Contact Person Role / Position'},{key:'companyPhone',label:'Contact Person Phone',type:'tel'},{key:'companyEmail',label:'Contact Person Email',type:'email'}]},
 {page:1,title:'3. Contact Preferences',helper:'Preferred Contact Method (please select one or more)',fields:[{key:'prefPhone',label:'Phone',type:'check'},{key:'prefEmail',label:'Email',type:'check'},{key:'prefWhatsapp',label:'WhatsApp',type:'check'},{key:'prefOther',label:'Other',type:'check'},{key:'prefOtherText',label:'Other contact method',wide:true},{key:'sourceGoogle',label:'Google / Search',type:'check'},{key:'sourceSocial',label:'Social Media',type:'check'},{key:'sourceRecommendation',label:'Recommendation',type:'check'},{key:'sourceAdvertisement',label:'Advertisement',type:'check'},{key:'sourceEvent',label:'Event / Exhibition',type:'check'},{key:'sourceOther',label:'Other source',type:'check'},{key:'sourceOtherText',label:'Please specify source',wide:true}]},
 {page:1,title:'4. Additional Notes',fields:[{key:'notes',label:'Additional Notes',type:'textarea',wide:true}]},
 {page:2,title:'1. Property Type',fields:[{key:'privateHouse',label:'Private House',type:'check'},{key:'commercial',label:'Commercial Property',type:'check'},{key:'apartment',label:'Apartment',type:'check'},{key:'underConstruction',label:'Under custruction',type:'check'},{key:'existingBuilding',label:'Existing building',type:'check'},{key:'over20Years',label:'More than 20 years old',type:'check'}]},
 {page:2,title:'2. Property Address',fields:[{key:'propertyAddress',label:'Address',type:'textarea',wide:true},{key:'propertyPostal',label:'Postal Code'},{key:'propertyCity',label:'City'}]},
 {page:2,title:'3. Water Supply',fields:[{key:'municipal',label:'Direct Municipal Water',type:'check'},{key:'well',label:'Private Well',type:'check'},{key:'tank',label:'Tank',type:'check'},{key:'waterNotSure',label:'Not Sure',type:'check'},{key:'supplyPressure',label:'Approximate Water Pressure (if known)',wide:true}]},
 {page:2,title:'4. Kitchen Faucet',fields:[{key:'faucet3way',label:'3-Way Faucet',type:'check'},{key:'faucetStandard',label:'Standard Faucet',type:'check'},{key:'faucetNotSure',label:'Not Sure',type:'check'},{key:'faucetDetails',label:'Faucet or Sink Details',type:'textarea',wide:true}]},
 {page:2,title:'5. Water Pressure',fields:[{key:'pump',label:'Pressure Pump Installed',type:'check'},{key:'noPump',label:'No Pressure Pump',type:'check'},{key:'pumpNotSure',label:'Not Sure',type:'check'},{key:'waterPressure',label:'Approximate Water Pressure (if known)',wide:true}]},
 {page:2,title:'6. Water Softener Installation Provisions',fields:[{key:'provision',label:'Provision Available',type:'check'},{key:'provisionNotSure',label:'Not Sure',type:'check'},{key:'nearbyConnections',label:'Nearby Water / Drain / Electrical Connections',type:'check'},{key:'ladder',label:'Ladder Available',type:'check'},{key:'noLadder',label:'No Ladder Available',type:'check'},{key:'installationSpace',label:'Available Installation Space (L × W × H)',wide:true},{key:'installationOther',label:'Any other information',type:'textarea',wide:true}]},
 {page:2,title:'7. Number of Residents',fields:[{key:'residents',label:'Number of Residents'}]},
 {page:2,title:'8. Existing Water Filtration System',fields:[{key:'existingFiltration',label:'Existing Water Filtration System',type:'textarea',wide:true}]},
 {page:2,title:'9. Additional Property or Installation Notes',fields:[{key:'propertyNotes',label:'Additional Property or Installation Notes',type:'textarea',wide:true}]},
 {page:2,title:'10. For Office / Technician Use',staffOnly:true,fields:[{key:'siteVisit',label:'Site Visit Date',type:'date'},{key:'assessedBy',label:'Assessed By'},{key:'status',label:'Application Status'}]},
];

function FormField({spec,data,setData}:{spec:FieldSpec;data:ApplicationData;setData:(key:string,value:string|boolean)=>void}){
 if(spec.type==='check')return <label className="check-field"><input type="checkbox" checked={Boolean(data[spec.key])} onChange={(e)=>setData(spec.key,e.target.checked)}/><span><Check size={13}/></span>{spec.label}</label>;
 if(spec.key==='status')return <label className="form-field"><span>{spec.label}</span><select value={String(data[spec.key]||'New')} onChange={(e)=>setData(spec.key,e.target.value)}>{APPLICATION_STATUSES.map(x=><option key={x}>{x}</option>)}</select></label>;
 return <label className={`form-field ${spec.wide?'wide':''}`}><span>{spec.label}</span>{spec.type==='textarea'?<textarea rows={3} value={String(data[spec.key]||'')} onChange={(e)=>setData(spec.key,e.target.value)}/>:<input type={spec.type||'text'} value={String(data[spec.key]||'')} onChange={(e)=>setData(spec.key,e.target.value)}/>}</label>;
}

function PrintableForm({data}:{data:ApplicationData}){return <div className="print-form"><div className="print-head"><ALogo compact/><div><strong>AQUAPHOR</strong><span>Customer Application Form</span></div></div>{[1,2].map(page=><section className="print-page" key={page}><h2>Page {page} — {page===1?'Customer Details':'Property & Water System Details'}</h2>{FORM_SECTIONS.filter(s=>s.page===page).map(section=><div key={section.title}><h3>{section.title}</h3><dl>{section.fields.map(field=>data[field.key]!==undefined&&data[field.key]!==''&&data[field.key]!==false?<div key={field.key}><dt>{field.label}</dt><dd>{field.type==='check'?'✓':String(data[field.key])}</dd></div>:null)}</dl></div>)}</section>)}</div>}

function ApplicationForm({publicMode=false,editId}:{publicMode?:boolean;editId?:string}){
 const navigate=useNavigate();const [step,setStep]=useState<1|2|3>(1);const [data,setDataState]=useState<ApplicationData>({status:'New'});const [loading,setLoading]=useState(Boolean(editId));const [saving,setSaving]=useState(false);const [error,setError]=useState('');const [saved,setSaved]=useState<any>();const key=useRef(crypto.randomUUID());
 useEffect(()=>{if(editId)coreRequest<any>(`/applications/${editId}`).then(r=>{const a=r.application;setDataState({...a.form_data,status:a.status,siteVisit:a.site_visit_date||'',assessedBy:a.assessed_by||''})}).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[editId]);
 const setData=(k:string,v:string|boolean)=>setDataState(p=>({...p,[k]:v}));
 function validate(){if(!String(data.name||'').trim()&&!String(data.company||'').trim()){setError('Provide an individual name or company name.');return false}const email=String(data.email||data.companyEmail||'');if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){setError('Please provide a valid email address.');return false}setError('');return true}
 async function submit(){if(!validate()||saving)return;setSaving(true);setError('');try{const result=publicMode?await submitPublicApplication(data,key.current):editId?await coreRequest<any>(`/applications/${editId}`,{method:'PATCH',body:JSON.stringify({data})}):await coreRequest<any>('/applications',{method:'POST',body:JSON.stringify({data,idempotencyKey:key.current})});setSaved(result);if(!publicMode)setTimeout(()=>navigate(`/clients/${result.clientId}`),900)}catch(e){setError(e instanceof Error?e.message:'Could not save application')}finally{setSaving(false)}}
 if(loading)return <div className="page"><Skeleton rows={8}/></div>;
 if(saved&&publicMode)return <div className="public-page"><PublicBrand/><section className="public-success"><div className="success-check"><CheckCircle2 size={30}/></div><span>APPLICATION RECEIVED</span><h1>Thank you. Your details are now connected.</h1><p>AQUAPHOR Cyprus can review the information you supplied and contact you using your selected preference.</p><Button className="button-secondary" onClick={()=>window.print()}><Download size={16}/> Print / Save completed form</Button></section><div className="print-only"><PrintableForm data={data}/></div></div>;
 const content=<><div className="form-progress"><div className={step>=1?'active':''}><span>1</span><b>Customer details</b></div><i/><div className={step>=2?'active':''}><span>2</span><b>Property & water system</b></div><i/><div className={step>=3?'active':''}><span>3</span><b>Review & save</b></div></div>{step<3?<div className="form-sections">{FORM_SECTIONS.filter(s=>s.page===step&&(!s.staffOnly||!publicMode)).map(section=><section className={section.staffOnly?'form-section office-section':'form-section'} key={section.title}><div className="section-title"><span>{section.staffOnly?<ClipboardCheck size={17}/>:<FileText size={17}/>}</span><div><h3>{section.title}</h3>{section.helper&&<p>{section.helper}</p>}</div></div><div className="form-grid">{section.fields.map(field=><FormField key={field.key} spec={field} data={data} setData={setData}/>)}</div></section>)}</div>:<div className="review-document"><PrintableForm data={data}/></div>}{error&&<div className="inline-error form-error"><AlertTriangle size={16}/>{error}</div>}<div className="form-footer"><Button className="button-ghost" onClick={()=>step===1?(publicMode?history.back():navigate('/applications')):setStep((step-1) as 1|2|3)}><ChevronLeft size={16}/>{step===1?'Cancel':'Back'}</Button><div>{step===3&&<Button className="button-secondary" onClick={()=>window.print()}><Download size={16}/> Print / Save PDF</Button>}{step<3?<Button className="button-primary" onClick={()=>{if(step===1&&!validate())return;setStep((step+1) as 1|2|3)}}>Continue <ArrowRight size={16}/></Button>:<Button className="button-primary" disabled={saving} onClick={()=>void submit()}><Save size={16}/>{saving?'Saving…':editId?'Save changes':'Save application'}</Button>}</div></div><div className="print-only"><PrintableForm data={data}/></div></>;
 if(publicMode)return <div className="public-page"><PublicBrand/><div className="public-form-wrap"><div className="public-intro"><span>ONLINE CUSTOMER APPLICATION</span><h1>Help us understand your water and property.</h1><p>Complete the two-page form. Your information is saved securely for the AQUAPHOR Cyprus team.</p></div>{content}</div></div>;
 return <div className="page form-page"><PageHeader eyebrow="CUSTOMER APPLICATION" title={editId?'Edit application':'New application'} subtitle="The complete two-page AQUAPHOR intake form. Every saved form updates the client graph immediately." />{content}</div>;
}

function PublicBrand(){return <header className="public-brand"><div className="brand-lockup"><ALogo compact/><div><strong>AQUAPHOR</strong><span>Customer Application</span></div></div><span>Cyprus</span></header>}
function EditApplicationPage(){const{id}=useParams();return <ApplicationForm editId={id}/>}

function SettingsPage(){const navigate=useNavigate();return <div className="page"><PageHeader eyebrow="WORKSPACE CONTROL" title="Settings" subtitle="Current testing configuration and production-readiness status."/><div className="settings-grid"><section className="setting-card"><div className="setting-icon"><ShieldCheck size={21}/></div><div><span>Workspace mode</span><strong>Protected testing</strong><p>No user account is required. A temporary workspace code protects real customer data.</p></div><span className="setting-state blue">Active</span></section><section className="setting-card"><div className="setting-icon"><Bot size={21}/></div><div><span>AI architecture</span><strong>Grounded retrieval + OpenAI</strong><p>The model receives only matching client, contact, application and task records.</p></div><span className="setting-state green">Connected</span></section><section className="setting-card"><div className="setting-icon"><Database size={21}/></div><div><span>Database</span><strong>Supabase · Frankfurt</strong><p>Canonical clients, source provenance and relationship review are separated.</p></div><span className="setting-state green">Healthy</span></section><section className="setting-card"><div className="setting-icon"><LockKeyhole size={21}/></div><div><span>Direct table access</span><strong>Blocked by RLS</strong><p>Administrative reads and writes pass through the controlled Edge API.</p></div><span className="setting-state green">Protected</span></section></div><div className="production-note"><AlertTriangle size={19}/><div><strong>Before external production use</strong><p>Replace the temporary workspace code with named staff authentication, enforce role-based permissions, configure audit retention and complete a data-protection review.</p></div></div><Button className="button-secondary" onClick={()=>{setAccessCode('');navigate('/');location.reload()}}><LockKeyhole size={16}/> Lock this browser session</Button></div>}

function RoutedApp(){const loc=useLocation();if(loc.pathname.startsWith('/apply'))return <Routes><Route path="/apply" element={<ApplicationForm publicMode/>}/><Route path="*" element={<ApplicationForm publicMode/>}/></Routes>;return <AccessGate><InternalLayout><Routes><Route path="/" element={<Dashboard/>}/><Route path="/clients" element={<ClientsPage/>}/><Route path="/clients/:id" element={<ClientProfilePage/>}/><Route path="/contacts" element={<ContactsPage/>}/><Route path="/applications" element={<ApplicationsPage/>}/><Route path="/applications/new" element={<ApplicationForm/>}/><Route path="/applications/:id" element={<EditApplicationPage/>}/><Route path="/tasks" element={<TasksPage/>}/><Route path="/review" element={<MatchReviewPage/>}/><Route path="/intelligence" element={<IntelligencePage/>}/><Route path="/imports" element={<ImportsPage/>}/><Route path="/settings" element={<SettingsPage/>}/><Route path="*" element={<Dashboard/>}/></Routes></InternalLayout></AccessGate>}
export default function EliteApp(){return <RoutedApp/>}
