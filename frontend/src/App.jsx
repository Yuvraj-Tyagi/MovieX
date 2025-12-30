import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import CatalogPage from './pages/CatalogPage';
import RecommendationsPage from './pages/RecommendationsPage';
import ProfilePage from './pages/ProfilePage';
import AuthPage from './pages/AuthPage';

export default function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [theme, setTheme] = useState('retro');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  const handleNavigate = (page) => {
    if (page === 'profile' && !isLoggedIn) {
      setCurrentPage('auth');
      setIsSignUp(false);
    } else {
      setCurrentPage(page);
    }
  };
  
  const toggleTheme = () => {
    setTheme(theme === 'retro' ? 'modern' : 'retro');
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
    setCurrentPage('profile');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentPage('landing');
  };

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
  };
  
  return (
    <div className={`min-h-screen ${theme === 'retro' ? 'bg-stone-950' : 'bg-stone-50'}`}>
      {currentPage !== 'landing' && (
        <Navbar 
          currentPage={currentPage} 
          onNavigate={handleNavigate} 
          theme={theme} 
          onThemeToggle={toggleTheme} 
          isLoggedIn={isLoggedIn} 
          onLogout={handleLogout} 
        />
      )}
      
      {currentPage === 'landing' && (
        <LandingPage 
          onNavigate={handleNavigate} 
          theme={theme} 
          isLoggedIn={isLoggedIn} 
          onThemeToggle={toggleTheme} 
        />
      )}
      {currentPage === 'catalog' && <CatalogPage theme={theme} />}
      {currentPage === 'recommendations' && <RecommendationsPage theme={theme} />}
      {currentPage === 'profile' && <ProfilePage theme={theme} isLoggedIn={isLoggedIn} />}
      {currentPage === 'auth' && (
        <AuthPage 
          isSignUp={isSignUp} 
          onToggle={toggleAuthMode} 
          onLogin={handleLogin} 
          theme={theme} 
        />
      )}
      
      {currentPage !== 'landing' && <Footer theme={theme} />}
    </div>
  );
}