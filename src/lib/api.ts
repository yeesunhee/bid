import type {
  BidCostCalculation,
  BidCostScenario,
  CategoryLevel1,
  CategoryLevel2,
  DashboardPayload,
  HelpPost,
  PromptTemplate,
} from '../types';

const TOKEN_KEY = 'posco_admin_token';

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(path, { ...init, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(data?.error || `요청 실패 (${res.status})`);
  }
  return data as T;
}

export const api = {
  login: (password: string) => request<{ token: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ password }) }),
  level1: () => request<CategoryLevel1[]>('/api/categories/level1'),
  createLevel1: (body: { name: string; sortOrder: number }) =>
    request<CategoryLevel1>('/api/categories/level1', { method: 'POST', body: JSON.stringify(body) }),
  updateLevel1: (id: string, body: { name: string; sortOrder: number }) =>
    request<CategoryLevel1>(`/api/categories/level1/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteLevel1: (id: string) => request(`/api/categories/level1/${id}`, { method: 'DELETE' }),
  level2: () => request<CategoryLevel2[]>('/api/categories/level2'),
  createLevel2: (body: { parentId: string; name: string; description?: string; sortOrder: number }) =>
    request<CategoryLevel2>('/api/categories/level2', { method: 'POST', body: JSON.stringify(body) }),
  updateLevel2: (id: string, body: { parentId: string; name: string; description?: string; sortOrder: number }) =>
    request<CategoryLevel2>(`/api/categories/level2/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteLevel2: (id: string) => request(`/api/categories/level2/${id}`, { method: 'DELETE' }),
  prompts: (query?: { q?: string; categoryLevel2Id?: string }) => {
    const params = new URLSearchParams();
    if (query?.q) params.set('q', query.q);
    if (query?.categoryLevel2Id) params.set('categoryLevel2Id', query.categoryLevel2Id);
    const qs = params.toString();
    return request<PromptTemplate[]>(`/api/prompts${qs ? `?${qs}` : ''}`);
  },
  createPrompt: (body: Partial<PromptTemplate>) =>
    request<PromptTemplate>('/api/prompts', { method: 'POST', body: JSON.stringify(body) }),
  updatePrompt: (id: string, body: Partial<PromptTemplate>) =>
    request<PromptTemplate>(`/api/prompts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletePrompt: (id: string) => request(`/api/prompts/${id}`, { method: 'DELETE' }),
  resetPrompts: () => request('/api/prompts/reset', { method: 'POST' }),
  dashboard: () => request<DashboardPayload>('/api/economic/dashboard'),
  refreshEconomic: () => request<{ dashboard: DashboardPayload }>('/api/economic/refresh', { method: 'POST' }),
  saveBidCost: (scenario: BidCostScenario) =>
    request<BidCostScenario>('/api/economic/bid-cost', { method: 'PUT', body: JSON.stringify(scenario) }),
  calculateBidCost: (scenario: BidCostScenario) =>
    request<BidCostCalculation>('/api/economic/bid-cost/calculate', {
      method: 'POST',
      body: JSON.stringify({ scenario }),
    }),
  helpPosts: () => request<HelpPost[]>('/api/help-posts'),
  helpPost: (id: string) => request<HelpPost>(`/api/help-posts/${id}`),
  createHelpPost: async (title: string, body: string, files: File[]) => {
    const headers = new Headers();
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const form = new FormData();
    form.append('title', title);
    form.append('body', body);
    for (const file of files) form.append('files', file);
    const res = await fetch('/api/help-posts', { method: 'POST', headers, body: form });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      throw new Error(data?.error || `요청 실패 (${res.status})`);
    }
    return data as HelpPost;
  },
  deleteHelpPost: (id: string) => request(`/api/help-posts/${id}`, { method: 'DELETE' }),
};

export function helpAttachmentUrl(postId: string, attachmentId: string) {
  return `/api/help-posts/${postId}/attachments/${attachmentId}`;
}
