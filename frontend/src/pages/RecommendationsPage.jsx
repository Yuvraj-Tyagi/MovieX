import React from 'react';
import { Film } from 'lucide-react';

const RecommendationsPage = ({ theme }) => (
  <div className={`min-h-screen ${theme === 'retro' ? 'bg-stone-950' : 'bg-stone-50'}`}>
    <div className="max-w-4xl mx-auto px-6 py-20 text-center">
      <div className="space-y-6">
        <div className={`inline-block p-6 border ${theme === 'retro' ? 'border-stone-800 bg-stone-900/30' : 'border-stone-300 bg-white'}`}>
          <Film size={48} className={theme === 'retro' ? 'text-amber-700' : 'text-amber-600'} />
        </div>
        <h1 className={`font-serif text-5xl tracking-wide ${theme === 'retro' ? 'text-stone-100' : 'text-stone-900'}`}>Coming Soon</h1>
        <p className={`text-xl tracking-wide font-light max-w-md mx-auto ${theme === 'retro' ? 'text-stone-400' : 'text-stone-600'}`}>
          The projector is warming up. Our recommendation engine is being carefully calibrated.
        </p>
      </div>
    </div>
  </div>
);

export default RecommendationsPage;