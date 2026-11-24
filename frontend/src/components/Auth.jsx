import { useState } from "react";
import { Avatar, Badge, Button, FormField, Icon, Logo } from "./AppUI.jsx";
import api from "../api/axios.js";
import "../styles/auth.css";
import { useUser } from "../context/userContext.jsx";

export default function Auth({ mode, navigate, enter }) {
  const { setUser } = useUser();

  const [role, setRole] = useState("member");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loginData, setLoginData] = useState("");
  const [busy, setBusy] = useState(false);

  const clearErrorSoon = () => {
    setTimeout(() => setError(""), 4000);
  };

  const createUser = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await api.post("/auth/register", {
        name,
        email,
        password,
        role,
        studentId,
      });
      const data = response.data;
      localStorage.setItem("user", JSON.stringify(data));
      localStorage.setItem("token", data.token);
      setUser(data);
      enter(data.role);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Something went wrong. Please try again.",
      );
      clearErrorSoon();
    } finally {
      setBusy(false);
    }
  };

  const loginUser = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    const body = {
      email: loginData.includes("@") ? loginData : "",
      studentId: !loginData.includes("@") ? loginData : "",
      password,
    };

    try {
      const response = await api.post("/auth/login", body);
      const data = response.data;

      // 2FA required — hand off to the gate
      if (data?.requiresTwoFactor) {
        sessionStorage.setItem("2fa-temp-token", data.tempToken);
        // Store minimal user so App can pick the workspace
        localStorage.setItem(
          "user",
          JSON.stringify({
            _id: data.user?._id,
            name: data.user?.name,
            email: data.user?.email,
            role: data.user?.role ?? "member",
            twoFactorEnabled: true,
          }),
        );
        setUser(data.user);
        enter(data.user?.role ?? "member");
        return;
      }

      // Normal path — 2FA off
      localStorage.setItem("user", JSON.stringify(data));
      localStorage.setItem("token", data.token);
      setUser(data);
      enter(data.role);
    } catch (err) {
      const message =
        err.response?.status === 401
          ? "Invalid credentials"
          : err.response?.data?.message ||
            err.message ||
            "Please check your details";
      setError(message);
      clearErrorSoon();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-panel">
        <button className="brand-button" onClick={() => navigate("landing")}>
          <Logo />
        </button>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (mode === "signup") createUser();
            else loginUser();
          }}
          className="auth-form"
        >
          <p className="eyebrow">
            {mode === "login" ? "WELCOME BACK" : "CREATE AN ACCOUNT"}
          </p>
          <h1>
            {mode === "login"
              ? "Sign in to your workspace"
              : "Make group work accountable"}
          </h1>
          <p className="muted">
            {mode === "login"
              ? "Use your institutional credentials to continue."
              : "Set up your account in less than two minutes."}
          </p>

          {error && (
            <div className="error">
              <p>{error}</p>
            </div>
          )}

          <label className="field-label">Your role</label>
          <div className="role-picker">
            {["member", "leader", "lecturer"].map((item) => (
              <button
                type="button"
                key={item}
                className={role === item ? "selected" : ""}
                onClick={() => setRole(item)}
              >
                {item === "leader" ? "Group leader" : item}
              </button>
            ))}
          </div>

          {mode === "signup" && (
            <>
              <FormField
                label="Full name"
                placeholder="Your full name"
                required
                onChange={(e) => setName(e.target.value)}
              />
              <FormField
                label="Email address"
                placeholder="you@university.edu"
                type="email"
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <FormField
                label={role === "lecturer" ? "Ref No:" : "Admission"}
                placeholder="SB30/PU/0000/10"
                type="text"
                onChange={(e) => setStudentId(e.target.value)}
                required
              />
            </>
          )}

          {mode !== "signup" && (
            <FormField
              label={
                role === "lecturer"
                  ? "Email address / Ref No:"
                  : "Email address / Admission"
              }
              placeholder="you@university.edu / SB30/PU/0000/10"
              type={loginData.includes("@") ? "email" : "text"}
              onChange={(e) => setLoginData(e.target.value)}
              required
            />
          )}

          <div className="pass-field">
            <FormField
              label="Password"
              placeholder="At least 8 characters"
              type={showPass ? "text" : "password"}
              onChange={(e) => setPassword(e.target.value)}
              required
              position={"relative"}
              display={"inline"}
            />
            <p
              onClick={() => setShowPass((v) => !v)}
              style={{
                display: "inline",
                cursor: "pointer",
                fontWeight: "550",
              }}
              className="show-pass"
            >
              {showPass ? "Hide" : "Show"}
            </p>
          </div>

          <Button type="submit" className="full-button" disabled={busy}>
            {busy
              ? "Working..."
              : mode === "login"
                ? "Sign in"
                : "Create account"}{" "}
            <Icon name="arrow" />
          </Button>

          <p className="auth-switch">
            {mode === "login" ? "New to Contribu?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setPassword("");
                setError("");
                navigate(mode === "login" ? "signup" : "login");
              }}
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </form>
      </section>

      <aside className="auth-art">
        <div>
          <Badge>DESIGNED FOR TRUST</Badge>
          <h2>Make every decision traceable and every contribution visible.</h2>
          <p>
            From task acceptance to final assessment, Contribu keeps a reliable
            history of the work your team completes.
          </p>
        </div>
        <blockquote>
          "The evidence trail makes reviews faster, feedback clearer, and
          assessments much fairer."
          <footer>
            <Avatar initials="PA" />
            <span>
              <b>Mr. P. Arnold</b>
              <small>School of Pure & Applied Sciences</small>
            </span>
          </footer>
        </blockquote>
      </aside>
    </div>
  );
}
