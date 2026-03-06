import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import './index.css'

function App() {
    return (
        <BrowserRouter>
            <div className="app-layout">
                {/* Sidebar */}
                <aside className="sidebar">
                    <div className="sidebar-logo">
                        <div className="sidebar-logo-icon">🚀</div>
                        <span className="sidebar-logo-text">DataViz</span>
                    </div>

                    <NavLink
                        to="/"
                        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                        end
                    >
                        <span className="sidebar-link-icon">📊</span>
                        <span className="sidebar-link-text">Dashboard</span>
                    </NavLink>

                    <NavLink
                        to="/upload"
                        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    >
                        <span className="sidebar-link-icon">📤</span>
                        <span className="sidebar-link-text">Upload</span>
                    </NavLink>
                </aside>

                {/* Main Content */}
                <main className="main-content">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/upload" element={<Upload />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    )
}

export default App
