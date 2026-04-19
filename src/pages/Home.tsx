import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Play } from 'lucide-react';
import { DEFAULT_MOVIES } from '../lib/constants';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Carousel from '../components/Carousel';

export default function Home() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [movies, setMovies] = useState<any[]>([]);
  const [loadingMovies, setLoadingMovies] = useState(true);

  useEffect(() => {
    // Fetch movies
    const fetchMovies = async () => {
      try {
        const response = await fetch('/api/movies');
        if (response.ok) {
          const apiMovies = await response.json();
          setMovies(apiMovies); 
        } else {
          console.warn("Failed to fetch movies from API, falling back to defaults.");
          setMovies(DEFAULT_MOVIES);
        }
      } catch (e) {
        console.warn("Network error fetching API movies, falling back to defaults.", e);
        setMovies(DEFAULT_MOVIES);
      } finally {
        setLoadingMovies(false);
      }
    };
    fetchMovies();
  }, []);

  const handleCreateWatchParty = async (movie: any) => {
    if (!user) {
      await signIn();
      return;
    }
    
    try {
      const roomRef = await addDoc(collection(db, 'rooms'), {
        movieId: movie.id,
        movieData: {
          title: movie.title,
          coverUrl: movie.coverUrl,
          releaseYear: movie.releaseYear,
          videoUrl: movie.videoUrl
        },
        hostId: user.uid,
        status: 'active',
        currentPlaybackTime: 0,
        isPlaying: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      await addDoc(collection(db, 'rooms', roomRef.id, 'members'), {
        userId: user.uid,
        joinedAt: serverTimestamp()
      });

      navigate(`/room/${roomRef.id}`);
    } catch (error) {
      console.error("Error creating watch party: ", error);
    }
  };

  const categories = [
    { title: "Featured Films", movies: movies.slice(0, 4) },
    { title: "Trending Now", movies: [...movies].reverse().slice(0, 4) },
    { title: "New Releases", movies: movies.filter(m => m.releaseYear >= 2024).slice(0, 4) }
  ];

  return (
    <div className="min-h-screen bg-bg text-text-main pb-12">
      <div className="max-w-screen overflow-x-hidden">
        <Carousel movies={movies} />
        
        <div className="max-w-7xl mx-auto px-8 mt-16 flex flex-col gap-12">
          {categories.map((category) => (
            <div key={category.title}>
              <div className="flex justify-between items-center mb-5">
                <div className="text-[18px] font-semibold text-text-main">{category.title}</div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {category.movies.map((movie, i) => (
                  <motion.div
                    key={movie.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="h-[220px] rounded-xl bg-glass border border-glass-border relative overflow-hidden group cursor-pointer"
                  >
                    <img 
                      src={movie.coverUrl} 
                      alt={movie.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                      referrerPolicy="no-referrer"
                    />
                    
                    <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                      <button onClick={() => navigate(`/movie/${movie.id}`, { state: { movie } })} className="p-3 bg-glass border border-glass-border rounded-full mr-2 hover:bg-accent hover:border-accent">Details</button>
                      <button onClick={() => handleCreateWatchParty(movie)} className="p-3 bg-accent rounded-full hover:scale-110"><Play /></button>
                    </div>

                    <div className="absolute bottom-0 left-0 w-full p-4 bg-glass rounded-b-xl z-0">
                      <div className="text-[15px] font-semibold text-text-main mb-0.5">{movie.title}</div>
                      <div className="text-[11px] text-text-dim">{movie.releaseYear}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
