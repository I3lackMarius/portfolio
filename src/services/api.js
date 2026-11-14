import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";
let csrfToken;
let csrfRequest;

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getCsrfToken = () => {
  if (csrfToken) {
    return Promise.resolve(csrfToken);
  }
  if (!csrfRequest) {
    csrfRequest = api
      .get("/auth/csrf")
      .then(({ data }) => {
        if (typeof data.csrfToken !== "string" || !data.csrfToken) {
          throw new Error("The API did not return a CSRF token");
        }
        csrfToken = data.csrfToken;
        return csrfToken;
      })
      .finally(() => {
        csrfRequest = undefined;
      });
  }
  return csrfRequest;
};

export const clearCsrfToken = () => {
  csrfToken = undefined;
};

api.interceptors.request.use((config) => {
  const method = config.method?.toLowerCase();
  if (method && !["get", "head", "options"].includes(method) && csrfToken) {
    config.headers.set("X-CSRF-Token", csrfToken);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    if (
      error.response?.status === 401 &&
      !["/auth/login", "/auth/csrf", "/auth/logout"].some((path) =>
        url.startsWith(path),
      ) &&
      typeof window !== "undefined"
    ) {
      window.dispatchEvent(new Event("auth:session-expired"));
    }
    return Promise.reject(error);
  },
);
