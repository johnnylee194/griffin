import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient, playersApi } from '../api/client';

interface User {
  id: string;
  username: string;
  name?: string;
  birthDate?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化：从 localStorage 读取 token
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      // 验证 token
      apiClient.get('/auth/verify')
        .then(async res => {
          setToken(storedToken);
          setUser(res.data.user);
          // 验证成功后，初始化用户数据（确保有"我"这个玩家）
          await initializeUserData();
        })
        .catch(() => {
          localStorage.removeItem('token');
          delete apiClient.defaults.headers.common['Authorization'];
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  // 初始化用户数据：确保有"我"这个玩家
  const initializeUserData = async () => {
    try {
      const playersRes = await playersApi.getAll();
      const me = playersRes.data.find(p => p.isMe);
      
      if (!me) {
        // 如果没有"我"，自动创建
        console.log('AuthContext: 未找到"我"玩家，自动创建...');
        await playersApi.create({ name: '我', isMe: true });
        console.log('AuthContext: "我"玩家创建成功');
      }
    } catch (error) {
      console.error('AuthContext: 初始化用户数据失败:', error);
      // 不抛出错误，避免影响登录流程
    }
  };

  const login = async (username: string, password: string) => {
    console.log('AuthContext: 调用登录API');
    try {
      const response = await apiClient.post('/auth/login', { username, password });
      console.log('AuthContext: 登录API响应:', response.data);
      const { token: newToken, user: newUser } = response.data;
      
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('token', newToken);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      console.log('AuthContext: 登录状态已更新');
      
      // 登录后初始化用户数据（确保有"我"这个玩家）
      await initializeUserData();
    } catch (error) {
      console.error('AuthContext: 登录API错误:', error);
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete apiClient.defaults.headers.common['Authorization'];
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

