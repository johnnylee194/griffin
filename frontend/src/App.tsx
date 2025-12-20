import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import NewGamePage from './pages/NewGamePage'
import HistoryPage from './pages/HistoryPage'
import StatsPage from './pages/StatsPage'
import SettingsPage from './pages/SettingsPage'

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
  const location = useLocation()
  const { logout, token } = useAuth()
  const isLoginPage = location.pathname === '/login'
  
  // 如果已登录且在登录页，跳转到首页
  useEffect(() => {
    if (token && isLoginPage) {
      window.location.href = '/';
    }
  }, [token, isLoginPage]);

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
    <div className="fixed inset-0 flex flex-col bg-dark overflow-hidden">
      {/* 顶部导航栏 */}
      <header className="flex-shrink-0 bg-dark-lighter border-b border-gold/20 px-4 py-2 sm:py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-gold to-gold-dark rounded-lg flex items-center justify-center">
              <span className="text-xl sm:text-2xl">🦅</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gold">
              Griffin
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-gold/60 hover:text-gold transition-colors text-sm"
            title="退出登录"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/new-game" element={<ProtectedRoute><NewGamePage /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
          <Route path="/stats" element={<ProtectedRoute><StatsPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        </Routes>
      </main>

      {/* 底部导航栏 */}
      <nav className="flex-shrink-0 bg-dark-lighter border-t border-gold/20 px-2 py-1.5 sm:py-2">
        <div className="max-w-6xl mx-auto flex justify-around">
          <NavButton to="/" icon="🏠" label="首页" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <NavButton to="/new-game" icon="➕" label="记分" active={activeTab === 'new-game'} onClick={() => setActiveTab('new-game')} />
          <NavButton to="/history" icon="📋" label="历史" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
          <NavButton to="/stats" icon="📊" label="统计" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />
          <NavButton to="/settings" icon="⚙️" label="设置" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
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
      className={`flex flex-col items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors ${
        active ? 'text-gold bg-dark-light' : 'text-gray-400 hover:text-gold'
      }`}
    >
      <span className="text-xl sm:text-2xl mb-0.5 sm:mb-1">{icon}</span>
      <span className="text-[10px] sm:text-xs">{label}</span>
    </Link>
  )
}

export default App
