import { apiClient, setAccessToken } from "./client";

export interface UserDTO {
  id: string;
  email: string;
  role: "candidate" | "recruiter" | "admin";
  is_active: boolean;
}

export interface TokenResponseDTO {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: UserDTO;
}

export interface RegisterPayloadDTO {
  email: string;
  password: string;
  role: "candidate" | "recruiter";
  organization_name?: string;
}

export interface LoginPayloadDTO {
  email: string;
  password: string;
}

export const authAPI = {
  async register(payload: RegisterPayloadDTO): Promise<UserDTO> {
    const res = await apiClient.post<UserDTO>("/auth/register", payload);
    return res.data;
  },

  async login(payload: LoginPayloadDTO): Promise<TokenResponseDTO> {
    const res = await apiClient.post<TokenResponseDTO>("/auth/login", payload);
    setAccessToken(res.data.access_token);
    return res.data;
  },

  async refresh(): Promise<TokenResponseDTO> {
    const res = await apiClient.post<TokenResponseDTO>("/auth/refresh");
    setAccessToken(res.data.access_token);
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      setAccessToken(null);
    }
  },

  async me(): Promise<UserDTO> {
    const res = await apiClient.get<UserDTO>("/auth/me");
    return res.data;
  },
};
