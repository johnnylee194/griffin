import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { useState } from 'react'
import HomePage from './pages/HomePage'
import NewGamePage from './pages/NewGamePage'
import HistoryPage from './pages/HistoryPage'
import StatsPage from './pages/StatsPage'
import SettingsPage from './pages/SettingsPage'

function App() {
  const [activeTab, setActiveTab] = useState('home')

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-dark">
        {/* 顶部导航栏 */}
        <header className="bg-dark-lighter border-b border-gold/20 px-4 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-gold to-gold-dark rounded-lg flex items-center justify-center">
                <span className="text-2xl">🦅</span>
              </div>
              <h1 className="text-2xl font-bold text-gold">Griffin</h1>
            </div>
            <p className="text-xs text-gold/60 hidden sm:block">守护你的财富，狩猎你的胜利</p>
          </div>
        </header>

        {/* 主内容区 */}
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/new-game" element={<NewGamePage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>

        {/* 底部导航栏 */}
        <nav className="bg-dark-lighter border-t border-gold/20 px-2 py-2">
          <div className="max-w-6xl mx-auto flex justify-around">
            <NavButton to="/" icon="🏠" label="首页" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
            <NavButton to="/new-game" icon="➕" label="记分" active={activeTab === 'new-game'} onClick={() => setActiveTab('new-game')} />
            <NavButton to="/history" icon="📋" label="历史" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
            <NavButton to="/stats" icon="📊" label="统计" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />
            <NavButton to="/settings" icon="⚙️" label="设置" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          </div>
        </nav>
      </div>
    </Router>
  )
}

function NavButton({ to, icon, label, active, onClick }: any) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex flex-col items-center justify-center px-4 py-2 rounded-lg transition-colors ${
        active ? 'text-gold bg-dark-light' : 'text-gray-400 hover:text-gold'
      }`}
    >
      <span className="text-2xl mb-1">{icon}</span>
      <span className="text-xs">{label}</span>
    </Link>
  )
}

export default App

