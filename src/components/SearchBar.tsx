import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Search, X } from 'lucide-react';
import { DEFAULT_MOVIES } from '../lib/constants';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const res = await fetch('/api/movies');
        if (res.ok) setMovies(await res.json());
        else setMovies(DEFAULT_MOVIES);
      } catch {
        setMovies(DEFAULT_MOVIES);
      }
    };
    fetchMovies();
  }, []);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    const filtered = movies.filter(m => 
      m.title.toLowerCase().includes(query.toLowerCase()) ||
      m.genres.some((g: string) => g.toLowerCase().includes(query.toLowerCase()))
    );
    setResults(filtered);
  }, [query, movies]);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2.5 rounded-full bg-black/40 hover:bg-black/70 text-text-main transition-colors border border-glass-border"
      >
        <Search className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md pt-24 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <Search className="w-8 h-8 text-accent" />
              <input 
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search movies, genres..."
                className="flex-1 bg-transparent text-3xl font-serif outline-none border-b border-glass-border pb-2 focus:border-accent"
              />
              <button onClick={() => setIsOpen(false)}><X className="w-8 h-8" /></button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {results.map(movie => (
                <div key={movie.id} onClick={() => { setIsOpen(false); navigate(`/movie/${movie.id}`, { state: { movie } }); }} className="cursor-pointer group">
                  <img src={movie.coverUrl} className="w-full aspect-[2/3] object-cover rounded-xl mb-2 group-hover:scale-105 transition-transform" />
                  <div className="text-sm font-semibold">{movie.title}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
