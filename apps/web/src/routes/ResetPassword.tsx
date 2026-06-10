import { FormEvent, useEffect, useState } from "react";
import { FiLock } from "react-icons/fi";
import { Link, useSearchParams } from "react-router-dom";
import { apiClient } from "../shared/apiClient";
import { setDocumentTitle } from "../shared/siteConfig";

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const error = searchParams.get("error") ?? "";
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitError, setSubmitError] = useState(error ? "This reset link is invalid or expired." : "");
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setDocumentTitle("Reset Password");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    setMessage("");
    setIsPending(true);

    try {
      await apiClient.auth.resetPassword(token, password);
      setMessage("Password updated. You can sign in with the new password.");
      setPassword("");
    } catch (caught) {
      setSubmitError(caught instanceof Error ? caught.message : "Password reset failed.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section className="dashboard-gate">
      <form className="dashboard-gate__panel" onSubmit={(event) => void submit(event)}>
        <div className="dashboard-gate__mark">
          <FiLock aria-hidden />
        </div>
        <span className="dashboard-eyebrow">Account recovery</span>
        <h1>Reset password</h1>
        <p className="dashboard-note">Set a new password for your dashboard account.</p>
        <label>
          <span>New password</span>
          <input autoComplete="new-password" disabled={!token || isPending} minLength={8} onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
        </label>
        {submitError ? <p className="dashboard-message dashboard-message--error">{submitError}</p> : null}
        {message ? <p className="dashboard-message dashboard-message--success">{message}</p> : null}
        <button disabled={!token || password.length < 8 || isPending} type="submit">
          {isPending ? "Updating..." : "Update password"}
        </button>
        <Link className="dashboard-gate__link" to="/dashboard">
          Back to dashboard
        </Link>
      </form>
    </section>
  );
}
