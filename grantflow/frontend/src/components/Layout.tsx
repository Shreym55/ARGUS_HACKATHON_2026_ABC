import { Outlet, Link } from "react-router-dom";

function Layout() {
  return (
    <>
      <header className="bg-[#1a1a2e] text-white py-4 px-8">
        <nav className="flex items-center gap-8">
          <Link to="/" className="text-white no-underline text-xl font-bold">
            GrantFlow
          </Link>
        </nav>
      </header>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </>
  );
}

export default Layout;
