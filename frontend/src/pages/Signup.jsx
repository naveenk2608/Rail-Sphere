import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../utils/api";
import "./Auth.css";

export default function Signup({ onLogin }) {
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const navigate = useNavigate();

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabel = ["", "Weak", "Fair", "Strong"];
  const strengthCls   = ["", "weak", "fair", "strong"];

  function validate() {
    if (!name || !email || !password || !confirm) return "Please fill in all fields.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password !== confirm) return "Passwords do not match.";
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    try {
      const data = await api.register({ name, email, password });
      localStorage.setItem("token", data.token);
      onLogin();
      navigate("/");
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
        <h1 className="auth-title">Create account</h1>
        <p className="auth-sub">Book trains, save passengers and manage all your trips</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label">Full name</label>
            <input className="auth-input" type="text" placeholder="Your full name"
              value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="auth-field">
            <label className="auth-label">Email address</label>
            <input className="auth-input" type="email" placeholder="you@email.com"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="auth-field">
            <label className="auth-label">Password</label>
            <div className="auth-input-wrapper">
              <input className="auth-input" type={showPass ? "text" : "password"}
                placeholder="Min. 8 characters" value={password}
                onChange={(e) => setPassword(e.target.value)} />
              <button type="button" className="auth-eye" onClick={() => setShowPass((p) => !p)}>
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
            {password.length > 0 && (
              <div className="auth-strength-row">
                <div className="auth-strength-bars">
                  {[1,2,3].map((i) => (
                    <div key={i} className={`auth-strength-bar ${strength >= i ? strengthCls[strength] : ""}`} />
                  ))}
                </div>
                <span className={`auth-strength-label ${strengthCls[strength]}`}>{strengthLabel[strength]}</span>
              </div>
            )}
          </div>
          <div className="auth-field">
            <label className="auth-label">Confirm password</label>
            <input className={`auth-input ${confirm && confirm !== password ? "auth-input--error" : ""}`}
              type={showPass ? "text" : "password"} placeholder="Re-enter password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            {confirm && confirm !== password && <div className="auth-field-error">Passwords do not match</div>}
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
        <div className="auth-divider"><span>or</span></div>
        <p className="auth-switch">
          Already have an account?{" "}
          <Link to="/login" className="auth-switch-link">Login</Link>
        </p>
      </div>
    </div>
  );
}