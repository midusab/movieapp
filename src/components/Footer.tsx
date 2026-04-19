export default function Footer() {
  return (
    <footer className="bg-bg-darker border-t border-glass-border py-12 px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <div>
          <h3 className="text-xl font-black tracking-tight text-text-main uppercase">Midusa</h3>
          <p className="text-text-dim text-sm mt-2">© 2026 Midusa Watch Lounge. All rights reserved.</p>
        </div>
        
        <div className="flex gap-8 text-sm font-semibold uppercase tracking-widest text-text-dim">
          <a href="#" className="hover:text-accent transition-colors">Privacy</a>
          <a href="#" className="hover:text-accent transition-colors">Terms</a>
          <a href="#" className="hover:text-accent transition-colors">Support</a>
        </div>
      </div>
    </footer>
  );
}
