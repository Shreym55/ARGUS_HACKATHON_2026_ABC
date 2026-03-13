import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth';
import { fetchJson } from '../services/api';

// ── Types ────────────────────────────────────────────────────────────────────

type GrantProgram = {
  id: string;
  name: string;
  programCode: string | null;
  purposeSummary: string | null;
  description: string | null;
  minAmount: string | null;
  maxAmount: string | null;
  totalBudget: string | null;
  availableBudget: string | null;
  projectDurationMin: number | null;
  projectDurationMax: number | null;
  applicationDeadline: string | null;
  eligibilityHighlights: string[] | null;
  eligibleOrgTypes: string[] | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
};

type EligibilityResult = {
  programmeId: string;
  programmeName: string;
  programCode: string | null;
  result: 'Likely Eligible' | 'Likely Not Eligible';
  reasons: string[];
};

// ── Constants ────────────────────────────────────────────────────────────────

const ORG_TYPES = [
  'NGO', 'Trust', 'Registered Society', 'Section 8 Company',
  'EdTech Non-Profit', 'Research Institution', 'University',
  'Farmer Producer Organisation', 'Panchayat Body', 'Government Body', 'Other',
];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu & Kashmir',
  'Ladakh', 'Puducherry', 'Chandigarh',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = {
  amount: (val: string | null) =>
    val ? `₹${Number(val).toLocaleString('en-IN')}` : '—',
  lakh: (val: string | null) =>
    val ? `₹${(Number(val) / 100000).toFixed(0)} Lakh` : '—',
  crore: (val: string | null) =>
    val ? `₹${(Number(val) / 10000000).toFixed(1)} Crore` : '—',
  date: (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : null,
  duration: (min: number | null, max: number | null) => {
    if (!min && !max) return '—';
    if (min === max) return `${min} months`;
    return `${min ?? '?'}–${max ?? '?'} months`;
  },
};

// ── Eligibility pre-check inline form ────────────────────────────────────────

function EligibilityPreCheck({ programmeId }: { programmeId: string }) {
  const [orgType, setOrgType] = useState('');
  const [district, setDistrict] = useState('');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCheck() {
    if (!orgType || !district || !amount) {
      setError('Please fill in all fields.');
      return;
    }
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid funding amount.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const results = await fetchJson<EligibilityResult[]>('/grant-programs/eligibility-check', {
        method: 'POST',
        body: JSON.stringify({ orgType, district, amountRequested: amt }),
      });
      const thisOne = results.find((r) => r.programmeId === programmeId) ?? null;
      setResult(thisOne);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check failed.');
    } finally {
      setLoading(false);
    }
  }

  const isEligible = result?.result === 'Likely Eligible';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '1.5rem',
      border: '1px solid rgba(255,255,255,0.1)',
    }}>
      <p className="eyebrow" style={{ marginBottom: '0.5rem' }}>Quick Check</p>
      <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.05rem' }}>Eligibility Pre-Check</h3>
      <p style={{ margin: '0 0 1.25rem', color: 'rgba(243,241,234,0.65)', fontSize: '0.88rem' }}>
        No account required. Answer three questions to see if your organisation
        is likely eligible for this grant.
      </p>

      {!result ? (
        <>
          {[
            {
              label: 'Organisation Type', value: orgType, onChange: setOrgType,
              options: ORG_TYPES,
            },
            {
              label: 'Project State / District', value: district, onChange: setDistrict,
              options: INDIAN_STATES,
            },
          ].map(({ label, value, onChange, options }) => (
            <div key={label} style={{ marginBottom: '0.85rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(243,241,234,0.65)', marginBottom: '0.35rem' }}>
                {label}
              </label>
              <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={{
                  width: '100%', padding: '0.8rem 1rem', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)', color: '#f3f1ea', font: 'inherit',
                }}
              >
                <option value="">Select…</option>
                {options.map((o) => <option key={o} value={o} style={{ background: '#162431' }}>{o}</option>)}
              </select>
            </div>
          ))}

          <div style={{ marginBottom: '0.85rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(243,241,234,0.65)', marginBottom: '0.35rem' }}>
              Funding Amount Requested (₹)
            </label>
            <input
              type="number"
              min="0"
              placeholder="e.g. 500000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{
                width: '100%', padding: '0.8rem 1rem', borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.06)', color: '#f3f1ea', font: 'inherit',
              }}
            />
          </div>

          {error && <p className="form-error" style={{ marginBottom: '0.75rem' }}>{error}</p>}

          <button
            className="primary-button"
            style={{ width: '100%' }}
            onClick={handleCheck}
            disabled={loading}
          >
            {loading ? 'Checking…' : 'Check Eligibility'}
          </button>
        </>
      ) : (
        <div style={{
          padding: '1.25rem', borderRadius: '12px',
          background: isEligible ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)',
          border: isEligible ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(239,68,68,0.25)',
        }}>
          <span style={{
            display: 'inline-block', padding: '0.2rem 0.75rem', borderRadius: '999px',
            fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.6rem',
            background: isEligible ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
            color: isEligible ? '#4ade80' : '#f87171',
          }}>
            {result.result}
          </span>
          <p style={{ margin: '0 0 0.35rem', fontWeight: 600, fontSize: '0.95rem' }}>
            {orgType} in {district}
          </p>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(243,241,234,0.65)' }}>
            Requested: ₹{Number(amount).toLocaleString('en-IN')}
          </p>
          {!isEligible && result.reasons.length > 0 && (
            <ul style={{ margin: '0.75rem 0 0', paddingLeft: '1.1rem' }}>
              {result.reasons.map((r, i) => (
                <li key={i} style={{ fontSize: '0.83rem', color: 'rgba(243,241,234,0.75)', marginBottom: '0.25rem' }}>
                  {r}
                </li>
              ))}
            </ul>
          )}
          <button
            className="secondary-button"
            style={{ marginTop: '1rem', width: '100%' }}
            onClick={() => setResult(null)}
          >
            Check Again
          </button>
        </div>
      )}
    </div>
  );
}

// ── Fact row ─────────────────────────────────────────────────────────────────

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0.85rem 1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.04)',
      gap: '1rem',
    }}>
      <span style={{ fontSize: '0.85rem', color: 'rgba(243,241,234,0.6)' }}>{label}</span>
      <span style={{ fontSize: '0.9rem', fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GrantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isReady } = useAuth();
  const navigate = useNavigate();
  const [programme, setProgramme] = useState<GrantProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetchJson<GrantProgram>(`/grant-programs/${id}`)
      .then(setProgramme)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load programme.'))
      .finally(() => setLoading(false));
  }, [id]);

  const codeColour: Record<string, string> = {
    CDG: '#60a5fa',
    EIG: '#a78bfa',
    ECAG: '#34d399',
  };
  const colour = programme?.programCode
    ? (codeColour[programme.programCode] ?? '#f1c96b')
    : '#f1c96b';

  return (
    <>
      <style>{`
        .detail-page { min-height: 100vh; color: #f3f1ea; }
        .detail-topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1rem 2rem; border-bottom: 1px solid rgba(255,255,255,0.08);
          background: rgba(10,17,24,0.5); backdrop-filter: blur(12px);
          position: sticky; top: 0; z-index: 100;
        }
        .detail-topbar-left { display: flex; align-items: center; gap: 1rem; }
        .detail-brand {
          display: flex; align-items: center; gap: 8px;
          font-size: 1rem; font-weight: 700; color: #f3f1ea; text-decoration: none;
        }
        .detail-brand-mark {
          width: 26px; height: 26px; border-radius: 6px;
          background: linear-gradient(135deg, #f1c96b, #d89b35);
          display: flex; align-items: center; justify-content: center; font-size: 13px;
        }
        .detail-back {
          font-size: 0.85rem; color: rgba(243,241,234,0.55);
          text-decoration: none; transition: color 0.15s;
        }
        .detail-back:hover { color: #f1c96b; }
        .detail-content { max-width: 1100px; margin: 0 auto; padding: 3rem 1.5rem; }
        .detail-layout {
          display: grid; grid-template-columns: 1fr 360px; gap: 2rem; align-items: start;
        }
        .detail-main {}
        .detail-sidebar { position: sticky; top: 80px; }
        @media (max-width: 860px) {
          .detail-layout { grid-template-columns: 1fr; }
          .detail-sidebar { position: static; }
        }
      `}</style>

      <div className="detail-page">
        {/* Top bar */}
        <header className="detail-topbar">
          <div className="detail-topbar-left">
            <a href="/grants" className="detail-brand">
              <div className="detail-brand-mark">◈</div>
              GrantFlow
            </a>
            <Link to="/grants" className="detail-back">← All Programmes</Link>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {isReady && user ? (
              <>
                <span style={{ fontSize: '0.85rem', color: 'rgba(243,241,234,0.55)' }}>
                  {user.fullName}
                </span>
                <button className="secondary-button" onClick={() => navigate('/dashboard')}>
                  Dashboard
                </button>
              </>
            ) : (
              <button className="primary-button" onClick={() => navigate('/login')}>Sign In</button>
            )}
          </div>
        </header>

        {loading && (
          <p style={{ textAlign: 'center', padding: '4rem', color: 'rgba(243,241,234,0.5)' }}>
            Loading…
          </p>
        )}

        {error && (
          <div style={{ maxWidth: 600, margin: '4rem auto', textAlign: 'center' }}>
            <p className="form-error">{error}</p>
            <Link to="/grants" className="detail-back">← Back to all programmes</Link>
          </div>
        )}

        {!loading && !error && programme && (
          <div className="detail-content">
            {/* Header */}
            <div style={{ marginBottom: '2.5rem' }}>
              {programme.programCode && (
                <span style={{
                  display: 'inline-block', background: colour + '22', color: colour,
                  borderRadius: '8px', padding: '0.3rem 0.75rem',
                  fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.06em',
                  marginBottom: '0.75rem',
                }}>
                  {programme.programCode}
                </span>
              )}
              <h1 style={{ margin: '0 0 0.75rem', fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', lineHeight: 1.15 }}>
                {programme.name}
              </h1>
              {programme.purposeSummary && (
                <p style={{ margin: 0, color: 'rgba(243,241,234,0.72)', fontSize: '1.05rem', lineHeight: 1.65, maxWidth: '60ch' }}>
                  {programme.purposeSummary}
                </p>
              )}
            </div>

            <div className="detail-layout">
              {/* Main content */}
              <div className="detail-main" style={{ display: 'grid', gap: '2rem' }}>

                {/* Full description */}
                {programme.description && (
                  <section>
                    <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: '#f1c96b' }}>
                      About This Grant
                    </h2>
                    <p style={{
                      margin: 0, color: 'rgba(243,241,234,0.8)',
                      lineHeight: 1.75, fontSize: '0.95rem',
                      background: 'rgba(255,255,255,0.03)', borderRadius: '14px',
                      padding: '1.25rem', border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                      {programme.description}
                    </p>
                  </section>
                )}

                {/* Programme facts */}
                <section>
                  <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: '#f1c96b' }}>
                    Programme Details
                  </h2>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    <Fact label="Minimum Funding" value={fmt.lakh(programme.minAmount)} />
                    <Fact label="Maximum Funding" value={fmt.lakh(programme.maxAmount)} />
                    <Fact label="Project Duration"
                      value={fmt.duration(programme.projectDurationMin, programme.projectDurationMax)} />
                    <Fact label="Application Deadline"
                      value={fmt.date(programme.applicationDeadline) ?? 'Rolling — no fixed deadline'} />
                    <Fact label="Available Budget" value={fmt.crore(programme.availableBudget)} />
                    {programme.startDate && (
                      <Fact label="Programme Opens" value={fmt.date(programme.startDate)!} />
                    )}
                  </div>
                </section>

                {/* Eligibility highlights */}
                {programme.eligibilityHighlights && programme.eligibilityHighlights.length > 0 && (
                  <section>
                    <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: '#f1c96b' }}>
                      Eligibility Criteria
                    </h2>
                    <ul style={{
                      margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '0.6rem',
                    }}>
                      {programme.eligibilityHighlights.map((h, i) => (
                        <li key={i} style={{
                          display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                          padding: '0.85rem 1rem', borderRadius: '10px',
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                        }}>
                          <span style={{ color: colour, fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>✓</span>
                          <span style={{ fontSize: '0.9rem', color: 'rgba(243,241,234,0.85)' }}>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Eligible org types */}
                {programme.eligibleOrgTypes && programme.eligibleOrgTypes.length > 0 && (
                  <section>
                    <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: '#f1c96b' }}>
                      Eligible Organisation Types
                    </h2>
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                      {programme.eligibleOrgTypes.map((t) => (
                        <span key={t} style={{
                          background: colour + '18', color: colour,
                          border: `1px solid ${colour}33`,
                          borderRadius: '8px', padding: '0.35rem 0.85rem',
                          fontSize: '0.85rem', fontWeight: 600,
                        }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Sidebar */}
              <aside className="detail-sidebar" style={{ display: 'grid', gap: '1.25rem' }}>

                {/* Apply CTA */}
                <div style={{
                  background: 'rgba(10,17,24,0.7)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '18px', padding: '1.5rem', backdropFilter: 'blur(12px)',
                }}>
                  <p className="eyebrow" style={{ marginBottom: '0.25rem' }}>Ready to apply?</p>
                  <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>
                    Apply for {programme.programCode ?? 'this grant'}
                  </h3>
                  {user ? (
                    <button
                      className="primary-button"
                      style={{ width: '100%' }}
                      onClick={() => navigate('/portal/apply')}
                    >
                      Start Application →
                    </button>
                  ) : (
                    <>
                      <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'rgba(243,241,234,0.6)' }}>
                        Create a free account to start your application.
                      </p>
                      <button className="primary-button" style={{ width: '100%' }} onClick={() => navigate('/login')}>
                        Register / Sign In →
                      </button>
                    </>
                  )}
                  <p style={{ margin: '0.75rem 0 0', fontSize: '0.78rem', color: 'rgba(243,241,234,0.45)', textAlign: 'center' }}>
                    Check your eligibility below before applying.
                  </p>
                </div>

                {/* Inline eligibility pre-check */}
                {id && <EligibilityPreCheck programmeId={id} />}
              </aside>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
