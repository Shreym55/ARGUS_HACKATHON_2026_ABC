import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { fetchJson } from "../services/api";

type MeResponse = {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
};

function Dashboard() {
  const navigate = useNavigate();
  const { token, user, logout, refreshUser } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentUser() {
      if (!token) {
        navigate("/", { replace: true });
        return;
      }

      try {
        const response = await fetchJson<MeResponse>("/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (isMounted) {
          refreshUser(response.user);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unable to load your profile.");
          logout();
          navigate("/", { replace: true });
        }
      }
    }

    loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, [navigate, token]);

  if (!user) {
    return null;
  }

  return (
    <section className="dashboard-page">
      <div className="dashboard-card">
        <p className="eyebrow">Dashboard</p>
        <h1>Welcome back, {user.fullName}.</h1>
        <p className="dashboard-copy">
          This view is using the authenticated backend session to show the currently
          logged-in user.
        </p>

        <dl className="profile-grid">
          <div className="profile-row">
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="profile-row">
            <dt>Role</dt>
            <dd>{user.role}</dd>
          </div>
        </dl>

        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </section>
  );
}

export default Dashboard;
