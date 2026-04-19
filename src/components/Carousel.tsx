import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Play } from 'lucide-react';
import { useNavigate } from 'react-router';

export default function Carousel({ movies }: { movies: any[] }) {
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (movies.length === 0) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % movies.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [movies]);

  if (movies.length === 0) return null;

  const movie = movies[index];

  return (
    <div className="relative h-[600px] w-screen left-[-2rem] overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={movie.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0"
        >
          <img 
            src={movie.backdropUrl || movie.coverUrl} 
            alt={movie.title} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          <div className="absolute bottom-24 left-12 md:left-24 max-w-2xl">
            <h2 className="text-5xl md:text-7xl font-serif text-white mb-4 leading-tight">{movie.title}</h2>
            <p className="text-text-dim text-lg mb-6 line-clamp-3">{movie.description}</p>
            <button 
              onClick={() => navigate(`/movie/${movie.id}`)}
              className="px-8 py-4 rounded-full bg-white text-black font-bold text-lg hover:bg-gray-200 transition-all"
            >
              Play Now
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
