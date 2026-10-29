import type { Answers, Form, FormSchema, PublicForm, ResponsesPage } from "./types";

// Empty in dev (Vite proxies /api). Set VITE_API_URL when the API is elsewhere.
export const BASE = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail: unknown,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = typeof body.detail === "string" ? body.detail : res.statusText;
    throw new ApiError(res.status, msg, body.detail);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

const send = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

type FormInput = { title: string; description: string; schema: FormSchema };

export const api = {
  me: () => request<{ owner: boolean }>("/api/auth/me"),
  login: (password: string) => request("/api/auth/login", send("POST", { password })),
  logout: () => request("/api/auth/logout", send("POST")),

  forms: () => request<Form[]>("/api/forms"),
  form: (id: number) => request<Form>(`/api/forms/${id}`),
  createForm: (input: FormInput) => request<Form>("/api/forms", send("POST", input)),
  saveForm: (id: number, input: FormInput) => request<Form>(`/api/forms/${id}`, send("PUT", input)),
  publish: (id: number, published: boolean) =>
    request<Form>(`/api/forms/${id}/publish`, send("POST", { published })),
  deleteForm: (id: number) => request<void>(`/api/forms/${id}`, send("DELETE")),
  responses: (id: number) => request<ResponsesPage>(`/api/forms/${id}/responses`),
  csvUrl: (id: number) => `${BASE}/api/forms/${id}/responses.csv`,

  publicForm: (slug: string) => request<PublicForm>(`/api/public/forms/${slug}`),
  submit: (slug: string, answers: Answers) =>
    request<{ id: number }>(`/api/public/forms/${slug}/responses`, send("POST", answers)),
};

export const shareUrl = (slug: string) => `${window.location.origin}/f/${slug}`;
