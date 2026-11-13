import React, { useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Moon, Sun, User as UserIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface NavItem {
  name: string;
  path: string;
  id?: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'الرئيسية', path: '/', id: 'tour-home-link' },
  { name: 'الخريطة', path: '/map', id: 'tour-map-link' },
  { name: 'اليوم', path: '/today', id: 'tour-today-link' },
  { name: 'اسأل أنواء', path: '/chat', id: 'tour-chat-link' },
  { name: 'مكتبة النجوم', path: '/library', id: 'tour-library-link' },
  { name: 'المفضلة', path: '/favorites' },
];

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const {
    user,
    logout,
    startTour,
    bgAnimated,
    toggleBgAnimated,
    theme,
    toggleTheme,
    openUpgradeModal,
  } = useApp();

  // Do not show navbar on /login if user is signed out
  if (!user && location.pathname === '/login') {
    return null;
  }

  const toggleMenu = () => setIsOpen((prev) => !prev);
  const closeMenu = () => setIsOpen(false);

  const handleLogout = async () => {
    closeMenu();
    await logout();
    navigate('/login', { replace: true });
  };

  const handleStartTour = () => {
    closeMenu();
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => startTour(), 120);
    } else {
      startTour();
    }
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || '';

  return (
    <header
      className="sticky top-0 z-40 w-full bg-[var(--nav-bg)] border-b border-[var(--line)] select-none"
      style={{ padding: '12px 16px' }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Start side: "أنواء" in Amiri 28px gold + desktop links */}
        <div className="flex items-center gap-6">
          <Link
            to="/"
            onClick={closeMenu}
            className="font-amiri text-[28px] font-bold text-[var(--gold)] leading-none hover:opacity-90 transition-opacity shrink-0"
          >
            أنواء
          </Link>

          {/* Desktop Links (> 700px) */}
          {user && (
            <nav className="hidden min-[701px]:flex items-center gap-6">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.path === '/'
                    ? location.pathname === '/'
                    : item.path === '/library'
                    ? location.pathname.startsWith('/library') || location.pathname.startsWith('/suggestions')
                    : location.pathname.startsWith(item.path);

                return (
                  <NavLink
                    key={item.path}
                    id={item.id}
                    to={item.path}
                    className={`py-1 text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'text-[var(--gold)] border-b-2 border-[var(--gold)] font-semibold'
                        : 'text-[var(--ink)] hover:text-[var(--gold)] border-b-2 border-transparent'
                    }`}
                  >
                    {item.name}
                  </NavLink>
                );
              })}
            </nav>
          )}
        </div>

        {/* End side (> 700px): "الخلفية المتحركة", Theme Switch (before "جولة"), "جولة", displayName, "تسجيل الخروج" */}
        {user && (
          <div className="hidden min-[701px]:flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              role="switch"
              aria-checked={bgAnimated}
              onClick={toggleBgAnimated}
              className={`h-8 px-2.5 rounded-[8px] border text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                bgAnimated
                  ? 'bg-[var(--panel2)] border-[var(--gold)] text-[var(--ink)]'
                  : 'bg-[var(--panel)] border-[var(--line)] text-[var(--muted)]'
              }`}
              title="تفعيل أو إيقاف الخلفية المتحركة"
            >
              <span>الخلفية المتحركة</span>
              <span
                className={`w-7 h-4 rounded-full p-0.5 flex items-center transition-colors ${
                  bgAnimated
                    ? 'bg-[var(--gold-fill)] justify-start'
                    : 'bg-[var(--line)] justify-end'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-[var(--panel)] block" />
              </span>
            </button>

            {/* Theme Toggle Switch (before "جولة") */}
            <button
              type="button"
              role="switch"
              aria-checked={theme === 'light'}
              aria-label="تبديل الوضع الليلي والنهاري"
              title="تبديل الوضع الليلي والنهاري"
              onClick={toggleTheme}
              className="h-8 px-2.5 rounded-[8px] bg-[var(--panel2)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--gold)] hover:text-[var(--gold)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <Moon className="w-4 h-4 text-[var(--gold)]" />
              ) : (
                <Sun className="w-4 h-4 text-[var(--gold)]" />
              )}
            </button>

            <button
              type="button"
              onClick={handleStartTour}
              className="h-8 px-3 rounded-[8px] bg-[var(--panel2)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--gold)] hover:text-[var(--gold)] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              جولة
            </button>

            {user.isAnonymous ? (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-[8px] bg-[var(--panel2)] border border-[var(--gold)]/40 text-xs shrink-0">
                <span className="text-[var(--muted)]">أنت تتصفح كضيف</span>
                <button
                  type="button"
                  onClick={openUpgradeModal}
                  className="px-2.5 py-0.5 rounded-[6px] bg-[var(--gold-fill)] text-[#1a1405] font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer shadow-xs whitespace-nowrap"
                >
                  إنشاء حساب
                </button>
              </div>
            ) : (
              <Link
                to="/account"
                className={`h-8 px-2.5 rounded-[8px] border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  location.pathname === '/account'
                    ? 'bg-[var(--panel2)] border-[var(--gold)] text-[var(--gold)] font-semibold'
                    : 'bg-[var(--panel2)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--gold)] hover:text-[var(--gold)]'
                }`}
                title="إدارة الحساب"
              >
                <UserIcon className="w-3.5 h-3.5 text-[var(--gold)]" />
                <span className="max-w-[120px] truncate">{displayName}</span>
              </Link>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="h-8 px-3 rounded-[8px] bg-transparent border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--panel2)] hover:border-[var(--ember)] hover:text-[var(--ember)] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              تسجيل الخروج
            </button>
          </div>
        )}

        {/* Mobile Hamburger Button (<= 700px) */}
        {user && (
          <button
            type="button"
            onClick={toggleMenu}
            aria-label={isOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            className="min-[701px]:hidden w-9 h-9 flex items-center justify-center rounded-[8px] bg-[var(--panel2)] border border-[var(--line)] text-[var(--ink)] hover:text-[var(--gold)] transition-colors cursor-pointer"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* Mobile Dropdown Panel (<= 700px, full width; logout at bottom separated by 1px var(--line) line) */}
      {user && isOpen && (
        <div className="min-[701px]:hidden w-full bg-[var(--panel)] border border-[var(--line)] mt-3 rounded-[10px] p-3.5 shadow-xl flex flex-col gap-2">
          <div className="flex items-center justify-between px-2 pb-2 border-b border-[var(--line)]">
            <span className="text-xs text-[var(--muted)] truncate">
              {user.isAnonymous ? 'أنت تتصفح كضيف' : displayName}
            </span>
            <button
              type="button"
              onClick={handleStartTour}
              className="h-7 px-3 rounded-[8px] bg-[var(--panel2)] border border-[var(--line)] text-[var(--gold)] text-xs font-medium cursor-pointer"
            >
              جولة
            </button>
          </div>

          {user.isAnonymous && (
            <div className="flex items-center justify-between px-3 py-2 bg-[var(--panel2)] rounded-[8px] border border-[var(--gold)]/40">
              <span className="text-xs text-[var(--muted)]">أنت تتصفح كضيف</span>
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  openUpgradeModal();
                }}
                className="px-2.5 py-1 rounded-[6px] bg-[var(--gold-fill)] text-[#1a1405] font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer"
              >
                إنشاء حساب
              </button>
            </div>
          )}

          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.path === '/'
                  ? location.pathname === '/'
                  : item.path === '/library'
                  ? location.pathname.startsWith('/library') || location.pathname.startsWith('/suggestions')
                  : location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={closeMenu}
                  className={`px-3 py-2 rounded-[8px] text-sm font-medium transition-colors flex items-center justify-between ${
                    isActive
                      ? 'bg-[var(--panel2)] text-[var(--gold)] border-b-2 border-[var(--gold)] font-semibold'
                      : 'text-[var(--ink)] hover:bg-[var(--panel2)] hover:text-[var(--gold)]'
                  }`}
                >
                  <span>{item.name}</span>
                </NavLink>
              );
            })}

            {!user.isAnonymous && (
              <NavLink
                to="/account"
                onClick={closeMenu}
                className={`px-3 py-2 rounded-[8px] text-sm font-medium transition-colors flex items-center justify-between ${
                  location.pathname === '/account'
                    ? 'bg-[var(--panel2)] text-[var(--gold)] border-b-2 border-[var(--gold)] font-semibold'
                    : 'text-[var(--ink)] hover:bg-[var(--panel2)] hover:text-[var(--gold)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-[var(--gold)]" />
                  <span>الحساب</span>
                </div>
              </NavLink>
            )}
          </div>

          {/* Theme Switch in Mobile Menu: "الوضع الليلي / النهاري" */}
          <div className="pt-2 border-t border-[var(--line)] flex items-center justify-between px-2 py-1">
            <span className="text-xs font-medium text-[var(--ink)]">الوضع الليلي / النهاري</span>
            <button
              type="button"
              role="switch"
              aria-checked={theme === 'light'}
              aria-label="تبديل الوضع الليلي والنهاري"
              onClick={toggleTheme}
              className="h-8 px-3 rounded-[8px] bg-[var(--panel2)] border border-[var(--line)] text-[var(--ink)] flex items-center gap-2 text-xs font-medium cursor-pointer"
            >
              {theme === 'dark' ? (
                <>
                  <Moon className="w-4 h-4 text-[var(--gold)]" />
                  <span>ليلي</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-[var(--gold)]" />
                  <span>نهاري</span>
                </>
              )}
            </button>
          </div>

          {/* Animated Background Switch in Mobile Menu */}
          <div className="pt-2 border-t border-[var(--line)] flex items-center justify-between px-2 py-1">
            <span className="text-xs font-medium text-[var(--ink)]">الخلفية المتحركة</span>
            <button
              type="button"
              role="switch"
              aria-checked={bgAnimated}
              onClick={toggleBgAnimated}
              className={`w-9 h-5 rounded-full p-0.5 flex items-center transition-colors cursor-pointer ${
                bgAnimated ? 'bg-[var(--gold-fill)] justify-start' : 'bg-[var(--line)] justify-end'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-[var(--panel)] block" />
            </button>
          </div>

          <div className="pt-2 mt-1 border-t border-[var(--line)]">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full h-9 rounded-[8px] bg-transparent border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--panel2)] hover:text-[var(--ember)] text-xs font-medium transition-colors cursor-pointer"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
