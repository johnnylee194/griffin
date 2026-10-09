import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import NewGamePage from './pages/NewGamePage'
import EditGamePage from './pages/EditGamePage'
import HistoryPage from './pages/HistoryPage'
import StatsPage from './pages/StatsPage'
import PlayerStatsArchivePage from './pages/PlayerStatsArchivePage'
import SettingsPage from './pages/SettingsPage'
import { FilterConfigPage } from './pages/FilterConfigPage'
import { FilterStatsPage } from './pages/FilterStatsPage'

// 受保护的路由组件
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-gold">加载中...</div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  )
}

function AppContent() {
  const [activeTab, setActiveTab] = useState('home')
  const [showHeader, setShowHeader] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const location = useLocation()
  const { logout, token } = useAuth()
  const isLoginPage = location.pathname === '/login'
  
  // 如果已登录且在登录页，跳转到首页
  useEffect(() => {
    if (token && isLoginPage) {
      window.location.href = '/';
    }
  }, [token, isLoginPage]);

  // 根据路径设置activeTab
  useEffect(() => {
    const path = location.pathname;
    if (path === '/') setActiveTab('home');
    else if (path === '/stats') setActiveTab('stats');
    else if (path === '/settings') setActiveTab('settings');
  }, [location.pathname]);

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const currentScrollY = e.currentTarget.scrollTop
    if (currentScrollY > lastScrollY && currentScrollY > 50) {
      setShowHeader(false)
    } else {
      setShowHeader(true)
    }
    setLastScrollY(currentScrollY)
  }

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      logout()
    }
  }

  if (isLoginPage) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    )
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-bg overflow-hidden">
      {/* 顶部导航栏 */}
      <header
        className={`flex-shrink-0 bg-white border-b border-gray-200 px-4 py-1.5 sm:py-2 shadow-sm transition-all duration-300 transform ${
          showHeader ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
        } ${showHeader ? 'h-auto' : 'h-0 overflow-hidden border-none'}`}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src="/griffin-logo.svg" alt="Griffin" className="w-7 h-7 sm:w-9 sm:h-9" />
            <h1 className="text-lg sm:text-xl font-bold text-primary">
              Griffin
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-text-secondary hover:text-primary transition-colors text-sm"
            title="退出登录"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 overflow-y-auto" onScroll={handleScroll}>
        <Routes>
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/new-game" element={<ProtectedRoute><NewGamePage /></ProtectedRoute>} />
          <Route path="/edit-game/:id" element={<ProtectedRoute><EditGamePage /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
          <Route path="/stats" element={<ProtectedRoute><StatsPage /></ProtectedRoute>} />
          <Route path="/stats/archive" element={<ProtectedRoute><PlayerStatsArchivePage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/filter/new" element={<ProtectedRoute><FilterConfigPage /></ProtectedRoute>} />
          <Route path="/filter/edit/:id" element={<ProtectedRoute><FilterConfigPage /></ProtectedRoute>} />
          <Route path="/filter/:id" element={<ProtectedRoute><FilterStatsPage /></ProtectedRoute>} />
          <Route path="/dynamic-stats" element={<ProtectedRoute><FilterStatsPage /></ProtectedRoute>} />
        </Routes>
      </main>

      {/* 底部导航栏 */}
      <nav className="flex-shrink-0 bg-white border-t border-gray-200 px-2 py-1.5 sm:py-2 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="max-w-6xl mx-auto flex justify-around">
          <NavButton to="/" icon="🏠" label="首页" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <NavButton to="/stats" icon="📊" label="统计" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />
        </div>
      </nav>
    </div>
  )
}

function NavButton({ to, icon, label, active, onClick }: any) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex flex-col items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 transition-colors ${
        active ? 'text-primary font-bold' : 'text-text-secondary'
      }`}
    >
      <span className="text-xl sm:text-2xl mb-0.5 sm:mb-1">{icon}</span>
      <span className="text-[10px] sm:text-xs">{label}</span>
    </Link>
  )
}

export default App
