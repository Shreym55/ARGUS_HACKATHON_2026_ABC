import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { fetchJson } from "../services/api";

type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isEmailVerified?: boolean;
};

type AuthPayload = {
  token: string;
  user: AuthUser;
};

function AuthPage() {
  const navigate = useNavigate();
  const { isReady, token, setSession } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isReady) {
    return null;
  }

  if (token) {
    return <Navigate to="/portal" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const payload =
        mode === "login"
          ? { email, password }
          : { fullName, email, phone: phone || undefined, password };

      const response = await fetchJson<AuthPayload>(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSession(response.token, response.user);
      navigate("/portal", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to continue.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-page" style={{ padding: "0 2rem" }}>
      <div className="auth-hero">
        <p className="eyebrow">GrantFlow Access</p>
        <h1>Sign in to manage grants, applicants, and reviews.</h1>
        <p className="auth-copy">
          New users can create an account here. After login, the dashboard shows the
          signed-in email address and role from the backend.
        </p>
      </div>

      <div className="auth-card">
        <div className="auth-card__header">
          <button
            type="button"
            className={mode === "login" ? "tab-button is-active" : "tab-button"}
            onClick={() => { setMode("login"); setError(""); }}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === "register" ? "tab-button is-active" : "tab-button"}
            onClick={() => { setMode("register"); setError(""); }}
          >
            Register
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "register" && (
            <label className="field">
              <span>Full name</span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Morgan"
                autoComplete="name"
                required
              />
            </label>
          )}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          {mode === "register" && (
            <label className="field">
              <span>Phone number <span style={{ opacity: 0.55, fontWeight: 400 }}>(optional)</span></span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                autoComplete="tel"
              />
            </label>
          )}

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? "Working..." : mode === "login" ? "Login" : "Create account"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default AuthPage;
