import { Leaf, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavbarProps {
  transparent?: boolean;
  onAnalyzeClick?: () => void;
}

export default function Navbar({ transparent = false, onAnalyzeClick }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const navBg = transparent && !scrolled
    ? 'bg-transparent'
    : 'bg-white/95 backdrop-blur-sm shadow-sm';

  const textColor = transparent && !scrolled ? 'text-white' : 'text-gray-700';
  const logoColor = transparent && !scrolled ? 'text-white' : 'text-forest-700';

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'How It Works', href: '/#how-it-works' },
    { label: 'About', href: '/#about' },
    { label: 'Impact', href: '/#impact' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-forest-600 rounded-full flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className={`font-bold text-lg leading-none ${logoColor}`}>GreenLens</span>
              <p className={`text-[10px] leading-none ${transparent && !scrolled ? 'text-white/70' : 'text-gray-400'}`}>
                Satellite Insights for a Greener Planet
              </p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
              <a
                key={link.label}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-forest-600 ${textColor}
                  ${location.pathname === '/' && link.href === '/' ? 'text-forest-600' : ''}`}
              >
                {link.label}
              </a>
            ))}
            <button
              onClick={onAnalyzeClick || (() => {
                const el = document.getElementById('upload-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              })}
              className="btn-primary text-sm py-2 px-4"
            >
              Analyze Now →
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            className={`md:hidden p-2 rounded-md ${textColor}`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 py-4 px-4 shadow-lg">
          {navLinks.map(link => (
            <a
              key={link.label}
              href={link.href}
              className="block py-2 text-sm font-medium text-gray-700 hover:text-forest-600"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <button
            onClick={() => {
              setMobileOpen(false);
              const el = document.getElementById('upload-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="btn-primary w-full mt-3 text-sm py-2"
          >
            Analyze Now
          </button>
        </div>
      )}
    </nav>
  );
}
