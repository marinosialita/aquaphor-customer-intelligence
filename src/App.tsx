import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Bot, Building2, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Download,
  Droplets, FileText, LayoutDashboard, Mail, Menu, MessageSquare, Plus, Save, Search,
  Settings as SettingsIcon, Trash2, UserRound, Users, X,
} from 'lucide-react';
import { apiRequest, askAi } from './api';

type Status = 'New' | 'Reviewing' | 'Visit scheduled' | 'Completed';

type ApplicationData = {
  name?: string; surname?: string; phone?: string; email?: string; address?: string; postal?: string; city?: string;
  company?: string; companyAddress?: string; companyPostal?: string; companyCity?: string; contactName?: string; contactRole?: string;
  companyPhone?: string; companyEmail?: string;
  prefPhone?: boolean; prefEmail?: boolean; prefWhatsapp?: boolean; prefOther?: boolean; prefOtherText?: string;
  sourceGoogle?: boolean; sourceSocial?: boolean; sourceRecommendation?: boolean; sourceAdvertisement?: boolean; sourceEvent?: boolean; sourceOther?: boolean; sourceOtherText?: string;
  notes?: string;
  privateHouse?: boolean; commercial?: boolean; apartment?: boolean; underConstruction?: boolean; existingBuilding?: boolean; over20Years?: boolean;
  propertyAddress?: string; propertyPostal?: string; propertyCity?: string;
  municipal?: boolean; well?: boolean; tank?: boolean; waterNotSure?: boolean; supplyPressure?: string;
  faucet3way?: boolean; faucetStandard?: boolean; faucetNotSure?: boolean; faucetDetails?: string;
  pump?: boolean; noPump?: boolean; pumpNotSure?: boolean; waterPressure?: string;
  provision?: boolean; provisionNotSure?: boolean; nearbyConnections?: boolean; ladder?: boolean; noLadder?: boolean; installationSpace?: string; installationOther?: string;
  residents?: string; existingFiltration?: string; propertyNotes?: string;
  siteVisit?: string; assessedBy?: string; status?: Status;
};

type ApiRecord = {
  id: string;
  clientId: string;
  clientType: string;
  name?: string | null;
  surname?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  applicationDate?: string | null;
  submittedAt?: string | null;
  status: Status;
  notes?: string | null;
  siteVisit?: string | null;
  assessedBy?: string | null;
  formData: ApplicationData;
};

const statuses: Status[] = ['New', 'Reviewing', 'Visit scheduled', 'Completed'];

function displayName(r: ApiRecord) {
  const full = [r.name, r.surname].filter(Boolean).join(' ');
  return full || r.company || 'Unnamed client';
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((x) => x[0] || '').join('').toUpperCase() || 'C';
}

function fmtDate(v?: string | null) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
}

function statusClass(status: Status) {
  return `status status-${status.toLowerCase().replaceAll(' ', '-')}`;
}

function Button({ children, className = '', type = 'button', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={`btn ${className}`} {...props}>{children}</button>;
}

function Field({ label, value, onChange, type = 'text', placeholder = '', textarea = false }: {
  label: string; value?: string; onChange: (v: string) => void; type?: string; placeholder?: string; textarea?: boolean;
}) {
  return <label className="field"><span>{label}</span>{textarea ?
    <textarea rows={3} value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /> :
    <input type={type} value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}
  </label>;
}

function Check({ label, checked, onChange }: { label: string; checked?: boolean; onChange: (v: boolean) => void }) {
  return <label className="check"><input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} /><span>{label}</span></label>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="form-section"><h3>{title}</h3>{children}</section>;
}

function updateField(setData: React.Dispatch<React.SetStateAction<ApplicationData>>, key: keyof ApplicationData, value: string | boolean) {
  setData((prev) => ({ ...prev, [key]: value }));
}

function Page1({ data, setData }: { data: ApplicationData; setData: React.Dispatch<React.SetStateAction<ApplicationData>> }) {
  return <div className="form-stack">
    <Section title="1. Individual Customer">
      <div className="grid2"><Field label="Name" value={data.name} onChange={(v) => updateField(setData, 'name', v)} /><Field label="Surname" value={data.surname} onChange={(v) => updateField(setData, 'surname', v)} /></div>
      <div className="grid2"><Field label="Phone" value={data.phone} onChange={(v) => updateField(setData, 'phone', v)} /><Field label="Email" type="email" value={data.email} onChange={(v) => updateField(setData, 'email', v)} /></div>
      <Field label="Address" value={data.address} onChange={(v) => updateField(setData, 'address', v)} />
      <div className="grid2"><Field label="Postal Code" value={data.postal} onChange={(v) => updateField(setData, 'postal', v)} /><Field label="City" value={data.city} onChange={(v) => updateField(setData, 'city', v)} /></div>
    </Section>
    <Section title="2. Company Customer (if applicable)">
      <div className="grid2"><Field label="Company Name" value={data.company} onChange={(v) => updateField(setData, 'company', v)} /><Field label="Company Address" value={data.companyAddress} onChange={(v) => updateField(setData, 'companyAddress', v)} /></div>
      <div className="grid2"><Field label="Postal Code" value={data.companyPostal} onChange={(v) => updateField(setData, 'companyPostal', v)} /><Field label="City" value={data.companyCity} onChange={(v) => updateField(setData, 'companyCity', v)} /></div>
      <div className="grid2"><Field label="Contact Person Name" value={data.contactName} onChange={(v) => updateField(setData, 'contactName', v)} /><Field label="Contact Person Role / Position" value={data.contactRole} onChange={(v) => updateField(setData, 'contactRole', v)} /></div>
      <div className="grid2"><Field label="Contact Person Phone" value={data.companyPhone} onChange={(v) => updateField(setData, 'companyPhone', v)} /><Field label="Contact Person Email" type="email" value={data.companyEmail} onChange={(v) => updateField(setData, 'companyEmail', v)} /></div>
    </Section>
    <Section title="3. Contact Preferences">
      <p className="helper">Preferred Contact Method (please select one or more)</p>
      <div className="checks"><Check label="Phone" checked={data.prefPhone} onChange={(v) => updateField(setData, 'prefPhone', v)} /><Check label="Email" checked={data.prefEmail} onChange={(v) => updateField(setData, 'prefEmail', v)} /><Check label="WhatsApp" checked={data.prefWhatsapp} onChange={(v) => updateField(setData, 'prefWhatsapp', v)} /><Check label="Other" checked={data.prefOther} onChange={(v) => updateField(setData, 'prefOther', v)} /></div>
      {data.prefOther && <Field label="Other contact method" value={data.prefOtherText} onChange={(v) => updateField(setData, 'prefOtherText', v)} />}
      <p className="helper">How did you hear about us? (please select one or more)</p>
      <div className="checks"><Check label="Google / Search" checked={data.sourceGoogle} onChange={(v) => updateField(setData, 'sourceGoogle', v)} /><Check label="Social Media" checked={data.sourceSocial} onChange={(v) => updateField(setData, 'sourceSocial', v)} /><Check label="Recommendation" checked={data.sourceRecommendation} onChange={(v) => updateField(setData, 'sourceRecommendation', v)} /><Check label="Advertisement" checked={data.sourceAdvertisement} onChange={(v) => updateField(setData, 'sourceAdvertisement', v)} /><Check label="Event / Exhibition" checked={data.sourceEvent} onChange={(v) => updateField(setData, 'sourceEvent', v)} /><Check label="Other" checked={data.sourceOther} onChange={(v) => updateField(setData, 'sourceOther', v)} /></div>
      {data.sourceOther && <Field label="Please specify" value={data.sourceOtherText} onChange={(v) => updateField(setData, 'sourceOtherText', v)} />}
    </Section>
    <Section title="4. Additional Notes"><Field label="Notes" textarea value={data.notes} onChange={(v) => updateField(setData, 'notes', v)} /></Section>
  </div>;
}

function Page2({ data, setData, staff }: { data: ApplicationData; setData: React.Dispatch<React.SetStateAction<ApplicationData>>; staff: boolean }) {
  return <div className="form-stack">
    <div className="grid2 align-start">
      <div className="form-stack">
        <Section title="1. Property Type"><div className="checks vertical"><Check label="Private House" checked={data.privateHouse} onChange={(v) => updateField(setData, 'privateHouse', v)} /><Check label="Commercial Property" checked={data.commercial} onChange={(v) => updateField(setData, 'commercial', v)} /><Check label="Apartment" checked={data.apartment} onChange={(v) => updateField(setData, 'apartment', v)} /><Check label="Under custruction" checked={data.underConstruction} onChange={(v) => updateField(setData, 'underConstruction', v)} /><Check label="Existing building" checked={data.existingBuilding} onChange={(v) => updateField(setData, 'existingBuilding', v)} /><Check label="More than 20 years old" checked={data.over20Years} onChange={(v) => updateField(setData, 'over20Years', v)} /></div></Section>
        <Section title="3. Water Supply"><div className="checks vertical"><Check label="Direct Municipal Water" checked={data.municipal} onChange={(v) => updateField(setData, 'municipal', v)} /><Check label="Private Well" checked={data.well} onChange={(v) => updateField(setData, 'well', v)} /><Check label="Tank" checked={data.tank} onChange={(v) => updateField(setData, 'tank', v)} /><Check label="Not Sure" checked={data.waterNotSure} onChange={(v) => updateField(setData, 'waterNotSure', v)} /></div><Field label="Approximate Water Pressure (if known)" value={data.supplyPressure} onChange={(v) => updateField(setData, 'supplyPressure', v)} /></Section>
        <Section title="5. Water Pressure"><div className="checks vertical"><Check label="Pressure Pump Installed" checked={data.pump} onChange={(v) => updateField(setData, 'pump', v)} /><Check label="No Pressure Pump" checked={data.noPump} onChange={(v) => updateField(setData, 'noPump', v)} /><Check label="Not Sure" checked={data.pumpNotSure} onChange={(v) => updateField(setData, 'pumpNotSure', v)} /></div><Field label="Approximate Water Pressure (if known)" value={data.waterPressure} onChange={(v) => updateField(setData, 'waterPressure', v)} /></Section>
        <Section title="7. Number of Residents"><Field label="Number of Residents" value={data.residents} onChange={(v) => updateField(setData, 'residents', v)} /></Section>
        <Section title="8. Existing Water Filtration System"><Field textarea label="Existing Filtration System" value={data.existingFiltration} onChange={(v) => updateField(setData, 'existingFiltration', v)} /></Section>
      </div>
      <div className="form-stack">
        <Section title="2. Property Address"><Field textarea label="Property Address" value={data.propertyAddress} onChange={(v) => updateField(setData, 'propertyAddress', v)} /><div className="grid2"><Field label="Postal Code" value={data.propertyPostal} onChange={(v) => updateField(setData, 'propertyPostal', v)} /><Field label="City" value={data.propertyCity} onChange={(v) => updateField(setData, 'propertyCity', v)} /></div></Section>
        <Section title="4. Kitchen Faucet"><div className="checks vertical"><Check label="3-Way Faucet" checked={data.faucet3way} onChange={(v) => updateField(setData, 'faucet3way', v)} /><Check label="Standard Faucet" checked={data.faucetStandard} onChange={(v) => updateField(setData, 'faucetStandard', v)} /><Check label="Not Sure" checked={data.faucetNotSure} onChange={(v) => updateField(setData, 'faucetNotSure', v)} /></div><Field textarea label="Faucet or Sink Details" value={data.faucetDetails} onChange={(v) => updateField(setData, 'faucetDetails', v)} /></Section>
        <Section title="6. Water Softener Installation Provisions"><div className="checks vertical"><Check label="Provision Available" checked={data.provision} onChange={(v) => updateField(setData, 'provision', v)} /><Check label="Not Sure" checked={data.provisionNotSure} onChange={(v) => updateField(setData, 'provisionNotSure', v)} /><Check label="Nearby Water / Drain / Electrical Connections" checked={data.nearbyConnections} onChange={(v) => updateField(setData, 'nearbyConnections', v)} /></div><p className="helper">Roof Access</p><div className="checks"><Check label="Ladder Available" checked={data.ladder} onChange={(v) => updateField(setData, 'ladder', v)} /><Check label="No Ladder Available" checked={data.noLadder} onChange={(v) => updateField(setData, 'noLadder', v)} /></div><Field label="Available Installation Space (L × W × H)" value={data.installationSpace} onChange={(v) => updateField(setData, 'installationSpace', v)} /><Field textarea label="Any other information" value={data.installationOther} onChange={(v) => updateField(setData, 'installationOther', v)} /></Section>
      </div>
    </div>
    <Section title="9. Additional Property or Installation Notes"><Field textarea label="Notes" value={data.propertyNotes} onChange={(v) => updateField(setData, 'propertyNotes', v)} /></Section>
    {staff && <div className="office-box"><h3>For Office / Technician Use</h3><div className="grid2"><Field type="date" label="Site Visit Date" value={data.siteVisit} onChange={(v) => updateField(setData, 'siteVisit', v)} /><Field label="Assessed By" value={data.assessedBy} onChange={(v) => updateField(setData, 'assessedBy', v)} /></div></div>}
  </div>;
}

function Review({ data }: { data: ApplicationData }) {
  const rows: [string, string][] = [
    ['Client', [data.name, data.surname].filter(Boolean).join(' ') || data.company || '—'],
    ['Email', data.email || data.companyEmail || '—'], ['Phone', data.phone || data.companyPhone || '—'],
    ['City', data.city || data.propertyCity || data.companyCity || '—'], ['Property address', data.propertyAddress || '—'],
    ['Water supply', data.municipal ? 'Municipal' : data.well ? 'Private Well' : data.tank ? 'Tank' : data.waterNotSure ? 'Not Sure' : '—'],
    ['Kitchen faucet', data.faucet3way ? '3-Way Faucet' : data.faucetStandard ? 'Standard Faucet' : data.faucetNotSure ? 'Not Sure' : '—'],
    ['Pressure pump', data.pump ? 'Installed' : data.noPump ? 'No pressure pump' : data.pumpNotSure ? 'Not Sure' : '—'],
    ['Residents', data.residents || '—'], ['Site visit', data.siteVisit || '—'], ['Assessed by', data.assessedBy || '—'],
  ];
  return <div className="review-grid">{rows.map(([k, v]) => <div key={k}><span>{k}</span><strong>{v}</strong></div>)}</div>;
}

function ApplicationForm({ publicMode = false, initial, applicationId }: { publicMode?: boolean; initial?: ApplicationData; applicationId?: string }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<ApplicationData>(initial || {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const idempotency = useRef(`aquaphor-${crypto.randomUUID()}`);

  useEffect(() => { if (initial) setData(initial); }, [initial]);

  const validate = () => {
    if (!data.name?.trim() && !data.company?.trim()) return 'Please provide an individual name or company name.';
    if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) return 'Please enter a valid email address.';
    return '';
  };

  async function save() {
    const v = validate(); if (v) { setError(v); return; }
    setSaving(true); setError('');
    try {
      if (applicationId) {
        const res = await apiRequest<{ application: ApiRecord }>(`/applications/${applicationId}`, { method: 'PATCH', body: JSON.stringify({ data }) });
        navigate(`/applications/${res.application.id}`);
      } else {
        const path = publicMode ? '/public-apply' : '/applications';
        const res = await apiRequest<{ application: ApiRecord }>(path, { method: 'POST', body: JSON.stringify({ idempotencyKey: idempotency.current, data: publicMode ? { ...data, siteVisit: undefined, assessedBy: undefined, status: undefined } : data }) });
        if (publicMode) navigate(`/apply/confirm?id=${res.application.id}`); else navigate(`/applications/${res.application.id}`);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save application.'); }
    finally { setSaving(false); }
  }

  return <div className={publicMode ? 'public-wrap' : 'page narrow'}>
    {publicMode && <PublicHeader />}
    <div className={publicMode ? 'public-card' : ''}>
      <div className="page-heading"><div><h1>Customer Application Form</h1><p>{publicMode ? 'Complete the form and AQUAPHOR Cyprus will contact you.' : applicationId ? 'Edit saved application' : 'New application — testing workspace'}</p></div></div>
      <div className="steps"><div className={step >= 0 ? 'active' : ''}>1 <span>Customer Details</span></div><i /><div className={step >= 1 ? 'active' : ''}>2 <span>Property & Water</span></div><i /><div className={step >= 2 ? 'active' : ''}>3 <span>Review</span></div></div>
      {error && <div className="error-box">{error}</div>}
      <div className="card form-card">{step === 0 ? <Page1 data={data} setData={setData} /> : step === 1 ? <Page2 data={data} setData={setData} staff={!publicMode} /> : <Review data={data} />}</div>
      <div className="form-actions"><Button className="btn-ghost" onClick={() => step === 0 ? (publicMode ? navigate('/apply') : navigate('/applications')) : setStep((s) => s - 1)}><ChevronLeft size={16} /> {step === 0 ? 'Cancel' : 'Back'}</Button>{step < 2 ? <Button className="btn-primary" onClick={() => { const v = step === 0 ? validate() : ''; if (v) setError(v); else { setError(''); setStep((s) => s + 1); } }}>Continue <ChevronRight size={16} /></Button> : <Button className="btn-primary" disabled={saving} onClick={save}><Save size={16} /> {saving ? 'Saving…' : publicMode ? 'Submit Application' : applicationId ? 'Save Changes' : 'Save Application'}</Button>}</div>
    </div>
  </div>;
}

function PublicHeader() { return <header className="public-header"><div className="brand-mark"><Droplets size={18} /></div><div><b>AQUAPHOR</b><small>Customer Application</small></div></header>; }

function PublicApply() { return <ApplicationForm publicMode />; }
function PublicConfirm() { return <div className="public-wrap"><PublicHeader /><div className="success-card"><CheckCircle2 size={54} /><h1>Application submitted</h1><p>Your details have been saved. AQUAPHOR Cyprus can now review your application.</p><Link className="btn btn-outline" to="/apply">Submit another application</Link></div></div>; }

function useRecords(path: '/clients' | '/applications') {
  const [records, setRecords] = useState<ApiRecord[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = async () => { setLoading(true); try { const res = await apiRequest<any>(path); setRecords(res.clients || res.applications || []); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load records'); } finally { setLoading(false); } };
  useEffect(() => { load(); }, [path]);
  return { records, loading, error, reload: load };
}

function Dashboard() {
  const [metrics, setMetrics] = useState<{ total: number; byStatus: Record<Status, number> }>();
  const { records } = useRecords('/applications');
  useEffect(() => { apiRequest<any>('/metrics').then(setMetrics).catch(() => undefined); }, []);
  return <div className="page"><div className="hero"><div><div className="eyebrow"><Droplets size={16} /> AQUAPHOR CYPRUS</div><h1>Customer Intelligence</h1><p>Applications, client follow-up and water-system assessments in one workspace.</p></div><Link className="btn hero-btn" to="/applications/new"><Plus size={16} /> New Application</Link></div>
    <div className="metrics"><Metric label="Total Clients" value={metrics?.total ?? 0} icon={<Users size={20} />} /><Metric label="Reviewing" value={metrics?.byStatus?.Reviewing ?? 0} icon={<ClipboardList size={20} />} /><Metric label="Visit Scheduled" value={metrics?.byStatus?.['Visit scheduled'] ?? 0} icon={<FileText size={20} />} /><Metric label="Completed" value={metrics?.byStatus?.Completed ?? 0} icon={<CheckCircle2 size={20} />} /></div>
    <div className="card"><div className="card-title"><h2>Recent Applications</h2><Link to="/applications">View all</Link></div>{records.length === 0 ? <Empty title="No applications yet" text="Create the first real application. No demo data is used." /> : <div className="table-wrap"><table><thead><tr><th>Client</th><th>City</th><th>Application Date</th><th>Status</th><th /></tr></thead><tbody>{records.slice(0, 6).map((r) => <tr key={r.id}><td><ClientCell r={r} /></td><td>{r.city || '—'}</td><td>{fmtDate(r.applicationDate || r.submittedAt)}</td><td><span className={statusClass(r.status)}>{r.status}</span></td><td><Link to={`/applications/${r.id}`}>Open</Link></td></tr>)}</tbody></table></div>}</div>
  </div>;
}

function Metric({ label, value, icon }: { label: string; value: number; icon: ReactNode }) { return <div className="metric"><div><span>{label}</span><strong>{value}</strong></div><i>{icon}</i></div>; }
function ClientCell({ r }: { r: ApiRecord }) { const n = displayName(r); return <div className="client-cell"><div className="avatar">{initials(n)}</div><div><strong>{n}</strong><small>{r.email || 'No email'}</small></div></div>; }
function Empty({ title, text }: { title: string; text: string }) { return <div className="empty"><FileText size={34} /><h3>{title}</h3><p>{text}</p></div>; }

function Clients() {
  const { records, loading, error } = useRecords('/clients'); const [q, setQ] = useState(''); const [filter, setFilter] = useState('all');
  const filtered = useMemo(() => records.filter((r) => { const hay = `${displayName(r)} ${r.email || ''} ${r.city || ''}`.toLowerCase(); return hay.includes(q.toLowerCase()) && (filter === 'all' || r.status === filter); }), [records, q, filter]);
  return <div className="page"><div className="page-heading"><div><h1>Clients</h1><p>{filtered.length} client records</p></div><Link className="btn btn-primary" to="/applications/new"><Plus size={16} /> Add Client</Link></div><div className="toolbar"><div className="search"><Search size={16} /><input placeholder="Search name, email, city…" value={q} onChange={(e) => setQ(e.target.value)} /></div><select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All statuses</option>{statuses.map((s) => <option key={s}>{s}</option>)}</select></div>{error && <div className="error-box">{error}</div>}<div className="card table-wrap">{loading ? <div className="loading">Loading clients…</div> : filtered.length === 0 ? <Empty title="No clients yet" text="Saved applications will automatically appear here." /> : <table><thead><tr><th>Client</th><th>Email</th><th>City</th><th>Application Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.map((r) => <tr key={r.id}><td><ClientCell r={r} /></td><td>{r.email || '—'}</td><td>{r.city || '—'}</td><td>{fmtDate(r.applicationDate || r.submittedAt)}</td><td><span className={statusClass(r.status)}>{r.status}</span></td><td><Link to={`/clients/${r.clientId}`}>View profile →</Link></td></tr>)}</tbody></table>}</div></div>;
}

function Applications() {
  const { records, loading, error } = useRecords('/applications');
  return <div className="page"><div className="page-heading"><div><h1>Applications</h1><p>{records.length} saved applications</p></div><Link className="btn btn-primary" to="/applications/new"><Plus size={16} /> New Application</Link></div>{error && <div className="error-box">{error}</div>}<div className="list-card">{loading ? <div className="loading">Loading applications…</div> : records.length === 0 ? <Empty title="No applications yet" text="Create your first application." /> : records.map((r) => <Link className="application-row" key={r.id} to={`/applications/${r.id}`}><div className="avatar">{initials(displayName(r))}</div><div className="grow"><strong>{displayName(r)}</strong><span>{r.city || 'No city'} · {fmtDate(r.submittedAt)}</span></div><span className={statusClass(r.status)}>{r.status}</span><ChevronRight size={17} /></Link>)}</div></div>;
}

function ClientProfile() {
  const { id } = useParams(); const [r, setR] = useState<ApiRecord>(); const [error, setError] = useState('');
  useEffect(() => { if (id) apiRequest<{ client: ApiRecord }>(`/clients/${id}`).then((x) => setR(x.client)).catch((e) => setError(e.message)); }, [id]);
  if (error) return <div className="page"><div className="error-box">{error}</div></div>; if (!r) return <div className="page loading">Loading client…</div>;
  const data = r.formData || {};
  return <div className="page narrow"><div className="detail-top"><Link to="/clients"><ChevronLeft size={16} /> Clients</Link><Link className="btn btn-outline" to={`/applications/${r.id}`}>Edit Application</Link></div><div className="profile-card"><div className="avatar large">{initials(displayName(r))}</div><div><h1>{displayName(r)}</h1><p>{r.email || 'No email'} · {r.phone || 'No phone'}</p><small>Application date {fmtDate(r.applicationDate || r.submittedAt)}</small></div><span className={statusClass(r.status)}>{r.status}</span></div><div className="detail-grid"><Detail title="Contact" rows={[['Email', r.email], ['Phone', r.phone], ['City', r.city], ['Address', data.address]]} /><Detail title="Property" rows={[['Property Address', data.propertyAddress], ['Property City', data.propertyCity], ['Residents', data.residents], ['Existing Filtration', data.existingFiltration]]} /><Detail title="Water System" rows={[['Supply', data.municipal ? 'Municipal' : data.well ? 'Private Well' : data.tank ? 'Tank' : data.waterNotSure ? 'Not Sure' : undefined], ['Supply Pressure', data.supplyPressure], ['Water Pressure', data.waterPressure], ['Installation Space', data.installationSpace]]} /><Detail title="Technician" rows={[['Site Visit', r.siteVisit], ['Assessed By', r.assessedBy], ['Notes', r.notes], ['Property Notes', data.propertyNotes]]} /></div></div>;
}

function Detail({ title, rows }: { title: string; rows: [string, any][] }) { return <div className="card detail"><h3>{title}</h3>{rows.map(([k, v]) => <div key={k}><span>{k}</span><strong>{v || 'Not provided'}</strong></div>)}</div>; }

function EditApplication() {
  const { id } = useParams(); const navigate = useNavigate(); const [r, setR] = useState<ApiRecord>(); const [error, setError] = useState('');
  useEffect(() => { if (id) apiRequest<{ application: ApiRecord }>(`/applications/${id}`).then((x) => setR(x.application)).catch((e) => setError(e.message)); }, [id]);
  if (error) return <div className="page"><div className="error-box">{error}</div></div>; if (!r) return <div className="page loading">Loading application…</div>;
  return <div><div className="page narrow detail-top"><Link to="/applications"><ChevronLeft size={16} /> Applications</Link><Button className="btn-danger" onClick={async () => { if (!confirm('Delete this application and client record?')) return; await apiRequest(`/applications/${r.id}`, { method: 'DELETE' }); navigate('/clients'); }}><Trash2 size={15} /> Delete</Button></div><ApplicationForm initial={{ ...r.formData, status: r.status, siteVisit: r.siteVisit || undefined, assessedBy: r.assessedBy || undefined }} applicationId={r.id} /></div>;
}

function AiAssistant() {
  const [mode, setMode] = useState<'chat' | 'email'>('chat'); const [message, setMessage] = useState(''); const [history, setHistory] = useState<{ mode: string; prompt: string; answer: string; model?: string }[]>([]); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(e: FormEvent) { e.preventDefault(); if (!message.trim() || busy) return; const prompt = message.trim(); setBusy(true); setError(''); setMessage(''); try { const res = await askAi(mode, prompt); setHistory((h) => [...h, { mode, prompt, answer: res.answer, model: res.model }]); } catch (err) { setError(err instanceof Error ? err.message : 'AI request failed'); } finally { setBusy(false); } }
  return <div className="page ai-page"><div className="page-heading"><div><h1>AQUAPHOR Assistant</h1><p>Live AI grounded only in saved AQUAPHOR client records.</p></div><span className="model-pill">GPT-5.6 Luna</span></div><div className="mode-tabs"><button className={mode === 'chat' ? 'active' : ''} onClick={() => setMode('chat')}><MessageSquare size={17} /> Chat</button><button className={mode === 'email' ? 'active' : ''} onClick={() => setMode('email')}><Mail size={17} /> Email</button></div><div className="ai-shell"><div className="ai-history">{history.length === 0 ? <div className="ai-empty"><div className="ai-icon"><Bot size={26} /></div><h2>{mode === 'chat' ? 'Ask about your clients' : 'Draft a client email'}</h2><p>{mode === 'chat' ? 'Try: “Give me a breakdown of client Marino” or “Which clients are in Limassol?”' : 'Try: “Remind Marino if he is still interested in filters.”'}</p></div> : history.map((h, i) => <div className="exchange" key={i}><div className="user-msg">{h.prompt}</div><div className="ai-msg"><div className="ai-mini"><Bot size={15} /></div><div><pre>{h.answer}</pre><small>{h.model}</small></div></div></div>)}{busy && <div className="ai-msg"><div className="ai-mini"><Bot size={15} /></div><div className="typing">Thinking…</div></div>}</div>{error && <div className="error-box ai-error">{error}</div>}<form className="ai-input" onSubmit={submit}><textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={mode === 'chat' ? 'Ask about a client or application…' : 'Describe the email you want drafted…'} /><Button className="btn-primary" type="submit" disabled={busy || !message.trim()}>{mode === 'chat' ? <MessageSquare size={16} /> : <Mail size={16} />} {busy ? 'Working…' : mode === 'chat' ? 'Ask' : 'Draft Email'}</Button></form></div></div>;
}

function SettingsPage() { return <div className="page narrow"><div className="page-heading"><div><h1>Settings</h1><p>AQUAPHOR Customer Intelligence</p></div></div><div className="settings-grid"><div className="card setting"><SettingsIcon size={20} /><div><strong>App mode</strong><p>Testing — no sign-in is required.</p></div><span className="tag">Testing</span></div><div className="card setting"><Bot size={20} /><div><strong>AI model</strong><p>Server-side Supabase Edge Function.</p></div><span className="tag success">GPT-5.6 Luna</span></div><div className="card setting"><Building2 size={20} /><div><strong>Database</strong><p>Dedicated AQUAPHOR Supabase project in Frankfurt.</p></div><span className="tag success">Connected</span></div></div><div className="notice"><strong>Production security:</strong> testing endpoints currently do not require staff authentication. Before going live with customer PII, enable production authentication and database row-level security.</div></div>; }

const nav = [
  ['/', 'Overview', LayoutDashboard], ['/clients', 'Clients', Users], ['/applications', 'Applications', FileText], ['/applications/new', 'New Application', Plus], ['/ai-assistant', 'AI Assistant', Bot], ['/settings', 'Settings', SettingsIcon],
] as const;

function AppLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false); const location = useLocation();
  return <div className="app-shell"><aside className={open ? 'sidebar open' : 'sidebar'}><div className="brand"><div className="brand-mark"><Droplets size={18} /></div><div><b>AQUAPHOR</b><small>Customer Intelligence</small></div><button className="mobile-close" onClick={() => setOpen(false)}><X size={18} /></button></div><nav>{nav.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={() => setOpen(false)}><Icon size={17} /><span>{label}</span></NavLink>)}</nav><div className="sidebar-bottom"><span className="test-dot" /> Testing mode</div></aside>{open && <div className="overlay" onClick={() => setOpen(false)} />}<div className="main"><header className="topbar"><button className="menu-btn" onClick={() => setOpen(true)}><Menu size={20} /></button><div className="crumb">{nav.find(([to]) => to === location.pathname)?.[1] || 'AQUAPHOR'}</div><span className="top-test">Testing mode</span></header><main>{children}</main></div></div>;
}

export default function App() {
  const location = useLocation();
  const isPublic = location.pathname.startsWith('/apply');
  const content = <Routes><Route path="/" element={<Dashboard />} /><Route path="/clients" element={<Clients />} /><Route path="/clients/:id" element={<ClientProfile />} /><Route path="/applications" element={<Applications />} /><Route path="/applications/new" element={<ApplicationForm />} /><Route path="/applications/:id" element={<EditApplication />} /><Route path="/ai-assistant" element={<AiAssistant />} /><Route path="/settings" element={<SettingsPage />} /><Route path="/apply" element={<PublicApply />} /><Route path="/apply/confirm" element={<PublicConfirm />} /><Route path="*" element={<div className="page"><Empty title="Page not found" text="Choose a section from the navigation." /></div>} /></Routes>;
  return isPublic ? content : <AppLayout>{content}</AppLayout>;
}
