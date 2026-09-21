import { ArrowLeft, Download, Paperclip, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useHelpBoard } from '../hooks/useHelpBoard';
import { usePromptStore } from '../hooks/usePromptStore';
import { helpAttachmentUrl } from '../lib/api';
import type { HelpPost } from '../types';

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_FILES = 10;
const ALLOWED_EXT = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.csv',
  '.zip',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
]);

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileExt(name: string) {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx).toLowerCase() : '';
}

export default function HelpBoard() {
  const { isAdmin, level2, selectedLevel2Id } = usePromptStore();
  const board = useHelpBoard();
  const tool = level2.find((c) => c.id === selectedLevel2Id);
  const title = tool?.name || '참고 문서 모음';

  const confirmDelete = async (id: string) => {
    if (!window.confirm('이 게시물과 첨부파일을 삭제할까요?')) return;
    try {
      await board.removePost(id);
    } catch (err) {
      board.setError(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    if (!isAdmin && board.view === 'create') board.openList();
  }, [isAdmin, board.view, board.openList]);

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden p-6">
      {board.view === 'list' && (
        <ListView
          title={title}
          isAdmin={isAdmin}
          loading={board.loading}
          error={board.error}
          posts={board.posts}
          onCreate={board.openCreate}
          onOpen={board.openDetail}
          onDelete={confirmDelete}
        />
      )}
      {board.view === 'detail' && board.selected && (
        <DetailView
          isAdmin={isAdmin}
          post={board.selected}
          onBack={board.openList}
          onDelete={() => confirmDelete(board.selected!.id)}
        />
      )}
      {board.view === 'create' && isAdmin && (
        <CreateView
          onBack={board.openList}
          onSubmit={async (postTitle, body, files) => {
            await board.createPost(postTitle, body, files);
          }}
        />
      )}
    </section>
  );
}

function ListView({
  title,
  isAdmin,
  loading,
  error,
  posts,
  onCreate,
  onOpen,
  onDelete,
}: {
  title: string;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  posts: ReturnType<typeof useHelpBoard>['posts'];
  onCreate: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">게시물 {posts.length}건</p>
        </div>
        {isAdmin && (
          <button
            onClick={onCreate}
            className="inline-flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-1.5 text-sm text-white hover:bg-orange-400"
          >
            <Plus className="h-4 w-4" />
            새 글
          </button>
        )}
      </div>
      {error && <p className="mb-3 text-sm text-red-300">{error}</p>}
      {loading ? (
        <div className="flex flex-1 items-center justify-center text-slate-400">불러오는 중…</div>
      ) : posts.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-slate-500">
          <p>등록된 참고 문서가 없습니다.</p>
          {isAdmin ? (
            <>
              <p className="mt-1 text-sm">새 글을 작성해 주세요.</p>
              <button
                onClick={onCreate}
                className="mt-4 inline-flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-1.5 text-sm text-white hover:bg-orange-400"
              >
                <Plus className="h-4 w-4" />
                첫 글 등록
              </button>
            </>
          ) : (
            <p className="mt-1 text-sm">관리자로 로그인하면 첫 글을 등록할 수 있습니다.</p>
          )}
        </div>
      ) : (
        <div className="overflow-auto rounded-xl border border-slate-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-slate-400">
              <tr>
                <th className="px-4 py-2 font-medium">제목</th>
                <th className="w-28 px-4 py-2 font-medium">첨부</th>
                <th className="w-44 px-4 py-2 font-medium">등록일</th>
                {isAdmin && <th className="w-16 px-4 py-2 font-medium">관리</th>}
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => {
                const count = post.attachmentCount ?? post.attachments?.length ?? 0;
                return (
                  <tr key={post.id} className="border-t border-slate-800 hover:bg-slate-900/60">
                    <td className="px-4 py-3">
                      <button
                        className="text-left text-slate-100 hover:text-orange-200"
                        onClick={() => onOpen(post.id)}
                      >
                        {post.title}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {count > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Paperclip className="h-3.5 w-3.5" />
                          {count}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{formatDateTime(post.createdAt)}</td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <button
                          className="text-red-400 hover:text-red-300"
                          title="삭제"
                          onClick={() => onDelete(post.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function DetailView({
  isAdmin,
  post,
  onBack,
  onDelete,
}: {
  isAdmin: boolean;
  post: HelpPost;
  onBack: () => void;
  onDelete: () => void;
}) {
  const files = post.attachments ?? [];
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-slate-300 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          목록
        </button>
        {isAdmin && (
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 px-3 py-1.5 text-sm text-red-200 hover:bg-red-950/40"
          >
            <Trash2 className="h-4 w-4" />
            삭제
          </button>
        )}
      </div>
      <h2 className="text-xl font-semibold text-white">{post.title}</h2>
      <p className="mt-1 text-sm text-slate-400">{formatDateTime(post.createdAt)}</p>
      <div className="mt-4 flex-1 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900/50 p-4">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-slate-200">
          {post.body || '내용이 없습니다.'}
        </pre>
      </div>
      <div className="mt-4">
        <p className="mb-2 text-sm font-medium text-slate-300">첨부파일</p>
        {files.length === 0 ? (
          <p className="text-sm text-slate-500">첨부파일 없음</p>
        ) : (
          <ul className="space-y-2">
            {files.map((file) => (
              <li
                key={file.id}
                className="flex items-center justify-between rounded-lg border border-slate-700 px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate text-slate-200">
                  {file.originalName}
                  <span className="ml-2 text-slate-500">{formatBytes(file.sizeBytes)}</span>
                </span>
                <a
                  href={helpAttachmentUrl(post.id, file.id)}
                  className="inline-flex items-center gap-1 text-sky-300 hover:text-sky-200"
                >
                  <Download className="h-4 w-4" />
                  다운로드
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CreateView({
  onBack,
  onSubmit,
}: {
  onBack: () => void;
  onSubmit: (title: string, body: string, files: File[]) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    for (const file of Array.from(list)) {
      if (next.length >= MAX_FILES) {
        setError('한 글당 파일은 최대 10개입니다.');
        break;
      }
      if (file.size > MAX_FILE_BYTES) {
        setError(`파일당 최대 크기는 20MB입니다: ${file.name}`);
        continue;
      }
      if (!ALLOWED_EXT.has(fileExt(file.name))) {
        setError(`허용되지 않는 파일 형식입니다: ${file.name}`);
        continue;
      }
      next.push(file);
    }
    setFiles(next);
  };

  const submit = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('제목을 입력하세요.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(trimmed, body, files);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <button
        onClick={() => {
          if (title || body || files.length) {
            if (!window.confirm('작성 중인 내용을 버리고 목록으로 돌아갈까요?')) return;
          }
          onBack();
        }}
        className="mb-4 inline-flex w-fit items-center gap-1 text-sm text-slate-300 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        목록
      </button>
      <h2 className="mb-4 text-xl font-semibold text-white">새 글</h2>
      {error && <p className="mb-3 text-sm text-red-300">{error}</p>}
      <input
        className="field-input mb-3"
        placeholder="제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="field-input mb-3 min-h-[220px] flex-1 resize-y"
        placeholder="내용 (선택)"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="mb-4 rounded-xl border border-slate-700 p-3">
        <label className="mb-2 block text-sm text-slate-300">첨부파일</label>
        <input
          type="file"
          multiple
          className="text-sm text-slate-300"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
        {files.length > 0 && (
          <ul className="mt-3 space-y-1">
            {files.map((file, idx) => (
              <li key={`${file.name}-${idx}`} className="flex items-center justify-between text-sm text-slate-200">
                <span className="truncate">
                  {file.name}
                  <span className="ml-2 text-slate-500">{formatBytes(file.size)}</span>
                </span>
                <button
                  className="text-slate-400 hover:text-white"
                  onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        disabled={saving}
        onClick={() => void submit()}
        className="self-start rounded-lg bg-orange-500 px-4 py-2 text-sm text-white hover:bg-orange-400 disabled:opacity-50"
      >
        {saving ? '등록 중…' : '등록'}
      </button>
    </div>
  );
}
