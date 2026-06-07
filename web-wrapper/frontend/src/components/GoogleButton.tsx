import { useEffect, useRef } from 'react';
import { post } from '../api';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

type GoogleCredentialResponse = { credential: string };

type GsiButtonText = 'signin_with' | 'signup_with' | 'continue_with' | 'signin';

interface GoogleButtonProps {
  text: GsiButtonText;
  onDone: () => Promise<void>;
  onNotice: (message: string, tone?: 'ok' | 'warn') => void;
  onError: (message: string) => void;
}

// "Sign in with Google" using the Google Identity Services (GIS) ID-token flow.
// The GIS client script is loaded in index.html. We receive an ID token (JWT)
// from Google, hand it to our backend, and the backend verifies it and issues
// the same session cookie used by email/password auth. No redirect, no secret.
export function GoogleButton({ text, onDone, onNotice, onError }: GoogleButtonProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!CLIENT_ID || !ref.current) return;

    let cancelled = false;

    async function handleCredential(response: GoogleCredentialResponse) {
      try {
        await post('/api/auth/google', { credential: response.credential });
        onNotice('로그인되었습니다 ✓');
        await onDone();
      } catch (e) {
        onError(e instanceof Error ? e.message : String(e));
      }
    }

    // GIS may not be ready on first paint; poll briefly until window.google exists.
    function tryInit() {
      if (cancelled) return;
      const gsi = window.google?.accounts?.id;
      if (!gsi || !ref.current) {
        window.setTimeout(tryInit, 120);
        return;
      }
      gsi.initialize({ client_id: CLIENT_ID!, callback: handleCredential });
      gsi.renderButton(ref.current, { theme: 'outline', size: 'large', width: 320, text });
    }

    tryInit();
    return () => {
      cancelled = true;
    };
  }, [text, onDone, onNotice, onError]);

  if (!CLIENT_ID) return null;
  return <div ref={ref} className="google-button" />;
}
