import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 300000, // 5分钟超时（运势生成需要较长时间）
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

export interface GameType {
  id: string;
  locationId: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
}

export interface ChipRate {
  id: string;
  locationId: string;
  gameTypeId: string;
  chipRate: number;
  isDefault: boolean;
  note?: string;
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
  gameTypeId?: string;
  chipRateId?: string;
  chipRate: number; // 从location_chip_rates表获取，用于显示
  gameType?: GameType; // 玩法信息，用于显示
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

export const gameTypesApi = {
  getByLocation: (locationId: string) => apiClient.get<GameType[]>(`/game-types/location/${locationId}`),
  create: (data: { locationId: string; name: string; isDefault?: boolean }) => 
    apiClient.post<GameType>('/game-types', data),
  update: (id: string, data: { name?: string; isDefault?: boolean }) => 
    apiClient.put<GameType>(`/game-types/${id}`, data),
  delete: (id: string) => apiClient.delete(`/game-types/${id}`),
};

export const chipRatesApi = {
  getByLocationAndGameType: (locationId: string, gameTypeId: string) => 
    apiClient.get<ChipRate[]>(`/chip-rates/location/${locationId}/game-type/${gameTypeId}`),
  getByLocation: (locationId: string) => apiClient.get<ChipRate[]>(`/chip-rates/location/${locationId}`),
  create: (data: { locationId: string; gameTypeId: string; chipRate: number; isDefault?: boolean; note?: string }) => 
    apiClient.post<ChipRate>('/chip-rates', data),
  update: (id: string, data: { chipRate?: number; isDefault?: boolean; note?: string }) => 
    apiClient.put<ChipRate>(`/chip-rates/${id}`, data),
  delete: (id: string) => apiClient.delete(`/chip-rates/${id}`),
};

export const gamesApi = {
  getAll: (params?: { limit?: number; offset?: number }) => 
    apiClient.get<Game[]>('/games', { params }),
  getOne: (id: string) => apiClient.get<Game>(`/games/${id}`),
  create: (data: {
    locationId: string;
    gameTypeId: string;
    chipRateId: string;
    playerIds: string[];
    myScore: number;
    note?: string;
    createdAt?: string;
  }) => apiClient.post<Game>('/games', data),
  update: (id: string, data: {
    locationId: string;
    gameTypeId: string;
    chipRateId: string;
    playerIds: string[];
    myScore: number;
    note?: string;
    createdAt?: string;
  }) => apiClient.put<Game>(`/games/${id}`, data),
  delete: (id: string) => apiClient.delete(`/games/${id}`),
};

export const statsApi = {
  getPlayerStats: (playerId: string, params?: { startDate?: string; endDate?: string; locationId?: string }) =>
    apiClient.get(`/stats/player/${playerId}`, { params }),
  getOverview: (params?: { startDate?: string; endDate?: string }) =>
    apiClient.get('/stats/overview', { params }),
  getAnnual: (year?: number) => apiClient.get('/stats/annual', { params: year ? { year } : {} }),
  getLunarAnnual: (year?: number) => apiClient.get('/stats/lunar-annual', { params: year ? { year } : {} }),
  getPlayerPerformance: () => apiClient.get('/stats/player-performance'),
  getDoubleCombination: () => apiClient.get('/stats/double-combination'),
  getTripleCombination: () => apiClient.get('/stats/triple-combination'),
  getAfternoonEveningCorrelation: (locationId: string, score: number, scoreType: 'win' | 'lose') =>
    apiClient.get('/stats/afternoon-evening-correlation', { params: { locationId, score, scoreType } }),
  getLosingStreaks: (params?: { locationId?: string }) => apiClient.get('/stats/losing-streaks', { params }),
};

export interface User {
  id: string;
  username: string;
  name?: string;
  birthDate?: string;
}

export interface Horoscope {
  date: string;
  chineseHoroscope: string;
  westernHoroscope: string;
  combinedAdvice: string;
  cached: boolean;
}

export const authApi = {
  getProfile: () => apiClient.get<{ user: User }>('/auth/profile'),
  updateProfile: (data: { name?: string; password?: string; oldPassword?: string; birthDate?: string }) => 
    apiClient.put<{ user: User }>('/auth/profile', data),
};

export const horoscopeApi = {
  get: (date?: string) => apiClient.get<Horoscope>(`/horoscope${date ? `/${date}` : ''}`),
  refresh: (date?: string) => apiClient.post(`/horoscope/refresh${date ? `/${date}` : ''}`),
};

// 自定义筛选器类型定义
export interface CustomFilter {
  id: string;
  userId: string;
  name: string;
  startDate?: string;
  endDate?: string; // 可以是日期字符串或 "TODAY"
  locationIds: string[];
  playerIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FilterStats {
  overall: {
    totalGames: number;
    wins: number;
    losses: number;
    winRate: number;
    totalScore: number;
    totalChips: number;
    avgScorePerGame: number;
    avgChipsPerGame: number;
    maxWinScore: number;
    maxLossScore: number;
    maxWinChips: number;
    maxLossChips: number;
    maxDayWinScore: number;
    maxDayLossScore: number;
    maxDayWinChips: number;
    maxDayLossChips: number;
  };
  afternoon: {
    totalGames: number;
    wins: number;
    losses: number;
    winRate: number;
    totalScore: number;
    totalChips: number;
    avgScorePerGame: number;
    avgChipsPerGame: number;
    maxWinScore: number;
    maxLossScore: number;
    maxWinChips: number;
    maxLossChips: number;
  };
  evening: {
    totalGames: number;
    wins: number;
    losses: number;
    winRate: number;
    totalScore: number;
    totalChips: number;
    avgScorePerGame: number;
    avgChipsPerGame: number;
    maxWinScore: number;
    maxLossScore: number;
    maxWinChips: number;
    maxLossChips: number;
  };
  dailyStats: Array<{
    date: string;
    totalScore: number;
    totalChips: number;
    afternoonScore: number;
    afternoonChips: number;
    eveningScore: number;
    eveningChips: number;
    totalGames: number;
    afternoonGames: number;
    eveningGames: number;
  }>;
  hasOtherTimeGames: boolean;
  games: Array<{
    id: string;
    createdAt: string;
    location: { id: string; name: string };
    chipRate: number;
    records: Array<{
      id: string;
      playerId: string;
      score: number | null;
      chips: number | null;
      player: { name: string; isMe: boolean };
    }>;
  }>;
}

export const customFiltersApi = {
  getAll: () => apiClient.get<CustomFilter[]>('/custom-filters'),
  getOne: (id: string) => apiClient.get<CustomFilter>(`/custom-filters/${id}`),
  create: (data: {
    name: string;
    startDate?: string;
    endDate?: string;
    locationIds?: string[];
    playerIds?: string[];
  }) => apiClient.post<CustomFilter>('/custom-filters', data),
  update: (id: string, data: {
    name: string;
    startDate?: string;
    endDate?: string;
    locationIds?: string[];
    playerIds?: string[];
  }) => apiClient.put<CustomFilter>(`/custom-filters/${id}`, data),
  delete: (id: string) => apiClient.delete(`/custom-filters/${id}`),
  getStats: (id: string) => apiClient.post<FilterStats>(`/custom-filters/${id}/stats`),
};
