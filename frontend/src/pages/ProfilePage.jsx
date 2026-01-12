import React from 'react';
import { Clock, Star } from 'lucide-react';

// Mock Data
const mockMovies = [
  { id: 1, title: "The Godfather", year: 1972, rating: 9.2, genre: "Crime", platform: "Paramount+", poster: "https://images.unsplash.com/photo-1594908900066-3f47337549d8?w=400&h=600&fit=crop" },
  { id: 2, title: "Vertigo", year: 1958, rating: 8.3, genre: "Thriller", platform: "Netflix", poster: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop" },
  { id: 3, title: "Casablanca", year: 1942, rating: 8.5, genre: "Romance", platform: "HBO Max", poster: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&h=600&fit=crop" },
];

const mockUser = {
  username: "cinephile47",
  email: "movie.lover@example.com",
  favoriteGenres: ["Drama", "Noir", "Romance"],
  recentlyViewed: [mockMovies[0], mockMovies[2]],
};

const MovieCard = ({ movie, onClick, theme }) => (
  <div onClick={onClick} className="group cursor-pointer">
    <div className={`relative overflow-hidden ${theme === 'retro' ? 'bg-stone-900 border-stone-800 hover:border-amber-900/50 hover:shadow-amber-950/30' : 'bg-stone-100 border-stone-300 hover:border-amber-700/50 hover:shadow-amber-200/50'} border transition-all duration-500 shadow-lg hover:shadow-2xl`}>
      <div className="aspect-[2/3] overflow-hidden">
        <img 
          src={movie.poster} 
          alt={movie.title}
          className={`w-full h-full object-cover ${theme === 'retro' ? 'opacity-90' : 'opacity-95'} group-hover:opacity-100 group-hover:scale-105 transition-all duration-700`}
        />
      </div>
      <div className={`absolute inset-0 bg-gradient-to-t ${theme === 'retro' ? 'from-stone-950 via-stone-950/20' : 'from-stone-100 via-stone-100/20'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
    </div>
    
    <div className="mt-3 space-y-1">
      <h3 className={`font-serif text-lg tracking-wide ${theme === 'retro' ? 'text-stone-100 group-hover:text-amber-100' : 'text-stone-900 group-hover:text-amber-700'} transition-colors duration-300`}>{movie.title}</h3>
      <div className={`flex items-center gap-3 text-sm ${theme === 'retro' ? 'text-stone-500' : 'text-stone-600'}`}>
        <span>{movie.year}</span>
        <span>·</span>
        <div className="flex items-center gap-1">
          <Star size={12} className={theme === 'retro' ? 'text-amber-700' : 'text-amber-600'} fill="currentColor" />
          <span>{movie.rating}</span>
        </div>
      </div>
    </div>
  </div>
);

const ProfilePage = ({ theme, isLoggedIn }) => {
  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className={`min-h-screen ${theme === 'retro' ? 'bg-stone-950' : 'bg-stone-50'}`}>
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className={`mb-12 pb-8 border-b ${theme === 'retro' ? 'border-stone-800' : 'border-stone-300'}`}>
          <h1 className={`font-serif text-5xl tracking-wide mb-6 ${theme === 'retro' ? 'text-stone-100' : 'text-stone-900'}`}>Profile</h1>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className={`text-sm tracking-wide w-24 ${theme === 'retro' ? 'text-stone-500' : 'text-stone-600'}`}>Username</span>
              <span className={`tracking-wide ${theme === 'retro' ? 'text-stone-200' : 'text-stone-900'}`}>{mockUser.username}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm tracking-wide w-24 ${theme === 'retro' ? 'text-stone-500' : 'text-stone-600'}`}>Email</span>
              <span className={`tracking-wide ${theme === 'retro' ? 'text-stone-200' : 'text-stone-900'}`}>{mockUser.email}</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-12">
          <section>
            <h2 className={`font-serif text-2xl tracking-wide mb-6 flex items-center gap-2 ${theme === 'retro' ? 'text-stone-200' : 'text-stone-900'}`}>
              <Clock size={20} className={theme === 'retro' ? 'text-amber-700' : 'text-amber-600'} />
              Recently Viewed
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {mockUser.recentlyViewed.map(movie => (
                <MovieCard key={movie.id} movie={movie} onClick={() => {}} theme={theme} />
              ))}
            </div>
          </section>
          
          <section>
            <h2 className={`font-serif text-2xl tracking-wide mb-6 ${theme === 'retro' ? 'text-stone-200' : 'text-stone-900'}`}>Watchlist</h2>
            <div className={`border p-12 text-center ${theme === 'retro' ? 'border-stone-800 bg-stone-900/20' : 'border-stone-300 bg-white'}`}>
              <p className={`tracking-wide ${theme === 'retro' ? 'text-stone-500' : 'text-stone-600'}`}>Your watchlist is waiting for its first film.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;