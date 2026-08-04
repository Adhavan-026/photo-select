'use client';

// Force new Vercel deployment of clean sunset design
import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  Camera, 
  CloudLightning, 
  Lock, 
  Zap, 
  Check, 
  ArrowRight, 
  Server,
  Layers,
  Heart,
  Download,
  Share2
} from 'lucide-react';

// Custom 3D Tilt Card Component
function TiltCard({ children, className }: { children: React.ReactNode, className?: string }) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    const maxRotation = 8; 
    const rotX = -(y / (rect.height / 2)) * maxRotation;
    const rotY = (x / (rect.width / 2)) * maxRotation;

    setRotateX(rotX);
    setRotateY(rotY);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <motion.div
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ rotateX, rotateY }}
      style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
    >
      <div style={{ transform: 'translateZ(20px)' }} className="h-full w-full">
        {children}
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);

  // Scroll bindings for Firewatch Parallax Layers
  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const ySky = useTransform(heroScroll, [0, 1], ["0%", "30%"]);
  const yMountainBack = useTransform(heroScroll, [0, 1], ["0%", "22%"]);
  const yMountainMid = useTransform(heroScroll, [0, 1], ["0%", "14%"]);
  const yMountainFront = useTransform(heroScroll, [0, 1], ["0%", "6%"]);
  const yHeroText = useTransform(heroScroll, [0, 1], ["0%", "16%"]);
  const opacityHeroText = useTransform(heroScroll, [0, 0.7], [1, 0]);

  // Scroll bindings for 3D Dashboard Mockup Showcase
  const { scrollYProgress: mockupScroll } = useScroll({
    target: mockupRef,
    offset: ["start end", "end start"]
  });

  const rotateXMockup = useTransform(mockupScroll, [0, 0.65], [14, 0]);
  const scaleMockup = useTransform(mockupScroll, [0, 0.65], [0.85, 1]);
  const opacityMockup = useTransform(mockupScroll, [0, 0.45], [0.1, 1]);

  return (
    <div className="relative overflow-x-hidden font-sans bg-[#0f172a] text-white">
      {/* Import Premium Google Fonts */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
        .font-title {
          font-family: 'Playfair Display', serif;
        }
        .font-sans-custom {
          font-family: 'Outfit', sans-serif;
        }
      `}</style>

      {/* Floating 502x89 Pill Navigation */}
      <header className="absolute top-8 left-1/2 -translate-x-1/2 z-50 w-[502px] h-[89px] bg-[#0f141e]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] flex items-center justify-between px-8 shadow-2xl">
        <Link href="/" className="flex items-center shrink-0">
          <img src="/studioz-full-logo.png" alt="Studioz Logo" className="h-[40px] w-auto object-contain" />
        </Link>

        {/* Right Side Links */}
        <div className="flex items-center gap-5 shrink-0">
          <Link href="/login" className="text-[15px] font-semibold text-slate-300 hover:text-white transition-colors font-sans-custom">
            Log in
          </Link>
          <Link href="/register" className="text-[15px] font-bold bg-[#f97316] text-white px-6 py-2.5 rounded-full hover:bg-[#ea580c] transition-colors font-sans-custom shadow-lg shadow-[#f97316]/20">
            Sign up
          </Link>
        </div>
      </header>

      {/* Dark Hero Section */}
      <section ref={heroRef} className="relative min-h-[92vh] flex flex-col items-center justify-center pt-24 pb-16 overflow-hidden z-20 bg-[#0f141e]">
        
        {/* Layer 0: Camera Lens Background */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-[#0a0f18]">
          {/* Camera lens image with very subtle blur */}
          <img 
            src="/camera-lens-bg.jpg" 
            alt="Camera Lens Background" 
            className="absolute inset-0 w-[105%] h-[105%] left-[-2.5%] top-[-2.5%] object-cover opacity-100 blur-[2px] z-0" 
          />
          {/* Light gradient overlay just to ensure text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f18]/90 via-[#0a0f18]/40 to-transparent z-10"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f18]/50 via-transparent to-[#0a0f18] z-10"></div>
          
          {/* Color cast glow */}
          <div className="absolute top-0 right-[-20%] w-[120%] h-[120%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none z-10"></div>
        </div>

        {/* Layer 4: Sandwiched Content */}
        <motion.div 
          style={{ y: yHeroText, opacity: opacityHeroText }}
          className="container mx-auto px-6 text-center z-20 pointer-events-auto relative"
        >
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/20 bg-[#161e31] text-xs font-semibold text-blue-400 mb-8 font-sans-custom"
          >
            <Zap className="h-3.5 w-3.5 text-blue-400" />
            <span>Hybrid Cloud Proofing Platform</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-5xl mx-auto leading-[1.1] font-sans-custom"
          >
            Local Photo Streaming. <br />
            <span className="text-[#5ea5ff]">Zero Cloud Storage Cost.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-sm md:text-[17px] text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed font-sans-custom"
          >
            Never upload raw gigabytes online again. Stream beautiful watermarked proofing previews to clients straight from your local drive.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-5 font-sans-custom"
          >
            <Link href="/register" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#f97316] hover:bg-[#ea580c] text-white font-bold px-8 py-3.5 rounded-full shadow-[0_0_40px_rgba(249,115,22,0.4)] hover:shadow-[0_0_50px_rgba(249,115,22,0.5)] transition-all">
              <span>Start Free Trial</span>
              <ArrowRight className="h-4.5 w-4.5" />
            </Link>
            <a href="#features" className="w-full sm:w-auto flex items-center justify-center gap-2 border border-slate-700 bg-[#1e273b] hover:bg-[#28354c] font-semibold px-8 py-3.5 rounded-full transition-colors text-slate-200 shadow-lg">
              <span>Explore Features</span>
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* 3D Dashboard Showcase on Scroll */}
      <section ref={mockupRef} className="container mx-auto px-6 py-24 z-30 relative bg-[#0f172a] overflow-visible font-sans-custom">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 font-sans-custom tracking-tight text-white">Your Entire Studio Workspace, Live</h2>
          <p className="text-zinc-400 max-w-xl mx-auto text-sm md:text-base">Manage active portfolios, verify client selections, and inspect sync speed in a single screen.</p>
        </div>

        <motion.div 
          style={{ rotateX: rotateXMockup, scale: scaleMockup, opacity: opacityMockup }}
          className="relative max-w-5xl mx-auto rounded-2xl border border-white/10 bg-[#250a29]/80 p-4 shadow-[0_0_80px_rgba(230,92,64,0.06)] shadow-2xl backdrop-blur-md overflow-hidden"
        >
          {/* Glass header bar */}
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#e65c40]/80" />
              <span className="w-3 h-3 rounded-full bg-[#ffb830]/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <div className="bg-white/5 border border-white/5 rounded-lg px-6 py-1 text-xs text-zinc-400 font-mono">
              https://photo-select-cloud-frontend.vercel.app/dashboard/studio
            </div>
            <div className="w-10" />
          </div>

          {/* Dashboard Frame Content */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-2">
            {/* Sidebar Mock */}
            <div className="md:col-span-1 border-r border-white/5 pr-4 flex flex-col gap-6">
              <div>
                <h4 className="text-[10px] uppercase tracking-wider text-[#ffb830] font-bold mb-3">Live Feed</h4>
                <div className="flex flex-col gap-3">
                  <div className="bg-[#0f172a]/50 border border-white/5 rounded-lg p-2.5 text-[10px]">
                    <p className="text-zinc-300 font-semibold mb-0.5">OTP Verified</p>
                    <p className="text-[9px] text-zinc-500">Malliga & Murugesan</p>
                  </div>
                  <div className="bg-[#0f172a]/50 border border-white/5 rounded-lg p-2.5 text-[10px]">
                    <p className="text-zinc-300 font-semibold mb-0.5">Selection Saved</p>
                    <p className="text-[9px] text-zinc-500">Adhavan selection is complete</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Area Mock */}
            <div className="md:col-span-3 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Wedding Albums</h3>
                  <p className="text-xs text-zinc-400">View collections, track sync speeds, and monitor selection logs.</p>
                </div>
                <button className="bg-[#e65c40] hover:bg-[#d14b30] text-xs font-semibold px-4 py-2 rounded-lg text-white transition-colors">
                  + Create New Album
                </button>
              </div>

              {/* Album Cards Mock */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0f172a]/50 border border-white/5 rounded-xl p-5 relative">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] text-zinc-500 font-mono">Created 7/31/2026</span>
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded text-[9px] font-semibold">Active</span>
                  </div>
                  <h4 className="font-bold text-white mb-1">Malliga & murugesan</h4>
                  <p className="text-[11px] text-zinc-400 mb-6">alangudi</p>
                  <div className="flex items-center justify-between text-xs border-t border-white/5 pt-4">
                    <span className="text-zinc-400 text-[11px]">85 images synced</span>
                    <span className="text-[#ffb830] font-semibold text-[11px] cursor-pointer">Copy Client Link</span>
                  </div>
                </div>

                <div className="bg-[#0f172a]/50 border border-white/5 rounded-xl p-5 relative">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] text-zinc-500 font-mono">Created 7/30/2026</span>
                    <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 px-2 py-0.5 rounded text-[9px] font-semibold">Active</span>
                  </div>
                  <h4 className="font-bold text-white mb-1">asd</h4>
                  <p className="text-[11px] text-zinc-400 mb-6">asd</p>
                  <div className="flex items-center justify-between text-xs border-t border-white/5 pt-4">
                    <span className="text-zinc-400 text-[11px]">8 images synced</span>
                    <span className="text-[#ffb830] font-semibold text-[11px] cursor-pointer">Copy Client Link</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Interactive 3D Tilt Feature Grid */}
      <section id="features" className="container mx-auto px-6 py-24 border-t border-white/5 bg-[#0f172a] font-sans-custom">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 font-title tracking-tight">Engineered for Busy Studio Workflows</h2>
          <p className="text-zinc-400 max-w-xl mx-auto text-sm md:text-base">We combine cloud coordination with a high-performance local daemon running on your computer.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <TiltCard className="glass-card p-8 rounded-2xl border border-white/5 bg-[#250a29]/40 hover:border-[#e65c40]/30 transition-all flex flex-col justify-between group">
            <div>
              <div className="h-12 w-12 rounded-xl bg-[#e65c40]/10 flex items-center justify-center text-[#ffb830] mb-6">
                <Server className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Zero Storage Overhead</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">Original raw images never leave your local storage. Save thousands in monthly cloud hosting subscription fees.</p>
            </div>
            <span className="text-xs text-[#ffb830] group-hover:text-[#ffbe76] flex items-center gap-1.5 font-semibold">
              Read documentation <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </TiltCard>

          <TiltCard className="glass-card p-8 rounded-2xl border border-white/5 bg-[#250a29]/40 hover:border-[#e65c40]/30 transition-all flex flex-col justify-between group">
            <div>
              <div className="h-12 w-12 rounded-xl bg-[#e65c40]/10 flex items-center justify-center text-[#ffb830] mb-6">
                <CloudLightning className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Tunnel Preview Streaming</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">Exposes secure local previews to the web on demand. Direct streaming skips online upload processes entirely.</p>
            </div>
            <span className="text-xs text-[#ffb830] group-hover:text-[#ffbe76] flex items-center gap-1.5 font-semibold">
              Learn about tunnels <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </TiltCard>

          <TiltCard className="glass-card p-8 rounded-2xl border border-white/5 bg-[#250a29]/40 hover:border-[#e65c40]/30 transition-all flex flex-col justify-between group">
            <div>
              <div className="h-12 w-12 rounded-xl bg-[#e65c40]/10 flex items-center justify-center text-[#ffb830] mb-6">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Granular Selection & Lock</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">Lock client galleries dynamically when selections are finished to prevent further comments or modifications.</p>
            </div>
            <span className="text-xs text-[#ffb830] group-hover:text-[#ffbe76] flex items-center gap-1.5 font-semibold">
              See client workflow <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </TiltCard>
        </div>
      </section>

      {/* High-Performance Architecture Section */}
      <section id="architecture" className="container mx-auto px-6 py-24 border-t border-white/5 bg-[#0f172a] font-sans-custom">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 font-title tracking-tight text-[#ffe3a1]">The Hybrid Cloud Flow</h2>
            <p className="text-zinc-300 text-sm leading-relaxed mb-8">
              Traditional proofing requires uploading gigabytes of high-res photos online. **Studioz** bypasses the upload step entirely. Your agent extracts web-optimized previews, starts a secure tunnel, and syncs only the metadata to the cloud. 
            </p>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-lg bg-[#e65c40]/10 flex items-center justify-center text-[#ffb830] shrink-0">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white">1. Local Daemon Extraction</h4>
                  <p className="text-zinc-400 text-xs mt-1">The Docker agent watches folders, extracts watermarked WebP previews, and stores metadata in a local cache.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-lg bg-[#e65c40]/10 flex items-center justify-center text-[#ffb830] shrink-0">
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white">2. Meta Synchronization</h4>
                  <p className="text-zinc-400 text-xs mt-1">Only tiny image coordinates, hashes, and size logs are synced to the cloud PostgreSQL database.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-lg bg-[#e65c40]/10 flex items-center justify-center text-[#ffb830] shrink-0">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white">3. Directproof Render</h4>
                  <p className="text-zinc-400 text-xs mt-1">When clients open the page, their browser loads watermarked images directly from the local agent over the tunnel.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="glass-card p-6 rounded-2xl border border-white/5 bg-[#250a29]/40 relative overflow-hidden flex flex-col gap-4 shadow-xl">
            <h4 className="text-xs uppercase font-bold tracking-widest text-[#ffb830]">Local Agent Stats</h4>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="bg-[#0f172a]/50 border border-white/5 rounded-xl p-4">
                <p className="text-[10px] text-zinc-500 mb-1">Heartbeat Status</p>
                <p className="text-sm font-bold text-emerald-400">ONLINE</p>
              </div>
              <div className="bg-[#0f172a]/50 border border-white/5 rounded-xl p-4">
                <p className="text-[10px] text-zinc-500 mb-1">Sync Cache</p>
                <p className="text-sm font-bold text-white">114 Images</p>
              </div>
              <div className="bg-[#0f172a]/50 border border-white/5 rounded-xl p-4 col-span-2">
                <p className="text-[10px] text-zinc-500 mb-1">Tunnel Domain</p>
                <p className="text-xs font-mono font-semibold text-[#ffb830]">purity-awkward-idealness.ngrok-free.dev</p>
              </div>
            </div>
            <div className="bg-[#0f172a]/50 border border-white/5 rounded-xl p-4">
              <h5 className="text-[11px] font-bold text-white mb-2">Sync Speeds (JPEG to WebP conversion)</h5>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-2">
                <div className="bg-[#e65c40] h-1.5 rounded-full" style={{ width: '85%' }}></div>
              </div>
              <div className="flex items-center justify-between text-[9px] text-zinc-500">
                <span>0 ms</span>
                <span>Active conversion: 4.8 ms/img</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-6 py-24 border-t border-white/5 bg-[#0f172a] font-sans-custom">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 font-title tracking-tight">Flexible Plans for Every Studio</h2>
          <p className="text-zinc-400 max-w-xl mx-auto text-sm md:text-base">Get started for free or unlock unlimited galleries for busy wedding studios.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-8">
          {/* Trial / Free Tier */}
          <div className="glass-card p-8 rounded-2xl border border-white/5 bg-[#250a29]/20 relative flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-zinc-300 mb-2">Starter / Trial</h3>
              <p className="text-zinc-500 text-sm mb-6">Perfect for small photography businesses starting out.</p>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-5xl font-extrabold text-white">$0</span>
                <span className="text-zinc-400 text-sm">/ 14 Days</span>
              </div>
              <ul className="space-y-4 mb-8 text-sm text-zinc-400">
                <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-emerald-400 shrink-0" /> 1 Studio Space</li>
                <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-emerald-400 shrink-0" /> 3 Active Albums</li>
                <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-emerald-400 shrink-0" /> Up to 500 Images/Album</li>
                <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-emerald-400 shrink-0" /> WebP Watermarked previews</li>
              </ul>
            </div>
            <Link href="/register" className="w-full py-4 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold text-center transition-colors">
              Get Started
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="glass-card p-8 rounded-2xl border border-[#e65c40]/30 bg-[#250a29]/40 relative flex flex-col justify-between">
            <div className="absolute top-4 right-4 bg-[#e65c40]/10 border border-[#e65c40]/30 text-[#ffb830] text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
              Recommended
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#ffb830] mb-2">Studio Pro</h3>
              <p className="text-zinc-500 text-sm mb-6">Designed for active wedding and event photographers.</p>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-5xl font-extrabold text-white">$49</span>
                <span className="text-zinc-400 text-sm">/ month</span>
              </div>
              <ul className="space-y-4 mb-8 text-sm text-zinc-400">
                <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-[#ffb830] shrink-0" /> Unlimited Albums</li>
                <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-[#ffb830] shrink-0" /> Up to 10,000 Images/Album</li>
                <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-[#ffb830] shrink-0" /> Real-time Selection Feedback</li>
                <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-[#ffb830] shrink-0" /> Express Range stream gateway</li>
                <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-[#ffb830] shrink-0" /> Custom Watermark Settings</li>
              </ul>
            </div>
            <Link href="/register" className="w-full py-4 px-4 rounded-xl bg-[#e65c40] hover:bg-[#d14b30] text-white font-semibold text-center transition-colors shadow-lg shadow-[#e65c40]/25">
              Subscribe Pro
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-16 text-center text-sm text-zinc-500 bg-[#0f172a]">
        <div className="container mx-auto px-6">
          <p>© {new Date().getFullYear()} Studioz (powered by Clickone). All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
