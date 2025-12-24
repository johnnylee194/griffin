import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：添加 token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器：统一处理错误
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('⚠️ Token 过期或无效，需要重新登录');
      // 可以在这里触发登出逻辑
    }
    return Promise.reject(error);
  }
);

// 类型定义
export interface Player {
  id: string;
  name: string;
  avatar?: string;
  isMe: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
}

export interface PlayerRecord {
  id: string;
  gameId: string;
  playerId: string;
  score: number | null;
  chips: number | null;
  player: Player;
}

export interface Game {
  id: string;
  locationId: string;
  chipRate: number;
  isComplete: boolean;
  note?: string;
  createdAt: string;
  updatedAt: string;
  location: Location;
  records: PlayerRecord[];
}

// API 方法
export const playersApi = {
  getAll: () => apiClient.get<Player[]>('/players'),
  getOne: (id: string) => apiClient.get<Player>(`/players/${id}`),
  create: (data: Partial<Player>) => apiClient.post<Player>('/players', data),
  update: (id: string, data: Partial<Player>) => apiClient.put<Player>(`/players/${id}`, data),
  delete: (id: string) => apiClient.delete(`/players/${id}`),
};

export const locationsApi = {
  getAll: () => apiClient.get<Location[]>('/locations'),
  create: (data: Partial<Location>) => apiClient.post<Location>('/locations', data),
  update: (id: string, data: Partial<Location>) => apiClient.put<Location>(`/locations/${id}`, data),
  delete: (id: string) => apiClient.delete(`/locations/${id}`),
};

export const gamesApi = {
  getAll: (params?: { limit?: number; offset?: number }) => 
    apiClient.get<Game[]>('/games', { params }),
  getOne: (id: string) => apiClient.get<Game>(`/games/${id}`),
  create: (data: {
    locationId: string;
    chipRate: number;
    playerIds: string[];
    myScore: number;
    note?: string;
  }) => apiClient.post<Game>('/games', data),
  update: (id: string, data: {
    locationId: string;
    chipRate: number;
    playerIds: string[];
    myScore: number;
    note?: string;
  }) => apiClient.put<Game>(`/games/${id}`, data),
  delete: (id: string) => apiClient.delete(`/games/${id}`),
};

export const statsApi = {
  getPlayerStats: (playerId: string, params?: { startDate?: string; endDate?: string }) =>
    apiClient.get(`/stats/player/${playerId}`, { params }),
  getOverview: (params?: { startDate?: string; endDate?: string }) =>
    apiClient.get('/stats/overview', { params }),
  getAnnual: (year?: number) => apiClient.get('/stats/annual', { params: year ? { year } : {} }),
  getLunarAnnual: (year?: number) => apiClient.get('/stats/lunar-annual', { params: year ? { year } : {} }),
  getPlayerPerformance: () => apiClient.get('/stats/player-performance'),
  getTripleCombination: () => apiClient.get('/stats/triple-combination'),
};

