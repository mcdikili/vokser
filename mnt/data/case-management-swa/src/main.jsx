import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AlertCircle, CheckCircle2, Clock, Inbox, LifeBuoy, Lock, Plus, Search, ShieldCheck, UserRound } from 'lucide-react';
import './styles.css';

async function apiFetch(url, options) {
  const res = await fetch(url, options);
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

const STATUS_OPTIONS = ['New', 'In Progress', 'Waiting on Customer', 'Resolved', 'Closed'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const CATEGORY_OPTIONS = ['Coach Anna', 'Home page', 'Behaviours', 'Motivators', 'General functionality'];

const blankCase = {
  title: '',
  description: '',
  requesterName: '',
  requesterEmail: '',
  category: 'General functionality',
  priority: 'Medium'
};

function App() {
  const [view, setView] = useState('raise');
  const [cases, setCases] = useState([]);
  const [form, setForm] = useState(blankCase);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: 'All', priority: 'All' });
  const [selectedCase, setSelectedCase] = useState(null);

  const loadCases = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/cases');
      setCases(data?.items || []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCases(); }, []);

  const filteredCases = useMemo(() => {
    return cases.filter((item) => {
      const haystack = `${item.title} ${item.description} ${item.requesterName} ${item.requesterEmail} ${item.category}`.toLowerCase();
      return (!filters.search || haystack.includes(filters.search.toLowerCase())) &&
        (filters.status === 'All' || item.status === filters.status) &&
        (filters.priority === 'All' || item.priority === filters.priority);
    });
  }, [cases, filters]);

  const submitCase = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const data = await apiFetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      setForm(blankCase);
      setCases((current) => [data.item, ...current]);
      setMessage({ type: 'success', text: `Case ${data.item.caseNumber} created successfully.` });
      setSelectedCase(data.item);
      setView('admin');
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (caseItem, status) => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/cases/${caseItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      setCases((current) => current.map((item) => item.id === caseItem.id ? data.item : item));
      setSelectedCase(data.item);
      setMessage({ type: 'success', text: `${data.item.caseNumber} moved to ${status}.` });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => ({
    newCount: cases.filter((c) => c.status === 'New').length,
    openCount: cases.filter((c) => !['Resolved', 'Closed'].includes(c.status)).length,
    criticalCount: cases.filter((c) => c.priority === 'Critical').length,
    totalCount: cases.length
  }), [cases]);

  return <div className="app-shell">
    <header className="hero">
      <div>
        <span className="eyebrow"><LifeBuoy size={16}/> Vokser Support</span>
        <h1>Raise and manage customer issues.</h1>
        <p>Submit an issue related to Coach Anna, the Home page, Behaviours, Motivators, or general functionality.</p>
      </div>
      <nav className="tabs" aria-label="Main navigation">
        <button className={view === 'raise' ? 'active' : ''} onClick={() => setView('raise')}><Plus size={18}/> Raise issue</button>
        <button className={view === 'admin' ? 'active' : ''} onClick={() => setView('admin')}><Inbox size={18}/> Manage cases</button>
      </nav>
    </header>

    {message && <div className={`toast ${message.type}`} role="status">
      {message.type === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>} {message.text}
    </div>}

    {view === 'raise' ? <RaiseCase form={form} setForm={setForm} submitCase={submitCase} loading={loading}/> :
      <AdminDashboard stats={stats} filters={filters} setFilters={setFilters} cases={filteredCases} loading={loading} selectedCase={selectedCase} setSelectedCase={setSelectedCase} updateStatus={updateStatus}/>} 
  </div>;
}

function RaiseCase({ form, setForm, submitCase, loading }) {
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  return <main className="grid two-column">
    <section className="card">
      <h2>Tell us what happened</h2>
      <p className="muted">Users can submit an issue without needing an account. Add authentication later if you only want known customers.</p>
      <form onSubmit={submitCase} className="case-form">
        <label>Issue title<input required minLength="5" value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Example: Unable to access billing page" /></label>
        <label>Description<textarea required minLength="20" rows="7" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="What were you trying to do? What happened? Any error message?" /></label>
        <div className="form-row">
          <label>Your name<input required value={form.requesterName} onChange={(e) => update('requesterName', e.target.value)} /></label>
          <label>Email<input required type="email" value={form.requesterEmail} onChange={(e) => update('requesterEmail', e.target.value)} /></label>
        </div>
        <div className="form-row">
          <label>Category<select value={form.category} onChange={(e) => update('category', e.target.value)}>{CATEGORY_OPTIONS.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label>Priority<select value={form.priority} onChange={(e) => update('priority', e.target.value)}>{PRIORITY_OPTIONS.map((p) => <option key={p}>{p}</option>)}</select></label>
        </div>
        <button className="primary" disabled={loading}>{loading ? 'Submitting...' : 'Submit case'}</button>
      </form>
    </section>
    <aside className="card info-panel">
      <ShieldCheck size={32}/>
      <h3>Built for Azure Static Web Apps</h3>
      <p>Frontend routes are handled by Static Web Apps, while <code>/api/cases</code> is served by managed Azure Functions.</p>
      <ul>
        <li>No server to manage</li>
        <li>Case data stored in Azure Table Storage</li>
        <li>Admin route ready for Azure auth</li>
      </ul>
    </aside>
  </main>;
}

function AdminDashboard({ stats, filters, setFilters, cases, loading, selectedCase, setSelectedCase, updateStatus }) {
  return <main>
    <section className="stats-grid">
      <Stat icon={<Inbox/>} label="Total cases" value={stats.totalCount}/>
      <Stat icon={<Clock/>} label="Open" value={stats.openCount}/>
      <Stat icon={<Plus/>} label="New" value={stats.newCount}/>
      <Stat icon={<AlertCircle/>} label="Critical" value={stats.criticalCount}/>
    </section>
    <section className="card admin-card">
      <div className="admin-header">
        <div><h2>Case queue</h2><p className="muted">Review incoming cases, search the queue, and move work through statuses.</p></div>
        <div className="lock-hint"><Lock size={16}/> Protect this route with Azure roles</div>
      </div>
      <div className="filters">
        <label className="search-box"><Search size={18}/><input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Search cases" /></label>
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option>All</option>{STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}</select>
        <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}><option>All</option>{PRIORITY_OPTIONS.map((p) => <option key={p}>{p}</option>)}</select>
      </div>
      <div className="queue-layout">
        <div className="case-list">
          {loading && <p className="muted">Loading...</p>}
          {!loading && cases.length === 0 && <p className="muted">No cases match your filters.</p>}
          {cases.map((item) => <button key={item.id} className={`case-row ${selectedCase?.id === item.id ? 'selected' : ''}`} onClick={() => setSelectedCase(item)}>
            <div><strong>{item.caseNumber}</strong><span>{item.title}</span></div>
            <div className="pills"><span className={`pill ${item.priority.toLowerCase()}`}>{item.priority}</span><span className="pill">{item.status}</span></div>
          </button>)}
        </div>
        <CaseDetails item={selectedCase || cases[0]} updateStatus={updateStatus}/>
      </div>
    </section>
  </main>;
}

function CaseDetails({ item, updateStatus }) {
  if (!item) return <aside className="case-detail empty"><UserRound size={24}/><p>Select a case to see details.</p></aside>;
  return <aside className="case-detail">
    <div className="detail-top"><span className="case-number">{item.caseNumber}</span><span className={`pill ${item.priority.toLowerCase()}`}>{item.priority}</span></div>
    <h3>{item.title}</h3>
    <p className="description">{item.description}</p>
    <dl>
      <dt>Requester</dt><dd>{item.requesterName} &lt;{item.requesterEmail}&gt;</dd>
      <dt>Category</dt><dd>{item.category}</dd>
      <dt>Status</dt><dd>{item.status}</dd>
      <dt>Created</dt><dd>{new Date(item.createdAt).toLocaleString()}</dd>
    </dl>
    <label>Update status<select value={item.status} onChange={(e) => updateStatus(item, e.target.value)}>{STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}</select></label>
  </aside>;
}

function Stat({ icon, label, value }) { return <article className="stat card"><div>{icon}</div><span>{label}</span><strong>{value}</strong></article>; }

createRoot(document.getElementById('root')).render(<App/>);
