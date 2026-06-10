import { type FormEvent, useState } from "react";

type SignInProps = {
  isChecking?: boolean;
  isInvalid?: boolean;
  onUnlock: (adminKey: string) => void;
};

function SignIn({ isChecking = false, isInvalid = false, onUnlock }: SignInProps) {
  const [adminKey, setAdminKey] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onUnlock(adminKey.trim());
  }

  return (
    <section className="signin-shell">
      <div className="signin-brand" aria-label="ARCON private media archive">
        <span className="signin-brand__mark" aria-hidden>
          <svg viewBox="0 0 24 24" role="img">
            <path d="M12 3.25 4.5 7.4v8.35L12 20l7.5-4.25V7.4L12 3.25Z" />
            <path d="M12 11.8 4.85 7.65M12 11.8l7.15-4.15M12 11.8v7.75" />
          </svg>
        </span>
        <div>
          <h1>ARCON</h1>
          <p>Private media archive</p>
        </div>
      </div>

      <form className="signin-card" onSubmit={submit}>
        <label>
          <span>Access code</span>
          <div className="signin-input-wrap">
            <input
              autoComplete="current-password"
              autoFocus
              disabled={isChecking}
              onChange={(event) => setAdminKey(event.target.value)}
              placeholder="Enter access code"
              type="password"
              value={adminKey}
            />
          </div>
        </label>
        {isInvalid ? <p className="signin-error">That key did not match the server environment.</p> : null}
        <button disabled={adminKey.trim().length === 0 || isChecking} type="submit">
          {isChecking ? "Checking..." : "Enter archive"}
        </button>
      </form>

      <p className="signin-disclaimer">Private access only - unauthorized use prohibited</p>
    </section>
  );
}

export default SignIn;
