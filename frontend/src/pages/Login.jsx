import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../utils/api";
import "./Auth.css";

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
      // restore saved booking progress if any
      const saved = sessionStorage.getItem("bookingProgress");
      if (saved) {
        const prog = JSON.parse(saved);
        sessionStorage.removeItem("bookingProgress");
        navigate(prog.returnPath || returnTo);
      } else {
        navigate(returnTo);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-logo">
          <div className="auth-logo-icon">🚆</div>
          <span className="auth-logo-text">Rail-Sphere</span>
        </Link>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Login to book trains and manage your trips</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label">Email address</label>
            <input className="auth-input" type="email" placeholder="you@email.com"
              value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="auth-field">
            <div className="auth-label-row">
              <label className="auth-label">Password</label>
              <span className="auth-forgot">Forgot password?</span>
            </div>
            <div className="auth-input-wrapper">
              <input className="auth-input" type={showPass ? "text" : "password"}
                placeholder="Enter your password" value={password}
                onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              <button type="button" className="auth-eye" onClick={() => setShowPass((p) => !p)}>
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? "Logging in…" : "Login"}
          </button>
        </form>
        <div className="auth-divider"><span>or</span></div>
        <p className="auth-switch">
          Don't have an account?{" "}
          <Link to="/signup" className="auth-switch-link">Sign up</Link>
        </p>
      </div>
    </div>
  );
}