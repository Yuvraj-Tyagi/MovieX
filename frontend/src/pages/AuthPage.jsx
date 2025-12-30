import React from 'react';

const AuthPage = ({ isSignUp, onToggle, onLogin, theme }) => (
  <div className={`min-h-screen ${theme === 'retro' ? 'bg-stone-950' : 'bg-stone-50'} flex items-center justify-center px-6`}>
    <div className="max-w-md w-full space-y-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className={`font-serif text-4xl tracking-wide mb-2 ${theme === 'retro' ? 'text-stone-100' : 'text-stone-900'}`}>
            {isSignUp ? 'Join MovieX' : 'Welcome Back'}
          </h1>
          <p className={`tracking-wide text-sm ${theme === 'retro' ? 'text-stone-500' : 'text-stone-600'}`}>
            {isSignUp ? 'Begin your cinematic journey' : 'Continue your exploration'}
          </p>
        </div>
        
        <div className={`border p-8 space-y-6 ${theme === 'retro' ? 'border-stone-800 bg-stone-900/20' : 'border-stone-300 bg-white'}`}>
          {isSignUp && (
            <div>
              <label className={`block text-sm tracking-wide mb-2 ${theme === 'retro' ? 'text-stone-400' : 'text-stone-600'}`}>Username</label>
              <input
                type="text"
                className={`w-full px-4 py-3 ${theme === 'retro' ? 'bg-stone-900/50 border-stone-800 text-stone-300 placeholder-stone-600 focus:border-amber-900/50' : 'bg-white border-stone-300 text-stone-900 placeholder-stone-400 focus:border-amber-700'} border focus:outline-none transition-colors duration-300 text-sm tracking-wide`}
                placeholder="Choose a username"
              />
            </div>
          )}
          
          <div>
            <label className={`block text-sm tracking-wide mb-2 ${theme === 'retro' ? 'text-stone-400' : 'text-stone-600'}`}>Email</label>
            <input
              type="email"
              className={`w-full px-4 py-3 ${theme === 'retro' ? 'bg-stone-900/50 border-stone-800 text-stone-300 placeholder-stone-600 focus:border-amber-900/50' : 'bg-white border-stone-300 text-stone-900 placeholder-stone-400 focus:border-amber-700'} border focus:outline-none transition-colors duration-300 text-sm tracking-wide`}
              placeholder="your@email.com"
            />
          </div>
          
          <div>
            <label className={`block text-sm tracking-wide mb-2 ${theme === 'retro' ? 'text-stone-400' : 'text-stone-600'}`}>Password</label>
            <input
              type="password"
              className={`w-full px-4 py-3 ${theme === 'retro' ? 'bg-stone-900/50 border-stone-800 text-stone-300 placeholder-stone-600 focus:border-amber-900/50' : 'bg-white border-stone-300 text-stone-900 placeholder-stone-400 focus:border-amber-700'} border focus:outline-none transition-colors duration-300 text-sm tracking-wide`}
              placeholder="••••••••"
            />
          </div>
          
          <button 
            onClick={onLogin}
            className={`w-full py-3 text-sm tracking-widest border transition-all duration-300 ${theme === 'retro' ? 'bg-amber-900/30 text-amber-100 hover:bg-amber-900/40 border-amber-800' : 'bg-amber-700 text-white hover:bg-amber-800 border-amber-700'}`}
          >
            {isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'}
          </button>
        </div>
        
        <div className="text-center">
          <button 
            onClick={onToggle}
            className={`text-sm tracking-wide transition-colors duration-300 ${theme === 'retro' ? 'text-stone-500 hover:text-amber-100' : 'text-stone-600 hover:text-amber-700'}`}
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default AuthPage;