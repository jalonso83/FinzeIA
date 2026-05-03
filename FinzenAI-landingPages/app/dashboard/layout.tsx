'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, BarChart3, Users, MessageSquare, LogOut } from 'lucide-react';
import { DashboardProvider } from '@/hooks/useDashboardData';

const navItems = [
  { label: 'Pulso', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Detalles', href: '/dashboard/detalles', icon: BarChart3 },
  { label: 'Usuarios', href: '/dashboard/usuarios', icon: Users },
  { label: 'Feedback', href: '/dashboard/feedback', icon: MessageSquare },
];

interface AdminUser {
  name: string;
  email: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    try {
      const cookie = document.cookie
        .split('; ')
        .find((c) => c.startsWith('admin-user='));
      if (cookie) {
        const value = decodeURIComponent(cookie.split('=').slice(1).join('='));
        setUser(JSON.parse(value));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <DashboardProvider>
      <div className="min-h-screen bg-finzen-white">
        {/* Top Navbar */}
        <nav className="bg-white border-b border-finzen-gray/20 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/dashboard" className="shrink-0">
              <img
                src="/logo-horizontal.png"
                alt="FinZen AI"
                className="h-10 w-auto"
              />
            </Link>

            {/* Nav Tabs */}
            <div className="hidden sm:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-finzen-blue text-white'
                        : 'text-finzen-gray hover:text-finzen-black hover:bg-finzen-white'
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* User / Logout */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-finzen-blue flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {user ? getInitials(user.name) : '??'}
                </span>
              </div>
              <span className="hidden sm:inline text-sm text-finzen-black font-medium">
                {user?.name || ''}
              </span>
              <button
                className="flex items-center gap-1.5 text-sm text-finzen-gray hover:text-finzen-red transition-colors"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>

          {/* Mobile Nav */}
          <div className="sm:hidden flex border-t border-finzen-gray/10">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all ${
                    isActive
                      ? 'text-finzen-blue border-b-2 border-finzen-blue'
                      : 'text-finzen-gray'
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          {children}
        </main>
      </div>
    </DashboardProvider>
  );
}
