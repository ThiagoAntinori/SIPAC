import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  LayoutDashboard,
  Package,
  ArrowUpRight,
  ArrowDownLeft,
  ClipboardList,
  SlidersHorizontal,
  Users,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  Boxes,
  UserCheck,
} from 'lucide-react';

interface LayoutProps {
  children?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Pañol / Artículos', path: '/articulos', icon: Package },
    { label: 'Salidas / Egresos', path: '/salidas', icon: ArrowUpRight },
    { label: 'Compras / Ingresos', path: '/compras', icon: ArrowDownLeft },
    { label: 'Órdenes de Trabajo', path: '/ordenes', icon: ClipboardList },
    { label: 'Ajustes de Stock', path: '/ajustes', icon: SlidersHorizontal },
    { label: 'Personal', path: '/empleados', icon: Users },
  ];

  if (user?.rol === 'Admin') {
    navItems.push({ label: 'Auditoría', path: '/auditoria', icon: ShieldAlert });
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-950 border-r border-slate-800 p-4 justify-between">
        <div>
          {/* Logo Brand */}
          <div className="flex items-center space-x-3 px-2 py-4 mb-4 border-b border-slate-800/80">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/20">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white tracking-wide">SIPAC</h1>
              <p className="text-xs text-slate-400 font-medium">Gestión de Pañol</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile & Logout */}
        <div className="pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between px-2 py-2 mb-2 bg-slate-900/60 rounded-lg border border-slate-800">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-semibold text-xs shrink-0">
                {user?.nombreCompleto ? user.nombreCompleto.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">{user?.nombreCompleto || 'Usuario'}</p>
                <span className="inline-block text-[10px] uppercase font-bold text-blue-400 tracking-wider">
                  {user?.rol || 'Pañolero'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-950/30 hover:border hover:border-red-900/40 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar Mobile */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 sticky top-0 z-30">
          <div className="flex items-center space-x-2">
            <Boxes className="w-6 h-6 text-blue-500" />
            <span className="font-bold text-white tracking-wide">SIPAC</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-950 border-b border-slate-800 px-4 py-3 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-red-400 hover:bg-red-950/40 rounded-lg"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-900">
          {children}
        </main>
      </div>
    </div>
  );
};
