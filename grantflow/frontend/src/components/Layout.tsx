import { Outlet, Link } from "react-router-dom";
import { useAuth } from "../auth";

function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <nav className="topbar__nav">
          <Link to={user ? "/dashboard" : "/"} className="brand">
            GrantFlow
          </Link>
          {user ? (
            <div className="topbar__meta">
              <span className="topbar__user">{user.email}</span>
              <button type="button" className="secondary-button" onClick={logout}>
                Log out
              </button>
            </div>
          ) : (
            <span className="topbar__tag">Grant management workspace</span>
          )}
        </nav>
      </header>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
