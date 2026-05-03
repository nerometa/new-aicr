import { API_BASE } from '$lib/api';

export const load = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/experiments`);
    const experiments = res.ok ? await res.json() : [];
    return { experiments };
  } catch {
    return { experiments: [] };
  }
};