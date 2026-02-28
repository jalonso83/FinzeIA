'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff, Lock, Mail, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // TODO: Connect to backend auth
    // Simular delay
    await new Promise((r) => setTimeout(r, 1000));

    // Mock: siempre falla por ahora
    setError('Funcionalidad de login próximamente.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-finzen-white flex flex-col">
      {/* Mini Navbar */}
      <nav className="bg-white border-b border-finzen-gray/20">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-16">
          <Link href="/" className="shrink-0">
            <div className="relative w-[180px] h-[45px]">
              <Image
                src="/logo-finzen-horizontal.png"
                alt="FinZen AI"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-finzen-gray hover:text-finzen-black transition-colors"
          >
            <ArrowLeft size={16} />
            Volver al inicio
          </Link>
        </div>
      </nav>

      {/* Login Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg border border-finzen-gray/10 p-8">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="relative w-16 h-16">
                <Image
                  src="/logo-finzen-icon.png"
                  alt="FinZen AI"
                  fill
                  className="object-contain"
                />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-xl font-bold text-finzen-black text-center mb-1">
              Panel de Administración
            </h1>
            <p className="text-sm text-finzen-gray text-center mb-8">
              Acceso exclusivo para el equipo fundador
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-finzen-black mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-finzen-gray" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-finzen-gray/30 bg-finzen-white text-finzen-black text-sm placeholder:text-finzen-gray/60 focus:outline-none focus:ring-2 focus:ring-finzen-blue/20 focus:border-finzen-blue transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-finzen-black mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-finzen-gray" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-finzen-gray/30 bg-finzen-white text-finzen-black text-sm placeholder:text-finzen-gray/60 focus:outline-none focus:ring-2 focus:ring-finzen-blue/20 focus:border-finzen-blue transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-finzen-gray hover:text-finzen-black transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-finzen-red/5 border border-finzen-red/20 rounded-lg px-4 py-3">
                  <p className="text-sm text-finzen-red">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-finzen-green text-white font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </button>
            </form>
          </div>

          {/* Footer text */}
          <p className="text-xs text-finzen-gray text-center mt-6">
            Solo los administradores autorizados pueden acceder a este panel.
          </p>
        </div>
      </div>
    </div>
  );
}
