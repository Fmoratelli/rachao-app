import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Player from './pages/Player.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import Admin from './pages/Admin.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/eu" element={<Player />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
