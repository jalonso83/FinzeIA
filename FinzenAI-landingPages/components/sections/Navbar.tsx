'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useScrollSpy } from '@/hooks/useScrollSpy';
import { NAV_LINKS, SECTION_IDS, getAppStoreLink } from '@/lib/constants';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const activeId = useScrollSpy([...SECTION_IDS]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 backdrop-blur-md shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-16 md:h-20">
        {/* Logo */}
        <a href="#hero" className="shrink-0">
          {/* Desktop: horizontal logo */}
          <div className="hidden md:block relative w-[140px] h-[40px]">
            <Image
              src="/logo-finzen-horizontal.png"
              alt="FinZen AI"
              fill
              className="object-contain"
              priority
            />
          </div>
          {/* Mobile: icon logo */}
          <div className="block md:hidden relative w-8 h-8">
            <Image
              src="/logo-finzen-icon.png"
              alt="FinZen AI"
              fill
              className="object-contain"
              priority
            />
          </div>
        </a>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => {
            const sectionId = link.href.replace('#', '');
            return (
              <a
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors duration-200 ${
                  activeId === sectionId
                    ? 'text-finzen-green'
                    : scrolled
                    ? 'text-finzen-black hover:text-finzen-blue'
                    : 'text-white/90 hover:text-white'
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:block">
          <Button
            variant="primary"
            size="sm"
            href={getAppStoreLink('navbar')}
          >
            Descargar Gratis
          </Button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {menuOpen ? (
            <X size={24} className={scrolled ? 'text-finzen-black' : 'text-white'} />
          ) : (
            <Menu size={24} className={scrolled ? 'text-finzen-black' : 'text-white'} />
          )}
        </button>
      </div>

      {/* Mobile slide-in panel */}
      <div
        className={`md:hidden fixed inset-0 top-16 bg-white z-40 transition-transform duration-300 ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col p-6 gap-6">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-lg font-medium text-finzen-black hover:text-finzen-blue transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <Button
            variant="primary"
            size="md"
            href={getAppStoreLink('navbar')}
            onClick={() => setMenuOpen(false)}
          >
            Descargar Gratis
          </Button>
        </div>
      </div>
    </nav>
  );
}
