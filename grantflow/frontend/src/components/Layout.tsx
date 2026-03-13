import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8f7f3' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />

      {/* Mobile overlay backdrop */}
      {!collapsed && (
        <div
          onClick={() => setCollapsed(true)}
          style={{
            display: 'none',
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            zIndex: 199,
          }}
          className="mobile-backdrop"
        />
      )}

      <main
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Outlet />
      </main>

      <style>{`
        @media (max-width: 768px) {
          .mobile-backdrop { display: block !important; }
        }
      `}</style>
    </div>
  );
}
