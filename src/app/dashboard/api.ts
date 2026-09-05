async function call(path: string, token: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string });
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function api(token: string) {
  return {
    get: (path: string) => call(path, token),
    post: (path: string, body: unknown) =>
      call(path, token, { method: "POST", body: JSON.stringify(body) }),
    patch: (path: string, body: unknown) =>
      call(path, token, { method: "PATCH", body: JSON.stringify(body) }),
    del: (path: string) => call(path, token, { method: "DELETE" }),
  };
}
