/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import Home from './pages/Home';
import Admin from './pages/Admin';
import Login from './pages/Login';
import MinhaConta from './pages/MinhaConta';
import Navbar from './components/Navbar';

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <div className="min-h-screen flex flex-col bg-black text-white font-sans">
            <Navbar />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/login" element={<Login />} />
                <Route path="/minha-conta" element={<MinhaConta />} />
              </Routes>
            </main>
            <footer className="bg-black border-t border-white/10 py-8 mt-auto">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-400 text-sm">
                <p>&copy; {new Date().getFullYear()} Arena ABBA PAI. Todos os direitos reservados.</p>
              </div>
            </footer>
          </div>
        </Router>
      </DataProvider>
    </AuthProvider>
  );
}
