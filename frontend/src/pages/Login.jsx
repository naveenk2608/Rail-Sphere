import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { consumeReturnPath } from "../hooks/useAuth";
import { api } from "../utils/api";
import AuthLayout from "../components/AuthLayout";
import Icon from "../components/Icon";

export default function Login({ onLogin }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();
  const returnTo  = new URLSearchParams(location.search).get("returnTo") || "/";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    try {
      const data = await api.login({ email, password });
      localStorage.setItem("token", data.token);
      onLogin();
      navigate(consumeReturnPath(returnTo), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Login to book trains and manage your trips</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="login-email">Email address</label>
            <input id="login-email" className="auth-input" type="email" placeholder="you@email.com"
              value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="auth-field">
            <div className="auth-label-row">
              <label className="auth-label" htmlFor="login-password">Password</label>
            </div>
            <div className="auth-input-wrapper">
              <input id="login-password" className="auth-input" type={showPass ? "text" : "password"}
                placeholder="Enter your password" value={password}
                onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              <button type="button" className="auth-eye" onClick={() => setShowPass((p) => !p)}
                aria-label={showPass ? "Hide password" : "Show password"} aria-pressed={showPass}>
                <Icon name={showPass ? "eyeOff" : "eye"} size={18} />
              </button>
            </div>
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button className="btn btn--primary btn--lg auth-btn" type="submit" disabled={loading}>
            {loading ? "Logging in…" : "Login"}
          </button>
        </form>
        <p className="auth-switch">
          Don't have an account?{" "}
          <Link to={`/signup${location.search}`} className="auth-switch-link">Sign up</Link>
        </p>
    </AuthLayout>
  );
}