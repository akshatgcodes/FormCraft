import { useEffect, useState, type FormEvent } from "react";
import { Link, Outlet } from "react-router-dom";
import { api } from "../api";

export default function RequireOwner() {
  const [owner, setOwner] = useState<boolean | null>(null);
  const [apiDown, setApiDown] = useState(false);

  useEffect(() => {
    api.me().then((r) => setOwner(r.owner)).catch(() => setApiDown(true));
  }, []);

  if (apiDown) return <div className="center error">Can't reach the FormCraft API. Is the backend running on :8000?</div>;
  if (owner === null) return <div className="center muted">Loading…</div>;
  if (!owner) return <LoginScreen onDone={() => setOwner(true)} />;

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="logo">
          <Logo /> FormCraft
        </Link>
        <button
          className="link-btn"
          onClick={async () => {
            await api.logout();
            setOwner(false);
          }}
        >
          Log out
        </button>
      </header>
      <Outlet />
    </div>
  );
}

export function Logo() {
  return (
    <svg width="20" height="20" viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="7" fill="var(--accent)" />
      <rect x="8" y="8" width="16" height="3.5" rx="1.5" fill="#fff" />
      <rect x="8" y="14.25" width="11" height="3.5" rx="1.5" fill="#fff" opacity=".75" />
      <rect x="8" y="20.5" width="7" height="3.5" rx="1.5" fill="#fff" opacity=".5" />
    </svg>
  );
}

function LoginScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.login(password);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <main className="center">
      <form className="panel login" onSubmit={submit}>
        <h1 className="logo big">
          <Logo /> FormCraft
        </h1>
        <p className="muted">Build forms with conditional logic, share a link, collect responses.</p>
        <label className="label" htmlFor="pw">
          Owner password
        </label>
        <input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus required />
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary" type="submit">
          Log in
        </button>
      </form>
    </main>
  );
}
