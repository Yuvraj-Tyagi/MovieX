import React from 'react';

const Footer = ({ theme }) => (
  <footer className={`border-t ${theme === 'retro' ? 'border-stone-800 bg-stone-950' : 'border-stone-200 bg-stone-50'} mt-20`}>
    <div className={`max-w-7xl mx-auto px-6 py-8 text-center ${theme === 'retro' ? 'text-stone-500' : 'text-stone-600'} text-sm tracking-wide`}>
      <p>MovieX — Where cinema lives on</p>
    </div>
  </footer>
);

export default Footer;