import React from 'react';
import { Star } from 'lucide-react';

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

export default MovieCard;