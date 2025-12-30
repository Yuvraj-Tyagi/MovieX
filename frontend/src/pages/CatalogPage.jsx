import React, { useState } from 'react';
import { Search, Star, Film, User, Sun, Moon } from 'lucide-react';

// Mock Data
const mockMovies = [
  { id: 1, title: "The Godfather", year: 1972, rating: 9.2, genre: "Crime", platform: "Paramount+", poster: "https://images.unsplash.com/photo-1594908900066-3f47337549d8?w=400&h=600&fit=crop" },
  { id: 2, title: "Vertigo", year: 1958, rating: 8.3, genre: "Thriller", platform: "Netflix", poster: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop" },
  { id: 3, title: "Casablanca", year: 1942, rating: 8.5, genre: "Romance", platform: "HBO Max", poster: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&h=600&fit=crop" },
  { id: 4, title: "Tokyo Story", year: 1953, rating: 8.1, genre: "Drama", platform: "Criterion", poster: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop" },
  { id: 5, title: "8½", year: 1963, rating: 8.0, genre: "Drama", platform: "Amazon Prime", poster: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=600&fit=crop" },
  { id: 6, title: "The Third Man", year: 1949, rating: 8.1, genre: "Noir", platform: "Zee5", poster: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&h=600&fit=crop" },
  { id: 7, title: "Rashomon", year: 1950, rating: 8.2, genre: "Drama", platform: "SonyLiv", poster: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=400&h=600&fit=crop" },
];

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

const CatalogPage = ({ theme }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedDecade, setSelectedDecade] = useState('All Years');
  const [selectedPlatform, setSelectedPlatform] = useState('All Platforms');
  const [isGenreDropdownOpen, setIsGenreDropdownOpen] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [isPlatformDropdownOpen, setIsPlatformDropdownOpen] = useState(false);
  
  const genres = ['All', ...new Set(mockMovies.map(m => m.genre))];
  const decades = ['All Years', '1940s', '1950s', '1960s', '1970s'];
  const platforms = ['All Platforms', ...new Set(mockMovies.map(m => m.platform))];
  
  const filteredMovies = mockMovies.filter(movie => {
    const matchesSearch = movie.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGenre = selectedGenre === 'All' || movie.genre === selectedGenre;
    const matchesPlatform = selectedPlatform === 'All Platforms' || movie.platform === selectedPlatform;
    
    let matchesDecade = true;
    if (selectedDecade !== 'All Years') {
      const decadeStart = parseInt(selectedDecade);
      matchesDecade = movie.year >= decadeStart && movie.year < decadeStart + 10;
    }
    
    return matchesSearch && matchesGenre && matchesDecade && matchesPlatform;
  });
  
  return (
    <div className={`min-h-screen ${theme === 'retro' ? 'bg-stone-950' : 'bg-stone-50'}`}>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className={`font-serif text-5xl tracking-wide mb-8 ${theme === 'retro' ? 'text-stone-100' : 'text-stone-900'}`}>Film Archive</h1>
          
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme === 'retro' ? 'text-stone-600' : 'text-stone-400'}`} size={18} />
              <input
                type="text"
                placeholder="Search by title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 ${theme === 'retro' ? 'bg-stone-900/50 border-stone-800 text-stone-300 placeholder-stone-600 focus:border-amber-900/50' : 'bg-white border-stone-300 text-stone-900 placeholder-stone-400 focus:border-amber-700'} border focus:outline-none transition-colors duration-300 text-sm tracking-wide`}
              />
            </div>
            
            <div className="flex gap-3 flex-wrap">
              <div className="relative">
                <button
                  onClick={() => {
                    setIsGenreDropdownOpen(!isGenreDropdownOpen);
                    setIsYearDropdownOpen(false);
                    setIsPlatformDropdownOpen(false);
                  }}
                  className={`px-6 py-3 ${theme === 'retro' ? 'bg-stone-900/50 border-stone-800 text-stone-300' : 'bg-white border-stone-300 text-stone-700'} border transition-all duration-300 text-sm tracking-wide flex items-center gap-2 min-w-[180px] justify-between`}
                >
                  <span>{selectedGenre}</span>
                  <svg className={`w-4 h-4 transition-transform duration-300 ${isGenreDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isGenreDropdownOpen && (
                  <div className={`absolute top-full mt-2 w-full ${theme === 'retro' ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-300'} border shadow-2xl z-10`}>
                    {genres.map(genre => (
                      <button
                        key={genre}
                        onClick={() => {
                          setSelectedGenre(genre);
                          setIsGenreDropdownOpen(false);
                        }}
                        className={`w-full px-6 py-3 text-left text-sm tracking-wide transition-all duration-300 ${
                          selectedGenre === genre
                            ? theme === 'retro' ? 'bg-amber-900/30 text-amber-100' : 'bg-amber-100 text-amber-900'
                            : theme === 'retro' ? 'text-stone-300 hover:bg-stone-800/50' : 'text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="relative">
                <button
                  onClick={() => {
                    setIsYearDropdownOpen(!isYearDropdownOpen);
                    setIsGenreDropdownOpen(false);
                    setIsPlatformDropdownOpen(false);
                  }}
                  className={`px-6 py-3 ${theme === 'retro' ? 'bg-stone-900/50 border-stone-800 text-stone-300' : 'bg-white border-stone-300 text-stone-700'} border transition-all duration-300 text-sm tracking-wide flex items-center gap-2 min-w-[180px] justify-between`}
                >
                  <span>{selectedDecade}</span>
                  <svg className={`w-4 h-4 transition-transform duration-300 ${isYearDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isYearDropdownOpen && (
                  <div className={`absolute top-full mt-2 w-full ${theme === 'retro' ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-300'} border shadow-2xl z-10`}>
                    {decades.map(decade => (
                      <button
                        key={decade}
                        onClick={() => {
                          setSelectedDecade(decade);
                          setIsYearDropdownOpen(false);
                        }}
                        className={`w-full px-6 py-3 text-left text-sm tracking-wide transition-all duration-300 ${
                          selectedDecade === decade
                            ? theme === 'retro' ? 'bg-amber-900/30 text-amber-100' : 'bg-amber-100 text-amber-900'
                            : theme === 'retro' ? 'text-stone-300 hover:bg-stone-800/50' : 'text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        {decade}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="relative">
                <button
                  onClick={() => {
                    setIsPlatformDropdownOpen(!isPlatformDropdownOpen);
                    setIsGenreDropdownOpen(false);
                    setIsYearDropdownOpen(false);
                  }}
                  className={`px-6 py-3 ${theme === 'retro' ? 'bg-stone-900/50 border-stone-800 text-stone-300' : 'bg-white border-stone-300 text-stone-700'} border transition-all duration-300 text-sm tracking-wide flex items-center gap-2 min-w-[180px] justify-between`}
                >
                  <span>{selectedPlatform}</span>
                  <svg className={`w-4 h-4 transition-transform duration-300 ${isPlatformDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isPlatformDropdownOpen && (
                  <div className={`absolute top-full mt-2 w-full ${theme === 'retro' ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-300'} border shadow-2xl z-10`}>
                    {platforms.map(platform => (
                      <button
                        key={platform}
                        onClick={() => {
                          setSelectedPlatform(platform);
                          setIsPlatformDropdownOpen(false);
                        }}
                        className={`w-full px-6 py-3 text-left text-sm tracking-wide transition-all duration-300 ${
                          selectedPlatform === platform
                            ? theme === 'retro' ? 'bg-amber-900/30 text-amber-100' : 'bg-amber-100 text-amber-900'
                            : theme === 'retro' ? 'text-stone-300 hover:bg-stone-800/50' : 'text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        {platform}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {filteredMovies.map(movie => (
            <MovieCard key={movie.id} movie={movie} onClick={() => {}} theme={theme} />
          ))}
        </div>
        
        {filteredMovies.length === 0 && (
          <div className="text-center py-20">
            <p className={`text-lg tracking-wide ${theme === 'retro' ? 'text-stone-500' : 'text-stone-600'}`}>No films found in the archive.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CatalogPage;