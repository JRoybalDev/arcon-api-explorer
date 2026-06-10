export async function apiJson(path: string, init?: RequestInit) {
  const isFormData = init?.body instanceof FormData;
  const response = await fetch(path, {
    ...init,
    credentials: init?.credentials ?? "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers
    }
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(json?.error ?? `Request failed with ${response.status}`);
  }

  if (json && typeof json === "object" && "success" in json) {
    if (json.success === false) {
      throw new Error(json.error ?? `Request failed with ${response.status}`);
    }

    return json.data;
  }

  return json;
}

export function withAdminKey(adminKey: string, init?: RequestInit): RequestInit {
  return {
    ...init,
    headers: {
      "X-Admin-Key": adminKey,
      ...init?.headers
    }
  };
}
