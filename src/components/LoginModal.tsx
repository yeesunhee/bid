import { useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (password: string) => Promise<void>;
}

export default function LoginModal({ open, onClose, onSubmit }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-panel p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-100">
            <ShieldAlert className="h-5 w-5 text-orange-400" />
            <h2 className="font-semibold">관리자 로그인</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              await onSubmit(password);
              setPassword('');
              onClose();
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err));
            } finally {
              setBusy(false);
            }
          }}
          className="space-y-3"
        >
          <input
            type="password"
            className="field-input"
            placeholder="관리자 비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-orange-500 py-2 text-sm font-semibold text-white hover:bg-orange-400 disabled:opacity-60"
          >
            {busy ? '확인 중…' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
