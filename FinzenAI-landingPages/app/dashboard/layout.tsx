'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LayoutDashboard, BarChart3, LogOut } from 'lucide-react';

const navItems = [
  { label: 'Pulso', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Detalles', href: '/dashboard/detalles', icon: BarChart3 },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-finzen-white">
      {/* Top Navbar */}
      <nav className="bg-white border-b border-finzen-gray/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="shrink-0">
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
              <span className="text-white text-xs font-bold">JL</span>
            </div>
            <button
              className="flex items-center gap-1.5 text-sm text-finzen-gray hover:text-finzen-red transition-colors"
              onClick={() => {/* TODO: logout */}}
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
  );
}
