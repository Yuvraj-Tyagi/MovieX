import React from 'react';
import { Film, Sun, Moon, User } from 'lucide-react';

const LandingPage = ({ onNavigate, theme, isLoggedIn, onThemeToggle }) => (
  <div className={`min-h-screen ${theme === 'retro' ? 'bg-stone-950' : 'bg-stone-50'}`}>
    <div className="relative min-h-screen">
      <div className="absolute inset-0">
        <img 
          src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&h=1080&fit=crop" 
          alt="Cinema"
          className={`w-full h-full object-cover ${theme === 'retro' ? 'opacity-30' : 'opacity-20'}`}
        />
        <div className={`absolute inset-0 bg-gradient-to-b ${theme === 'retro' ? 'from-stone-950/80 via-stone-950/60 to-stone-950' : 'from-stone-50/90 via-stone-50/70 to-stone-50'}`} />
      </div>

      {/* Top Navigation for Landing Page */}
      <div className="absolute top-0 left-0 right-0 z-10">
        <div className="w-full px-6 py-6 flex items-center justify-between">
          <div className={`flex items-center gap-2 text-2xl font-serif tracking-wide ${theme === 'retro' ? 'text-stone-100' : 'text-stone-900'}`}>
            <Film size={28} className={theme === 'retro' ? 'text-amber-600' : 'text-amber-700'} />
            MovieX
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={onThemeToggle}
              className={`${theme === 'retro' ? 'text-stone-300 hover:text-amber-100' : 'text-stone-600 hover:text-amber-700'} transition-colors duration-300`}
              title={theme === 'retro' ? 'Switch to Modern theme' : 'Switch to Retro theme'}
            >
              {theme === 'retro' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            {isLoggedIn ? (
              <button 
                onClick={() => onNavigate('profile')} 
                className={`${theme === 'retro' ? 'text-stone-300 hover:text-amber-100' : 'text-stone-600 hover:text-amber-700'} transition-colors duration-300`}
              >
                <User size={20} />
              </button>
            ) : (
              <>
                <button 
                  onClick={() => onNavigate('auth')} 
                  className={`${theme === 'retro' ? 'text-stone-300 hover:text-amber-100' : 'text-stone-600 hover:text-amber-700'} transition-colors duration-300 text-sm tracking-wide`}
                >
                  Login
                </button>
                <button 
                  onClick={() => onNavigate('auth')} 
                  className={`px-4 py-2 border ${theme === 'retro' ? 'border-amber-700 text-amber-100 hover:bg-amber-900/20' : 'border-amber-700 text-amber-700 hover:bg-amber-100'} transition-all duration-300 text-sm tracking-wide`}
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="relative min-h-screen flex items-center justify-center px-6 py-32">
        <div className="w-full max-w-5xl text-center space-y-16">
          <div className="space-y-8">
            <h1 className={`font-serif text-8xl md:text-9xl lg:text-[12rem] tracking-wide ${theme === 'retro' ? 'text-stone-100' : 'text-stone-900'}`}>MovieX</h1>
            <p className={`text-2xl md:text-3xl lg:text-4xl tracking-widest font-light ${theme === 'retro' ? 'text-stone-400' : 'text-stone-600'}`}>Movie discovery, the way films used to feel.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-12">
            <button 
              onClick={() => onNavigate('catalog')}
              className={`px-12 py-5 border text-base ${theme === 'retro' ? 'border-amber-700 text-amber-100 hover:bg-amber-900/20' : 'border-amber-700 text-amber-700 hover:bg-amber-100'} transition-all duration-500 tracking-widest font-light min-w-[280px]`}
            >
              BROWSE MOVIES
            </button>
            <button 
              onClick={() => onNavigate(isLoggedIn ? 'recommendations' : 'auth')}
              className={`px-12 py-5 text-base ${theme === 'retro' ? 'bg-amber-900/20 text-amber-100 hover:bg-amber-900/30' : 'bg-amber-700/20 text-amber-700 hover:bg-amber-700/30'} transition-all duration-500 tracking-widest font-light min-w-[280px]`}
            >
              GET RECOMMENDATIONS
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default LandingPage;