import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { LogOut, Settings, Calendar } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { settings } = useData();

  return (
    <nav className="bg-black border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-3">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="Arena ABBA PAI" className="h-10 object-contain" />
              ) : (
                <span className="text-xl font-bold text-white tracking-tight">
                  ARENA <span className="text-[#E10600]">ABBA PAI</span>
                </span>
              )}
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
              <Calendar size={18} />
              <span className="hidden sm:inline">Agendar</span>
            </Link>
            {user ? (
              <>
                <Link to="/admin" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                  <Settings size={18} />
                  <span className="hidden sm:inline">Painel Admin</span>
                </Link>
                <button
                  onClick={logout}
                  className="text-gray-300 hover:text-[#E10600] transition-colors flex items-center gap-2"
                >
                  <LogOut size={18} />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </>
            ) : (
              <Link to="/login" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                Área Restrita
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
