import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import * as dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API constraints
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Movie API route proxying TMDB list
  app.get("/api/movies", async (req, res) => {
    try {
      const apiKey = process.env.TMDB_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "TMDB_API_KEY environment variable is required." });
      }

      // Fetch trending movies
      const response = await fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${apiKey}`);
      if (!response.ok) {
        throw new Error(`TMDB responded with ${response.status}`);
      }
      const data = await response.json();
      
      // Map to our app's format
      const movies = data.results.map((m: any) => ({
        id: m.id.toString(),
        title: m.title || m.original_title,
        coverUrl: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
        backdropUrl: `https://image.tmdb.org/t/p/w1280${m.backdrop_path}`,
        releaseYear: m.release_date?.split('-')[0] || "Unknown",
        description: m.overview,
        // Since TMDB doesn't stream movies, we will fallback to a default video for testing in the watch lounge
        videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
      }));

      res.json(movies);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch movies." });
    }
  });

  // Proxy to fetch a single movie
  app.get("/api/movies/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const apiKey = process.env.TMDB_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "TMDB_API_KEY is required." });
      }

      const response = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&append_to_response=credits,videos`);
      if (!response.ok) {
        throw new Error(`TMDB responded with ${response.status}`);
      }
      const m = await response.json();
      
      const trailer = m.videos?.results?.find((v: any) => v.type === "Trailer" && v.site === "YouTube");

      const movie = {
        id: m.id.toString(),
        title: m.title || m.original_title,
        coverUrl: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : '',
        backdropUrl: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : '',
        releaseYear: m.release_date?.split('-')[0] || "Unknown",
        description: m.overview,
        genres: m.genres ? m.genres.map((g: any) => g.name) : [],
        rating: m.vote_average ? m.vote_average.toFixed(1) : null,
        runtime: m.runtime || null,
        cast: m.credits?.cast ? m.credits.cast.slice(0, 4).map((c: any) => c.name) : [],
        trailerUrl: trailer ? `https://www.youtube.com/embed/${trailer.key}` : null,
        videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
      };

      res.json(movie);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch movie details." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In ESM, __dirname is not defined, but process.cwd() is safe here.
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
