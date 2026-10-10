'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const timeFmt = new Intl.DateTimeFormat('en-US', { timeStyle: 'short' });

/**
 * Reloads the admin data from the server every `seconds` while the tab is open, and right away
 * when a volunteer comes back to the tab. Data still only comes from the server.
 */
export default function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  const [updated, setUpdated] = useState<Date | null>(null);

  useEffect(() => {
    setUpdated(new Date());
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      router.refresh();
      setUpdated(new Date());
    };
    const timer = setInterval(refresh, seconds * 1000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [router, seconds]);

  return (
    <p className="fine" aria-live="polite">
      Updates every {seconds} seconds{updated && ` · last checked ${timeFmt.format(updated)}`}
    </p>
  );
}
