import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { consumeReturnPath } from "../hooks/useAuth";
import { api } from "../utils/api";
import AuthLayout from "../components/AuthLayout";
import Icon from "../components/Icon";

export default function Signup({ onLogin }) {
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = new URLSearchParams(location.search).get("returnTo") || "/";

  // Anything under the 8-character minimum is rejected, so it can't read as "Fair".
  const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;
  const strengthLabel = ["", "Too short", "Fair", "Strong"];
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
      navigate(consumeReturnPath(returnTo), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
        <h1 className="auth-title">Create account</h1>
        <p className="auth-sub">Book trains and manage all your trips</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="su-name">Full name</label>
            <input id="su-name" className="auth-input" type="text" autoComplete="name" placeholder="Your full name"
              value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="su-email">Email address</label>
            <input id="su-email" className="auth-input" type="email" autoComplete="email" placeholder="you@email.com"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="su-password">Password</label>
            <div className="auth-input-wrapper">
              <input id="su-password" autoComplete="new-password" className="auth-input" type={showPass ? "text" : "password"}
                placeholder="Min. 8 characters" value={password}
                onChange={(e) => setPassword(e.target.value)} />
              <button type="button" className="auth-eye" onClick={() => setShowPass((p) => !p)}
                aria-label={showPass ? "Hide password" : "Show password"} aria-pressed={showPass}>
                <Icon name={showPass ? "eyeOff" : "eye"} size={18} />
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
            <label className="auth-label" htmlFor="su-confirm">Confirm password</label>
            <input id="su-confirm" autoComplete="new-password" className={`auth-input ${confirm && confirm !== password ? "auth-input--error" : ""}`}
              type={showPass ? "text" : "password"} placeholder="Re-enter password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            {confirm && confirm !== password && <div className="auth-field-error">Passwords do not match</div>}
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button className="btn btn--primary btn--lg auth-btn" type="submit" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="auth-switch">
          Already have an account?{" "}
          <Link to={`/login${location.search}`} className="auth-switch-link">Login</Link>
        </p>
    </AuthLayout>
  );
}