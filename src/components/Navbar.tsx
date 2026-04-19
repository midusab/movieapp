import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Film, LogOut, Clapperboard, LogIn, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router';
import SearchBar from './SearchBar';

export default function Navbar() {
  const { user, signIn, logOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <nav className="fixed top-0 w-full z-50 bg-glass border-b-0 border-glass-border">
      <div className="max-w-7xl mx-auto px-4 h-[72px] flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-[12px] bg-black/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),_0_2px_10px_rgba(0,0,0,0.5)] flex items-center justify-center text-text-main group-hover:bg-accent group-hover:text-white transition-all border border-glass-border">
            <Clapperboard className="w-5 h-5" />
          </div>
          <span className="font-sans text-[22px] font-bold tracking-tight text-text-main">
            Midusa
          </span>
        </Link>
        
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="p-2.5 rounded-full bg-black/40 hover:bg-black/70 text-text-main transition-colors border border-glass-border">
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <SearchBar />
          {user ? (
            <div className="flex items-center gap-4">
              <Link to="/profile" className="flex items-center gap-3 bg-black/40 pl-3 pr-1.5 py-1.5 rounded-full border border-glass-border shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] hover:bg-black/60 transition-colors">
                <span className="text-sm font-semibold text-text-main hidden sm:block">{user.displayName}</span>
                <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} alt="Avatar" className="w-7 h-7 rounded-full shadow-sm" referrerPolicy="no-referrer" />
              </Link>
              <button 
                onClick={logOut}
                className="p-2.5 rounded-full bg-black/40 hover:bg-black/70 text-text-main transition-colors shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] border border-glass-border"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={signIn}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-accent text-white text-sm font-bold shadow-[0_4px_14px_rgba(255,0,51,0.3)] hover:scale-105 active:scale-95 transition-all"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
