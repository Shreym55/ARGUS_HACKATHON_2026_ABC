import { Outlet, Link } from "react-router-dom";

function Layout() {
  return (
    <>
      <header style={{ background: "#1a1a2e", color: "#fff", padding: "1rem 2rem" }}>
        <nav style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <Link to="/" style={{ color: "#fff", textDecoration: "none", fontSize: "1.25rem", fontWeight: 700 }}>
            GrantFlow
          </Link>
        </nav>
      </header>
      <main style={{ flex: 1, padding: "2rem" }}>
        <Outlet />
      </main>
    </>
  );
}

export default Layout;
