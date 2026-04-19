import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { Users, ArrowLeft, Loader2, Play, Film, Pause, Volume2, VolumeX, Maximize, Plus, Star, MessageSquare } from 'lucide-react';
import { DEFAULT_MOVIES } from '../lib/constants';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, getDoc, serverTimestamp, onSnapshot, addDoc } from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export default function MovieDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn } = useAuth();
  
  const [movie, setMovie] = useState<any>(location.state?.movie || null);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [plotSummary, setPlotSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviews, setReviews] = useState<any[]>([]);
  const [newReview, setNewReview] = useState('');

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);

  const sendIframeCommand = (func: string, args: any[] = []) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        '*'
      );
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      sendIframeCommand('pauseVideo');
    } else {
      sendIframeCommand('playVideo');
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setVolume(val);
    sendIframeCommand('setVolume', [val]);
    if (val === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
      sendIframeCommand('unMute');
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      sendIframeCommand('unMute');
      if (volume === 0) {
         setVolume(100);
         sendIframeCommand('setVolume', [100]);
      }
    } else {
      sendIframeCommand('mute');
    }
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.log(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    if (!id || !user) return;
    const checkWatchlist = async () => {
      const docRef = doc(db, 'users', user.uid, 'watchlist', id);
      const snap = await getDoc(docRef);
      setIsInWatchlist(snap.exists());
    };
    const fetchRating = async () => {
      const docRef = doc(db, 'users', user.uid, 'ratings', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setRating(snap.data().rating);
      }
    };
    const fetchReviews = async () => {
      const q = collection(db, 'movies', id, 'reviews');
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return unsubscribe;
    };
    checkWatchlist();
    fetchRating();
    fetchReviews();
  }, [id, user]);

  useEffect(() => {
    if (!movie) return;
    const fetchSummary = async () => {
        setLoadingSummary(true);
        try {
            const response = await ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: `Summarize the plot of this movie concisely in 2-3 sentences: "${movie.title}" - ${movie.description}`,
            });
            setPlotSummary(response.text || "");
        } catch (e) {
            console.error("AI summary failed", e);
        } finally {
            setLoadingSummary(false);
        }
    };
    fetchSummary();
  }, [movie]);

  useEffect(() => {
    if (!id) return; 

    const fetchMovie = async () => {
      try {
        const response = await fetch(`/api/movies/${id}`);
        if (response.ok) {
          const data = await response.json();
          setMovie(data);
          
          // Fetch all movies for recommendations
          const allMoviesRes = await fetch('/api/movies');
          if (allMoviesRes.ok) {
            const allMovies = await allMoviesRes.json();
            // Simple recommendation: filter by genre
            const recs = allMovies
              .filter((m: any) => m.id !== data.id && m.genres.some((g: string) => data.genres.includes(g)))
              .slice(0, 4);
            setRecommendations(recs);
          }
        } else if (!movie) {
          // Fallback to defaults if API fails and we don't have existing generic state
          const defaultMovie = DEFAULT_MOVIES.find(m => m.id === id);
          if (defaultMovie) setMovie(defaultMovie);
        }
      } catch (e) {
        console.warn("Failed to fetch movie details from API.");
        if (!movie) {
           const defaultMovie = DEFAULT_MOVIES.find(m => m.id === id);
           if (defaultMovie) setMovie(defaultMovie);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchMovie();
  }, [id]);

  const handleAddToWatchlist = async () => {
    if (!user) {
      await signIn();
      return;
    }
    setIsAdding(true);
    try {
      const docRef = doc(db, 'users', user.uid, 'watchlist', movie.id);
      await setDoc(docRef, {
        movieId: movie.id,
        title: movie.title,
        coverUrl: movie.coverUrl,
        addedAt: serverTimestamp()
      });
      setIsInWatchlist(true);
    } catch (error) {
      console.error("Error adding to watchlist: ", error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRateMovie = async (newRating: number) => {
    if (!user) {
      await signIn();
      return;
    }
    setRating(newRating);
    try {
      const docRef = doc(db, 'users', user.uid, 'ratings', movie.id);
      await setDoc(docRef, {
        movieId: movie.id,
        rating: newRating,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error saving rating: ", error);
    }
  };

  const handleAddReview = async () => {
    if (!user || !newReview.trim()) return;
    try {
      await addDoc(collection(db, 'movies', movie.id, 'reviews'), {
        userId: user.uid,
        username: user.displayName || 'Anonymous',
        text: newReview,
        createdAt: serverTimestamp()
      });
      setNewReview('');
    } catch (error) {
      console.error("Error adding review: ", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center text-text-dim font-sans">
         <Loader2 className="w-8 h-8 animate-spin mb-4 text-accent" />
         Loading Movie Details...
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center text-text-dim font-sans gap-4">
        <div>Movie not found.</div>
        <button onClick={() => navigate('/')} className="text-accent hover:underline">Return Home</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text-main pt-24 pb-12 px-8 relative overflow-hidden">
      {/* Background Atmosphere */}
      <div className="absolute top-0 left-0 w-full h-[70vh] opacity-20 pointer-events-none" style={{
         backgroundImage: `url(${movie.backdropUrl || movie.coverUrl})`,
         backgroundSize: 'cover',
         backgroundPosition: 'center top',
         maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
         WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)'
      }} />

      <div className="max-w-6xl mx-auto relative z-10">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-dim hover:text-white mb-8 transition-colors uppercase font-bold text-sm tracking-wide">
           <ArrowLeft className="w-4 h-4" /> Back to library
        </button>

        <div className="flex flex-col md:flex-row gap-12 mt-10">
          {/* Poster */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full md:w-[350px] shrink-0"
          >
            <div className="rounded-2xl overflow-hidden border border-glass-border shadow-[0_0_40px_rgba(229,9,20,0.1)] group">
              <img src={movie.coverUrl} className="w-full h-auto object-cover aspect-[2/3] group-hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" alt={movie.title} />
            </div>
          </motion.div>

          {/* Details */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 flex flex-col justify-center"
          >
            <div className="flex flex-wrap items-center gap-3 mb-6">
               <span className="bg-glass border border-glass-border px-3 py-1 text-xs font-bold uppercase rounded-[6px] text-text-main shadow-sm backdrop-blur-md">
                  {movie.releaseYear}
               </span>
               {movie.runtime && (
                 <span className="bg-glass border border-glass-border px-3 py-1 text-xs font-bold uppercase rounded-[6px] text-text-main shadow-sm backdrop-blur-md">
                    {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                 </span>
               )}
               {movie.rating && (
                 <span className="bg-glass border-glass-border border px-3 py-1 text-xs font-bold uppercase rounded-[6px] text-[#4CAF50] shadow-sm backdrop-blur-md">
                    ★ {movie.rating}
                 </span>
               )}
               <span className="bg-accent px-3 py-1 text-xs font-bold uppercase rounded-[6px] text-text-main shadow-sm shadow-[0_0_10px_var(--color-accent)]">
                  Live Enabled
               </span>
            </div>
            
            <h1 className="text-5xl md:text-[80px] font-black tracking-[-3px] mb-8 uppercase leading-[0.9] font-serif">
              {movie.title}
            </h1>

            {movie.genres && movie.genres.length > 0 && (
              <div className="text-sm text-text-main font-semibold uppercase tracking-widest mb-4">
                {movie.genres.join(' • ')}
              </div>
            )}
            
            <p className="text-lg text-text-dim leading-[1.8] mb-8 max-w-2xl font-sans font-medium">
              {movie.description || "In a future where humanity's survival is on the line, a team of pioneers must travel beyond the stars to find a new home. Experience the cinematic journey of a lifetime with immersive real-time syncing."}
            </p>

            <h3 className="text-xs uppercase text-text-dim font-bold tracking-widest mb-2">Plot Summary</h3>
            <div className="text-md text-text-main leading-relaxed mb-8 max-w-2xl font-sans">
                {loadingSummary ? <Loader2 className="w-4 h-4 animate-spin text-accent" /> : plotSummary}
            </div>

            {movie.cast && movie.cast.length > 0 && (
              <div className="mb-12">
                 <h3 className="text-xs uppercase text-text-dim font-bold tracking-widest mb-2">Starring</h3>
                 <p className="text-text-main font-medium">{movie.cast.join(', ')}</p>
              </div>
            )}
            
            {movie.crew && movie.crew.length > 0 && (
              <div className="mb-12">
                 <h3 className="text-xs uppercase text-text-dim font-bold tracking-widest mb-2">Crew</h3>
                 <div className="grid grid-cols-2 gap-4">
                   {movie.crew.map((person: {name: string, role: string}, i: number) => (
                     <div key={i}>
                       <div className="text-text-main font-medium">{person.name}</div>
                       <div className="text-xs text-text-dim uppercase tracking-wider">{person.role}</div>
                     </div>
                   ))}
                 </div>
              </div>
            )}

            <div className="flex flex-wrap gap-4 mt-auto md:mt-0 pt-8 md:pt-0">
              <button 
                onClick={handleAddToWatchlist}
                disabled={isAdding || isInWatchlist}
                className="flex items-center gap-3 px-8 py-5 rounded-full bg-black/40 text-white font-bold text-[15px] tracking-wide border border-glass-border hover:bg-black/60 disabled:opacity-50 transition-all"
              >
                <Plus className="w-5 h-5" />
                {isInWatchlist ? 'In Watchlist' : isAdding ? 'Adding...' : 'Add to Watchlist'}
              </button>

              <div className="flex items-center gap-1 bg-black/40 rounded-full px-4 py-2 border border-glass-border">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-6 h-6 cursor-pointer transition-colors ${
                      star <= (hoverRating || rating) ? 'text-accent fill-accent' : 'text-text-dim'
                    }`}
                    onClick={() => handleRateMovie(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                  />
                ))}
              </div>
            </div>

            {/* Reviews Section */}
            <div className="mt-12 bg-black/30 p-6 rounded-2xl border border-glass-border">
              <h3 className="text-xl font-serif mb-6 flex items-center gap-2">
                <MessageSquare className="text-accent" /> Community Reviews
              </h3>
              <div className="flex gap-2 mb-4">
                <input 
                  value={newReview}
                  onChange={(e) => setNewReview(e.target.value)}
                  placeholder="Write a review..."
                  className="flex-1 bg-glass border border-glass-border p-3 rounded-xl outline-none focus:border-accent"
                />
                <button onClick={handleAddReview} className="bg-accent px-6 py-3 rounded-xl font-bold">Post</button>
              </div>
              <div className="space-y-4 max-h-60 overflow-y-auto">
                {reviews.map(review => (
                  <div key={review.id} className="border-b border-glass-border pb-2">
                    <div className="font-bold text-accent text-sm">{review.username}</div>
                    <div className="text-sm">{review.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Trailer Section */}
        <div className="mt-24 mb-12">
          <h2 className="text-3xl font-serif uppercase tracking-widest text-text-main mb-6 flex items-center gap-3">
            <Film className="w-5 h-5 text-accent" />
            Official Trailer
          </h2>
          
          {movie.trailerUrl ? (
            <div ref={containerRef} className="relative w-full aspect-video rounded-3xl overflow-hidden border border-glass-border shadow-[0_0_50px_rgba(0,0,0,0.5)] group bg-black">
               {/* Background placeholder while iframe loads */}
               <div className="absolute inset-0 flex items-center justify-center bg-black">
                 <Loader2 className="w-8 h-8 animate-spin text-accent" />
               </div>
               
               <iframe
                 ref={iframeRef}
                 src={`${movie.trailerUrl}?enablejsapi=1&controls=0&rel=0&modestbranding=1&showinfo=0`}
                 title={`${movie.title} Trailer`}
                 className="absolute top-0 left-0 w-full h-full z-10"
                 allowFullScreen
                 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
               ></iframe>

               {/* Interaction blocker to prevent Youtube from handling clicks directly so our play state stays in sync */}
               <div className="absolute inset-0 z-20 cursor-pointer" onClick={togglePlay} />

               {/* Custom Controls Overlay */}
               <div className="absolute bottom-0 left-0 w-full p-4 md:p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-30 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-auto">
                  <div className="flex items-center gap-4">
                    <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-accent text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_var(--color-accent)] cursor-pointer">
                      {isPlaying ? <Pause className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" /> : <Play className="w-5 h-5 md:w-6 md:h-6 pl-1" fill="currentColor" />}
                    </button>

                    <div className="flex items-center gap-3 bg-glass/80 border border-glass-border px-4 py-2 md:px-5 md:py-2.5 rounded-full backdrop-blur-md cursor-default" onClick={(e) => e.stopPropagation()}>
                      <button onClick={toggleMute} className="text-text-main hover:text-accent transition-colors cursor-pointer">
                        {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 md:w-5 md:h-5" /> : <Volume2 className="w-4 h-4 md:w-5 md:h-5" />}
                      </button>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={isMuted ? 0 : volume} 
                        onChange={handleVolumeChange}
                        className="w-20 md:w-32 accent-accent cursor-pointer"
                      />
                    </div>
                  </div>

                  <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-glass/80 border border-glass-border text-text-main flex items-center justify-center hover:bg-glass hover:text-accent backdrop-blur-md transition-all cursor-pointer">
                    <Maximize className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
               </div>
            </div>
          ) : (
            <div className="w-full aspect-video rounded-3xl border border-glass-border bg-glass/30 flex flex-col items-center justify-center text-text-dim relative overflow-hidden backdrop-blur-sm">
               <div className="absolute inset-0 bg-black/40" />
               <div className="relative z-10 flex flex-col items-center">
                 <Play className="w-16 h-16 mb-4 opacity-10" />
                 <p className="font-medium tracking-widest uppercase text-sm">Trailer unavailable for this film</p>
               </div>
            </div>
          )}
        </div>

        {recommendations.length > 0 && (
          <div className="mt-16 mb-24">
            <h2 className="text-3xl font-serif uppercase tracking-widest text-text-main mb-8 flex items-center gap-3">
              <Film className="w-5 h-5 text-accent" />
              Recommended for you
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => navigate(`/movie/${rec.id}`, { state: { movie: rec } })}
                  className="group cursor-pointer"
                >
                  <div className="h-[240px] rounded-2xl overflow-hidden mb-4 border border-glass-border">
                    <img 
                      src={rec.coverUrl} 
                      alt={rec.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <h3 className="font-bold text-lg text-text-main group-hover:text-accent transition-colors">
                    {rec.title}
                  </h3>
                  <div className="text-sm text-text-dim">{rec.releaseYear}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
