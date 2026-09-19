import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Entrar from './pages/Entrar.jsx';
import Player from './pages/Player.jsx';
import Posicoes from './pages/Posicoes.jsx';
import Sortear from './pages/Sortear.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import Admin from './pages/Admin.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/entrar" element={<Entrar />} />
      <Route path="/eu" element={<Player />} />
      <Route path="/eu/posicoes" element={<Posicoes />} />
      <Route path="/sortear" element={<Sortear />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
