import React from 'react';
import { Film, Sun, Moon, User } from 'lucide-react';

const Navbar = ({ currentPage, onNavigate, theme, onThemeToggle, isLoggedIn, onLogout }) => (
  <nav className={`border-b ${theme === 'retro' ? 'border-stone-800 bg-stone-950/95' : 'border-stone-200 bg-stone-50/95'} backdrop-blur-sm sticky top-0 z-50`}>
    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
      <button 
        onClick={() => onNavigate('landing')}
        className={`flex items-center gap-2 text-2xl font-serif tracking-wide ${theme === 'retro' ? 'text-stone-100 hover:text-amber-100' : 'text-stone-900 hover:text-amber-700'} transition-colors duration-300`}
      >
        <Film size={28} className={theme === 'retro' ? 'text-amber-600' : 'text-amber-700'} />
        MovieX
      </button>
      
      <div className="flex items-center gap-8">
        <button 
          onClick={onThemeToggle}
          className={`${theme === 'retro' ? 'text-stone-300 hover:text-amber-100' : 'text-stone-600 hover:text-amber-700'} transition-colors duration-300`}
          title={theme === 'retro' ? 'Switch to Modern theme' : 'Switch to Retro theme'}
        >
          {theme === 'retro' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        
        {currentPage !== 'landing' && currentPage !== 'auth' && (
          <>
            <button onClick={() => onNavigate('catalog')} className={`${theme === 'retro' ? 'text-stone-300 hover:text-amber-100' : 'text-stone-600 hover:text-amber-700'} transition-colors duration-300 text-sm tracking-wide`}>Browse</button>
            <button onClick={() => onNavigate('recommendations')} className={`${theme === 'retro' ? 'text-stone-300 hover:text-amber-100' : 'text-stone-600 hover:text-amber-700'} transition-colors duration-300 text-sm tracking-wide`}>Recommendations</button>
            {isLoggedIn ? (
              <>
                <button onClick={() => onNavigate('profile')} className={`${theme === 'retro' ? 'text-stone-300 hover:text-amber-100' : 'text-stone-600 hover:text-amber-700'} transition-colors duration-300`}>
                  <User size={20} />
                </button>
                <button onClick={onLogout} className={`${theme === 'retro' ? 'text-stone-300 hover:text-amber-100' : 'text-stone-600 hover:text-amber-700'} transition-colors duration-300 text-sm tracking-wide`}>Logout</button>
              </>
            ) : (
              <button onClick={() => onNavigate('auth')} className={`${theme === 'retro' ? 'text-stone-300 hover:text-amber-100' : 'text-stone-600 hover:text-amber-700'} transition-colors duration-300 text-sm tracking-wide`}>Login</button>
            )}
          </>
        )}
      </div>
    </div>
  </nav>
);

export default Navbar;