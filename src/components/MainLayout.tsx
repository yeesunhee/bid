import { LayoutDashboard, LogOut, Search, ShieldAlert, Sparkles } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { AppViewMode } from '../types';
import { usePromptStore } from '../hooks/usePromptStore';
import CategoryTree from './CategoryTree';
import PromptBox from './PromptBox';
import HelpBoard from './HelpBoard';
import LoginModal from './LoginModal';
import AdminEditor from './AdminEditor';
import EconomicDashboard from './dashboard/EconomicDashboard';

export default function MainLayout() {
  const [view, setView] = useState<AppViewMode>('dashboard');
  const [loginOpen, setLoginOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const { searchQuery, setSearchQuery, isAdmin, login, logout, error, loading, level2, selectedLevel2Id } =
    usePromptStore();
  const selectedLevel2 = level2.find((item) => item.id === selectedLevel2Id);
  const isBoard = selectedLevel2?.viewType === 'board';

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="flex items-center gap-4 border-b border-slate-800 bg-slate-950/80 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-300 text-xs font-black text-slate-950">
            PS
          </div>
          <div>
            <p className="text-sm font-bold tracking-wide text-white">POSCO STEELEON</p>
            <p className="text-xs text-slate-400">구매 입찰 지원 시스템 - 프롬프트 관리자</p>
          </div>
        </div>
        <nav className="ml-6 flex rounded-lg border border-slate-700 p-1">
          <NavBtn active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<LayoutDashboard className="h-4 w-4" />} label="경제지표" />
          <NavBtn active={view === 'prompts'} onClick={() => setView('prompts')} icon={<Sparkles className="h-4 w-4" />} label="프롬프트 관리" />
        </nav>
        {view === 'prompts' && (
          <div className="relative ml-auto w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              className="field-input pl-9"
              placeholder="프롬프트 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}
        <div className={`${view === 'prompts' ? '' : 'ml-auto'} flex items-center gap-2`}>
          {isAdmin ? (
            <>
              <button
                onClick={() => setAdminOpen(true)}
                className="rounded-lg border border-orange-400/40 px-3 py-1.5 text-sm text-orange-200 hover:bg-orange-500/10"
              >
                관리자
              </button>
              <button onClick={logout} className="rounded-lg p-2 text-slate-400 hover:text-white">
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setLoginOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
            >
              <ShieldAlert className="h-4 w-4" />
              관리자 로그인
            </button>
          )}
        </div>
      </header>
      {error && view === 'prompts' && <div className="bg-red-950/70 px-5 py-2 text-sm text-red-200">{error}</div>}
      <main className="flex min-h-0 flex-1">
        {view === 'dashboard' ? (
          <EconomicDashboard isAdmin={isAdmin} />
        ) : (
          <>
            <CategoryTree />
            {loading ? (
              <div className="flex flex-1 items-center justify-center text-slate-400">불러오는 중…</div>
            ) : isBoard ? (
              <HelpBoard key={selectedLevel2Id ?? 'board'} />
            ) : (
              <PromptBox />
            )}
          </>
        )}
      </main>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} onSubmit={login} />
      <AdminEditor open={adminOpen} onClose={() => setAdminOpen(false)} />
    </div>
  );
}

function NavBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm ${
        active ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
