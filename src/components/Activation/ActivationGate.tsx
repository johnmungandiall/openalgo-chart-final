/**
 * ActivationGate — wraps the whole app. On launch it resolves access against
 * Supabase (validates a cached license key, else the auto-starting 14-day
 * trial). Children render only when access is granted (active trial or valid
 * license); otherwise it shows a lock/activation screen. This runs BEFORE the
 * OpenAlgo connection, so an unlicensed/expired app never starts fetching data.
 */
import { useState, useEffect, useCallback, type ReactNode, type FormEvent } from 'react';
import { resolveAccess, submitKey, submitRegistration, type AccessState } from '@/services/activation';
import styles from './ActivationGate.module.css';

interface ActivationGateProps {
  children: ReactNode;
}

const REASON_MESSAGES: Record<string, string> = {
  not_found: 'That key was not found. Check it and try again.',
  revoked: 'This key has been revoked. Contact support.',
  bound_other_device: 'This key is already activated on another device.',
  expired: 'This license has expired. Please renew.',
  bad_input: 'Please enter your activation key.',
  invalid: 'That key could not be validated.',
};

const REGISTER_REASON_MESSAGES: Record<string, string> = {
  device_limit: 'An account is already registered on this computer. Only one account is allowed per computer.',
  email_taken: 'That email is already registered. Use a different email.',
  bad_email: 'Please enter a valid email address.',
  bad_input: 'Please enter your name and email.',
  offline: 'Could not reach the server. Check your internet and try again.',
  invalid: 'Registration failed. Please try again.',
};

export default function ActivationGate({ children }: ActivationGateProps) {
  const [access, setAccess] = useState<AccessState>({ status: 'loading' });
  const [keyInput, setKeyInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Registration form state.
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regError, setRegError] = useState<string | null>(null);

  const check = useCallback(async () => {
    setAccess({ status: 'loading' });
    setAccess(await resolveAccess());
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  const handleActivate = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      const result = await submitKey(keyInput);
      setAccess(result);
      setSubmitting(false);
    },
    [keyInput]
  );

  const handleRegister = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      setRegError(null);
      const outcome = await submitRegistration(regName, regEmail);
      if (outcome.ok && outcome.next) {
        setAccess(outcome.next);
      } else {
        setRegError(REGISTER_REASON_MESSAGES[outcome.reason ?? 'invalid'] ?? REGISTER_REASON_MESSAGES.invalid);
      }
      setSubmitting(false);
    },
    [regName, regEmail]
  );

  // Access granted — render the app.
  if (access.status === 'licensed' || access.status === 'trial') {
    return <>{children}</>;
  }

  // Registration required (no account on this computer yet).
  if (access.status === 'needs_registration') {
    return (
      <div className={styles.screen}>
        <form className={styles.card} onSubmit={handleRegister}>
          <h1 className={styles.title}>Create your account</h1>
          <p className={styles.text}>
            Register to start your free 14-day trial. One account per computer.
          </p>
          <input
            className={styles.input}
            type="text"
            placeholder="Full name"
            value={regName}
            onChange={(e) => setRegName(e.target.value)}
            autoFocus
          />
          <input
            className={styles.input}
            type="email"
            placeholder="Email address"
            value={regEmail}
            onChange={(e) => setRegEmail(e.target.value)}
            spellCheck={false}
          />
          {regError && <div className={styles.error}>{regError}</div>}
          <button className={styles.primaryBtn} type="submit" disabled={submitting}>
            {submitting ? 'Registering…' : 'Register & start trial'}
          </button>
        </form>
      </div>
    );
  }

  // Loading splash.
  if (access.status === 'loading') {
    return (
      <div className={styles.screen}>
        <div className={styles.spinner} />
        <div className={styles.subtitle}>Verifying your license…</div>
      </div>
    );
  }

  // Offline — could not reach the licensing server.
  if (access.status === 'offline') {
    return (
      <div className={styles.screen}>
        <div className={styles.card}>
          <h1 className={styles.title}>No internet connection</h1>
          <p className={styles.text}>
            Open Chart needs to verify your license online. Connect to the internet and retry.
          </p>
          <button className={styles.primaryBtn} onClick={() => void check()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Locked (trial over) or invalid key entered — show the activation form.
  const lockHeading =
    access.status === 'locked'
      ? access.reason === 'trial_expired'
        ? 'Your free trial has ended'
        : 'Activation required'
      : 'Enter your activation key';
  const errorMsg = access.status === 'invalid' ? REASON_MESSAGES[access.reason] ?? REASON_MESSAGES.invalid : null;

  return (
    <div className={styles.screen}>
      <form className={styles.card} onSubmit={handleActivate}>
        <h1 className={styles.title}>{lockHeading}</h1>
        <p className={styles.text}>
          Enter the activation key you received to unlock Open Chart on this device.
        </p>
        <input
          className={styles.input}
          type="text"
          placeholder="XXXX-XXXX-XXXX-XXXX"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          autoFocus
          spellCheck={false}
        />
        {errorMsg && <div className={styles.error}>{errorMsg}</div>}
        <button className={styles.primaryBtn} type="submit" disabled={submitting}>
          {submitting ? 'Activating…' : 'Activate'}
        </button>
      </form>
    </div>
  );
}
