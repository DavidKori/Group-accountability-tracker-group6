import { useEffect, useState } from "react";
import { Button, FormField, Icon } from "./AppUI.jsx";
import api from "../api/axios.js";

const FLAG = "2fa-verified";

export default function TwoFactorGate({ user, children }) {
  const [verified, setVerified] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const needsVerification =
    Boolean(user?.twoFactorEnabled) && sessionStorage.getItem(FLAG) !== "1";

  useEffect(() => {
    setVerified(!needsVerification);
  }, [needsVerification]);

  const submit = async () => {
    if (code.trim().length < 6) {
      setError("Enter the 6-digit code");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const tempToken = sessionStorage.getItem("2fa-temp-token");

      if (tempToken) {
        const response = await api.post("/auth/2fa/verify-login", {
          tempToken,
          code: code.trim(),
        });
        const data = response?.data ?? {};
        if (data.token) {
          localStorage.setItem("token", data.token);
        }
        if (data._id) {
          localStorage.setItem("user", JSON.stringify(data));
        }
        sessionStorage.removeItem("2fa-temp-token");
      } else {
        // Live path — 2FA enabled after the session started
        await api.post("/auth/2fa/verify-live", { code: code.trim() });
      }

      sessionStorage.setItem(FLAG, "1");
      setVerified(true);
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Verification failed",
      );
    } finally {
      setBusy(false);
    }
  };

  if (verified) return children;

  return (
    <div
      className="workspace-loader"
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <span />
      <b style={{ marginBottom: 8 }}>Two-factor verification required</b>
      <div
        className="card"
        style={{ padding: 24, maxWidth: 360, width: "100%" }}
      >
        <div className="info-callout" style={{ marginBottom: 16 }}>
          <Icon name="shield" />
          <p>Enter the 6-digit code from your authenticator app to continue.</p>
        </div>
        <FormField
          label="Verification code"
          placeholder="123456"
          value={code}
          onChange={(e) =>
            setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
        />
        {error && <p className="form-error">{error}</p>}
        <Button
          onClick={submit}
          disabled={busy || code.trim().length < 6}
          style={{ width: "100%", marginTop: 8 }}
        >
          {busy ? "Verifying..." : "Verify and continue"}
        </Button>
      </div>
    </div>
  );
}
