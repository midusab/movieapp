import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { db } from '../lib/firebase';
import { doc, onSnapshot, updateDoc, serverTimestamp, collection, addDoc, getDoc } from 'firebase/firestore';
import { Loader2, Play, Pause, Users, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function WatchRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!roomId) return;
    const roomRef = doc(db, 'rooms', roomId);
    
    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        setRoom({ id: docSnap.id, ...docSnap.data() });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [roomId]);

  const togglePlayback = async () => {
    if (!room || !user || room.hostId !== user.uid) return;
    
    const newIsPlaying = !room.isPlaying;
    await updateDoc(doc(db, 'rooms', roomId!), {
      isPlaying: newIsPlaying,
      updatedAt: serverTimestamp()
    });
  };

  if (loading) return <div className="min-h-screen bg-bg flex items-center justify-center text-text-main">Loading Room...</div>;
  if (!room) return <div className="min-h-screen bg-bg flex items-center justify-center text-text-main">Room not found.</div>;

  return (
    <div className="min-h-screen bg-bg text-text-main pt-24 pb-12 px-8">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-dim hover:text-white mb-8 transition-colors">
           <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-4xl font-serif mb-6">{room.movieData.title}</h1>
        
        <div className="aspect-video bg-black rounded-3xl overflow-hidden mb-8 border border-glass-border">
          <iframe
            ref={iframeRef}
            src={`${room.movieData.videoUrl}?enablejsapi=1&autoplay=${room.isPlaying ? 1 : 0}`}
            className="w-full h-full"
            title="Video Player"
          />
        </div>

        <div className="bg-glass p-6 rounded-2xl flex items-center justify-between">
          <div className="text-xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-accent" />
            Live Sync {room.isPlaying ? 'Active' : 'Paused'}
          </div>
          {room.hostId === user?.uid && (
            <button 
              onClick={togglePlayback}
              className="px-6 py-3 bg-accent rounded-full font-bold hover:bg-opacity-90 flex items-center gap-2"
            >
              {room.isPlaying ? <Pause className="w-5 h-5"/> : <Play className="w-5 h-5"/>}
              {room.isPlaying ? 'Pause' : 'Play'} for Everyone
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
