import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { Loader2, Trash2, Film } from 'lucide-react';
import { useNavigate } from 'react-router';

interface WatchlistItem {
  id: string;
  movieId: string;
  title: string;
  coverUrl: string;
}

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const fetchWatchlist = async () => {
      try {
        const watchlistRef = collection(db, 'users', user.uid, 'watchlist');
        const querySnapshot = await getDocs(watchlistRef);
        const items = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as WatchlistItem[];
        setWatchlist(items);
      } catch (error) {
        console.error("Error fetching watchlist:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWatchlist();
  }, [user, navigate]);

  const removeFromWatchlist = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    try {
      if (user) {
        await deleteDoc(doc(db, 'users', user.uid, 'watchlist', itemId));
        setWatchlist(prev => prev.filter(item => item.id !== itemId));
      }
    } catch (error) {
      console.error("Error removing from watchlist:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center text-text-dim">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text-main pt-24 pb-12 px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-black uppercase tracking-tight mb-8">My Profile</h1>
        
        <div className="bg-bg-darker p-8 rounded-3xl border border-glass-border mb-12 flex items-center gap-6">
          <img src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}`} className="w-20 h-20 rounded-full" alt="Avatar" />
          <div>
            <h2 className="text-2xl font-bold">{user?.displayName}</h2>
            <p className="text-text-dim">{user?.email}</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold uppercase tracking-widest text-text-main mb-8 flex items-center gap-3">
          <Film className="w-5 h-5 text-accent" />
          My Watchlist
        </h2>

        {watchlist.length === 0 ? (
          <div className="bg-glass p-8 rounded-2xl text-center text-text-dim">
            Your watchlist is empty. Add some movies to watch later!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {watchlist.map((item) => (
              <div 
                key={item.id} 
                className="group cursor-pointer relative"
                onClick={() => navigate(`/movie/${item.movieId}`)}
              >
                <div className="h-[300px] rounded-2xl overflow-hidden mb-3 border border-glass-border">
                  <img src={item.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={item.title} referrerPolicy="no-referrer" />
                </div>
                <h3 className="font-bold text-lg text-text-main group-hover:text-accent transition-colors">{item.title}</h3>
                <button 
                  onClick={(e) => removeFromWatchlist(e, item.id)}
                  className="absolute top-3 right-3 p-2 rounded-full bg-black/60 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-accent"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
