import { useEffect, useState } from "react";
import { staticCategories, staticWorks } from "./staticWorks";

const authKey = "portfolio_admin_token";
const allCategory = "全部";

const normalize = (work) => ({
  ...work,
  id: String(work.id),
  media: work.media || work.mediaType,
  mediaType: work.mediaType || work.media,
  src: work.src || work.fileUrl,
  fileUrl: work.fileUrl || work.src,
  coverUrl: work.coverUrl || work.poster || "",
  previewSrc: work.previewSrc || work.coverUrl || work.poster || (work.media === "video" || work.mediaType === "video" ? "" : work.fileUrl || work.src),
  poster: work.poster || work.coverUrl || undefined,
  tags: Array.isArray(work.tags) ? work.tags : [],
  time: work.time || work.projectTime,
  description: work.description || work.background,
});

export const getToken = () => localStorage.getItem(authKey);
export const setToken = (token) => localStorage.setItem(authKey, token);
export const clearToken = () => localStorage.removeItem(authKey);

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  const response = await fetch(path, { ...options, headers });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || response.statusText);
  return response.json();
}

export async function fetchWorks() {
  const works = await apiFetch("/api/works");
  return works.map(normalize);
}

export async function fetchCategories() {
  return apiFetch("/api/categories");
}

export function useWorks() {
  const [works, setWorks] = useState(staticWorks);
  const [categories, setCategories] = useState([allCategory, ...staticCategories]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const useStaticWorks = (message = "") => {
    setWorks(staticWorks);
    setCategories([allCategory, ...staticCategories]);
    setError(message);
  };

  const reload = async () => {
    setLoading(true);
    try {
      const [nextWorks, nextCategories] = await Promise.all([fetchWorks(), fetchCategories()]);
      setWorks(nextWorks);
      setCategories([allCategory, ...nextCategories]);
      setError("");
    } catch (caught) {
      useStaticWorks(caught.message || "API unavailable");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  return { works, categories, loading, error, reload, setWorks };
}
