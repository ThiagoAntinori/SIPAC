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
  Wrench,
  Tags,
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
    { label: 'Categorías', path: '/categorias', icon: Tags },
  ];

  if (user?.rol === 'Admin') {
    navItems.push({ label: 'Auditoría', path: '/auditoria', icon: ShieldAlert });
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-slate-200 p-3 justify-between shrink-0 shadow-xs">
        <div>
          {/* Logo Brand */}
          <div className="flex items-center space-x-2.5 px-2 py-3 mb-3 border-b border-slate-200">
            <div className="p-1.5 bg-orange-600 rounded-lg text-white shadow-xs">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base text-slate-900 tracking-tight leading-none">SIPAC</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Gestión de Pañol</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2.5 px-2.5 py-2 rounded-md text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-orange-50 text-orange-700 border-l-2 border-orange-600 pl-[9px]'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-l-2 border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-orange-600' : 'text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile & Logout */}
        <div className="pt-3 border-t border-slate-200">
          <div className="flex items-center space-x-2.5 px-2.5 py-2 mb-1 bg-slate-50 rounded-md border border-slate-200 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-orange-100 border border-orange-300 flex items-center justify-center text-orange-700 font-bold text-xs shrink-0">
              {user?.nombreCompleto ? user.nombreCompleto.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="truncate min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate leading-tight">{user?.nombreCompleto || 'Usuario'}</p>
              <span className="text-[11px] text-slate-600 font-medium uppercase tracking-wider">
                {user?.rol || 'Pañolero'}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2 px-2.5 py-2 text-sm font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors duration-150"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar Mobile */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shadow-xs sticky top-0 z-30">
          <div className="flex items-center space-x-2">
            <div className="p-1 bg-orange-600 rounded-md text-white">
              <Wrench className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-900 tracking-tight">SIPAC</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 shadow-sm px-3 py-2 space-y-0.5 z-20">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-md text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-orange-50 text-orange-700 border-l-2 border-orange-600'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-orange-600' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <div className="pt-1 mt-1 border-t border-slate-200">
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-2.5 px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
