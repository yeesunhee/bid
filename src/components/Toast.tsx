import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 1600);
    return () => clearTimeout(t);
  }, [message]);
  return { message, show: setMessage };
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-950/90 px-4 py-2 text-sm text-emerald-100 shadow-xl">
      <Check className="h-4 w-4" />
      {message}
    </div>
  );
}
