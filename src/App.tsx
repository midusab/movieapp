import { BrowserRouter as Router, Routes, Route } from 'react-router';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Profile from './pages/Profile';
import MovieDetails from './pages/MovieDetails';
import WatchRoom from './pages/WatchRoom';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="font-sans antialiased text-text-main selection:bg-accent/40 selection:text-white">
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/movie/:id" element={<MovieDetails />} />
              <Route path="/room/:roomId" element={<WatchRoom />} />
            </Routes>
            <Footer />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
