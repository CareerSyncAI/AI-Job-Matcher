export const env = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1",
  useMock: process.env.NEXT_PUBLIC_USE_MOCK === "true",
};
