import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { fetchJson } from '../services/api';
import {
  NAV_CONFIG,
  ROLE_LABELS,
  ROLE_INITIALS,
  type UserRole,
} from '../types/roles';

// ── Unread badge counts — wire these to real API data ──────────────────────
const BADGE_OVERRIDES: Partial<Record<string, number>> = {
  '/messages': 3,
  '/portal/messages': 1,
  '/screening': 2,
  '/finance/holds': 1,
};

// ── Avatar colour per role ──────────────────────────────────────────────────
const ROLE_AVATAR_CLASS: Record<UserRole, string> = {
  platform_admin: 'avatar--purple',
  program_officer: 'avatar--blue',
  grant_reviewer: 'avatar--teal',
  finance_officer: 'avatar--amber',
  applicant: 'avatar--green',
};

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const role: UserRole = user.role in NAV_CONFIG ? (user.role as UserRole) : 'applicant';
  const groups = NAV_CONFIG[role] ?? [];

  async function handleLogout() {
    try {
      if (token) {
        await fetchJson<{ success: boolean }>('/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch {
      // We still clear local auth state so the user is logged out from this client.
    } finally {
      logout();
      navigate('/login', { replace: true });
    }
  }

  return (
    <>
      <style>{`
        .sidebar {
          width: ${collapsed ? '56px' : '220px'};
          min-height: 100vh;
          background: #fff;
          border-right: 1px solid #e8e6df;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          transition: width 0.22s cubic-bezier(.4,0,.2,1);
          overflow: hidden;
          font-family: 'DM Sans', 'Helvetica Neue', sans-serif;
        }

        /* ── Logo bar ── */
        .sidebar__logo {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: ${collapsed ? '18px 14px' : '18px 16px'};
          border-bottom: 1px solid #e8e6df;
          white-space: nowrap;
          overflow: hidden;
        }
        .sidebar__logo-mark {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: #1a3a5c;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .sidebar__logo-mark svg {
          width: 14px;
          height: 14px;
          fill: #fff;
        }
        .sidebar__logo-text {
          font-size: 14px;
          font-weight: 600;
          color: #1a3a5c;
          letter-spacing: -0.2px;
          opacity: ${collapsed ? 0 : 1};
          transition: opacity 0.15s;
        }

        /* ── Collapse toggle ── */
        .sidebar__toggle {
          position: absolute;
          top: 18px;
          right: -12px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #fff;
          border: 1px solid #e8e6df;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: #888;
          z-index: 10;
          transition: background 0.15s;
        }
        .sidebar__toggle:hover { background: #f5f3ee; color: #1a3a5c; }

        /* ── Nav scroll area ── */
        .sidebar__nav {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 8px 0;
          scrollbar-width: thin;
          scrollbar-color: #e8e6df transparent;
        }
        .sidebar__nav::-webkit-scrollbar { width: 3px; }
        .sidebar__nav::-webkit-scrollbar-thumb { background: #e8e6df; border-radius: 2px; }

        /* ── Section label ── */
        .sidebar__section {
          padding: ${collapsed ? '10px 0 4px' : '10px 16px 4px'};
          font-size: 9.5px;
          font-weight: 600;
          color: #b0aea6;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: clip;
          opacity: ${collapsed ? 0 : 1};
          height: ${collapsed ? '0px' : 'auto'};
          transition: opacity 0.15s;
        }

        /* ── Nav item ── */
        .sidebar__item {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: ${collapsed ? '9px 0' : '8px 16px'};
          margin: 1px ${collapsed ? '6px' : '8px'};
          border-radius: 7px;
          text-decoration: none;
          color: #555;
          font-size: 13px;
          font-weight: 450;
          white-space: nowrap;
          overflow: hidden;
          transition: background 0.12s, color 0.12s;
          position: relative;
          justify-content: ${collapsed ? 'center' : 'flex-start'};
        }
        .sidebar__item:hover {
          background: #f5f3ee;
          color: #1a3a5c;
        }
        .sidebar__item.active {
          background: #eef4fb;
          color: #185fa5;
          font-weight: 500;
        }
        .sidebar__item.active .sidebar__item-icon {
          color: #185fa5;
        }

        .sidebar__item-icon {
          font-size: 13px;
          flex-shrink: 0;
          width: 18px;
          text-align: center;
          color: #888;
          transition: color 0.12s;
        }
        .sidebar__item-label {
          flex: 1;
          opacity: ${collapsed ? 0 : 1};
          transition: opacity 0.12s;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ── Badge ── */
        .sidebar__badge {
          display: ${collapsed ? 'none' : 'inline-flex'};
          align-items: center;
          justify-content: center;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 9px;
          background: #e24b4a;
          color: #fff;
          font-size: 10px;
          font-weight: 600;
          flex-shrink: 0;
        }

        /* Collapsed badge dot */
        .sidebar__badge-dot {
          display: ${collapsed ? 'block' : 'none'};
          position: absolute;
          top: 6px;
          right: 6px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #e24b4a;
        }

        /* ── Collapsed tooltip ── */
        .sidebar__item-tooltip {
          display: none;
          position: absolute;
          left: calc(100% + 10px);
          top: 50%;
          transform: translateY(-50%);
          background: #1a3a5c;
          color: #fff;
          font-size: 11px;
          padding: 5px 10px;
          border-radius: 5px;
          white-space: nowrap;
          pointer-events: none;
          z-index: 100;
        }
        .sidebar__item-tooltip::before {
          content: '';
          position: absolute;
          left: -5px;
          top: 50%;
          transform: translateY(-50%);
          border: 5px solid transparent;
          border-right-color: #1a3a5c;
          border-left: none;
        }
        ${collapsed ? `.sidebar__item:hover .sidebar__item-tooltip { display: block; }` : ''}

        /* ── Divider ── */
        .sidebar__divider {
          height: 1px;
          background: #e8e6df;
          margin: 6px 12px;
        }

        /* ── User footer ── */
        .sidebar__footer {
          border-top: 1px solid #e8e6df;
          padding: ${collapsed ? '12px 8px' : '12px 14px'};
          display: flex;
          align-items: center;
          gap: 10px;
          overflow: hidden;
        }
        .sidebar__avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 600;
          flex-shrink: 0;
        }
        .avatar--blue   { background: #dbeafe; color: #1e40af; }
        .avatar--purple { background: #ede9fe; color: #5b21b6; }
        .avatar--teal   { background: #ccfbf1; color: #0f766e; }
        .avatar--amber  { background: #fef3c7; color: #92400e; }
        .avatar--green  { background: #dcfce7; color: #166534; }

        .sidebar__user-info {
          flex: 1;
          overflow: hidden;
          opacity: ${collapsed ? 0 : 1};
          transition: opacity 0.15s;
          white-space: nowrap;
        }
        .sidebar__user-name {
          font-size: 12px;
          font-weight: 500;
          color: #1a3a5c;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sidebar__user-role {
          font-size: 10.5px;
          color: #888;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sidebar__logout {
          margin: 8px;
          height: 34px;
          border: 1px solid #e8e6df;
          border-radius: 8px;
          background: #fff;
          color: #9a3b3b;
          display: flex;
          align-items: center;
          justify-content: ${collapsed ? 'center' : 'flex-start'};
          gap: 8px;
          padding: ${collapsed ? '0' : '0 12px'};
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: background 0.12s, border-color 0.12s, color 0.12s;
        }
        .sidebar__logout:hover {
          background: #fff5f5;
          border-color: #f0c4c4;
          color: #7c2d2d;
        }
        .sidebar__logout-label {
          display: ${collapsed ? 'none' : 'inline'};
          white-space: nowrap;
        }

        /* ── Responsive: mobile overlay ── */
        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            top: 0; left: 0; bottom: 0;
            z-index: 200;
            box-shadow: 4px 0 20px rgba(0,0,0,0.08);
            transform: ${collapsed ? 'translateX(-100%)' : 'translateX(0)'};
            width: 220px !important;
            transition: transform 0.22s cubic-bezier(.4,0,.2,1);
          }
          .sidebar__item-label { opacity: 1 !important; }
          .sidebar__section { opacity: 1 !important; height: auto !important; }
          .sidebar__badge { display: inline-flex !important; }
          .sidebar__badge-dot { display: none !important; }
        }
      `}</style>

      <aside className="sidebar" style={{ position: 'relative' }}>

        {/* Toggle button */}
        {onToggle && (
          <button className="sidebar__toggle" onClick={onToggle} title={collapsed ? 'Expand' : 'Collapse'}>
            {collapsed ? '›' : '‹'}
          </button>
        )}

        {/* Logo */}
        <div className="sidebar__logo">
          <div className="sidebar__logo-mark">
            <svg viewBox="0 0 16 16"><path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z"/></svg>
          </div>
          <span className="sidebar__logo-text">GrantFlow</span>
        </div>

        {/* Navigation */}
        <nav className="sidebar__nav">
          {groups.map((group, gi) => (
            <div key={gi}>
              {gi > 0 && <div className="sidebar__divider" />}
              <div className="sidebar__section">{group.section}</div>
              {group.items.map((item) => {
                const badgeCount = BADGE_OVERRIDES[item.path];
                const isActive = location.pathname === item.path ||
                  (item.path !== '/dashboard' && item.path !== '/portal' && location.pathname.startsWith(item.path));

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`sidebar__item${isActive ? ' active' : ''}`}
                  >
                    <span className="sidebar__item-icon">{item.icon}</span>
                    <span className="sidebar__item-label">{item.label}</span>
                    {badgeCount ? (
                      <>
                        <span className="sidebar__badge">{badgeCount}</span>
                        <span className="sidebar__badge-dot" />
                      </>
                    ) : null}
                    <span className="sidebar__item-tooltip">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="sidebar__footer">
          <div className={`sidebar__avatar ${ROLE_AVATAR_CLASS[role]}`}>
            {ROLE_INITIALS[role]}
          </div>
          <div className="sidebar__user-info">
            <div className="sidebar__user-name">{user.fullName}</div>
            <div className="sidebar__user-role">{ROLE_LABELS[role]}</div>
          </div>
        </div>
        <button type="button" className="sidebar__logout" onClick={handleLogout} title="Logout">
          <span>↩</span>
          <span className="sidebar__logout-label">Logout</span>
        </button>

      </aside>
    </>
  );
}
