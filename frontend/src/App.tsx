import { useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from './assets/vite.svg';
import heroImg from './assets/hero.png';
import './App.css';

import { Button } from '@/components/ui/button';

function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-900 text-white">
      <h1 className="text-4xl font-bold text-pink-400">Salon Project — shadcn is working! ✨</h1>

      <div className="flex gap-3">
        <Button>Book Now</Button>
        <Button variant="secondary">Learn More</Button>
        <Button variant="outline">Contact</Button>
        <Button variant="destructive">Cancel</Button>
      </div>
    </div>
  );
}

export default App;
