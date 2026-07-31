'use client';

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
    
    const maxRotation = 10; // Max rotation angle in degrees
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
      <div style={{ transform: 'translateZ(25px)' }} className="h-full w-full">
        {children}
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);

  // Scroll bindings for Hero Parallax
  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const yHeroText = useTransform(heroScroll, [0, 1], ["0%", "30%"]);
  const opacityHeroText = useTransform(heroScroll, [0, 0.8], [1, 0]);
  const xLeftPhoto = useTransform(heroScroll, [0, 1], ["0px", "-180px"]);
  const xRightPhoto = useTransform(heroScroll, [0, 1], ["0px", "180px"]);
  const rotateLeft = useTransform(heroScroll, [0, 1], [-6, -18]);
  const rotateRight = useTransform(heroScroll, [0, 1], [6, 18]);
  const opacityPhotos = useTransform(heroScroll, [0, 0.7], [1, 0]);

  // Scroll bindings for 3D Dashboard Mockup Showcase
  const { scrollYProgress: mockupScroll } = useScroll({
    target: mockupRef,
    offset: ["start end", "end start"]
  });

  const rotateXMockup = useTransform(mockupScroll, [0, 0.55], [16, 0]);
  const scaleMockup = useTransform(mockupScroll, [0, 0.55], [0.8, 1]);
  const opacityMockup = useTransform(mockupScroll, [0, 0.4], [0.1, 1]);

  return (
    <div className="relative overflow-x-hidden font-sans bg-[#08080c] text-white">
      {/* Background Decorative Mesh / Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/10 blur-[160px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/5 blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-purple-600/5 blur-[160px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#08080c]/70 backdrop-blur-md">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Camera className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Photo<span className="text-indigo-400">Select</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors px-4 py-2">
              Log in
            </Link>
            <Link href="/register" className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 transition-colors">
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* 3D Parallax Hero Section */}
      <section ref={heroRef} className="relative min-h-[95vh] flex flex-col items-center justify-center pt-20 pb-16 z-20">
        <motion.div 
          style={{ y: yHeroText, opacity: opacityHeroText }}
          className="container mx-auto px-6 text-center z-30 pointer-events-auto"
        >
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-xs font-semibold text-indigo-300 mb-8"
          >
            <Zap className="h-3.5 w-3.5 text-indigo-400" />
            <span>Premium Local-to-Cloud Image Selection</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl mx-auto leading-[1.1]"
          >
            Local Photo Streaming. <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">Zero Cloud Hosting Fees.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Keep your high-res wedding RAWs safely in your studio storage. Stream watermarked client-proofing previews instantly from your desktop via secure tunnels.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link href="/register" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold px-8 py-4 rounded-xl hover:bg-indigo-500 transition-colors shadow-xl shadow-indigo-600/30">
              <span>Start Free Trial</span>
              <ArrowRight className="h-4.5 w-4.5" />
            </Link>
            <a href="#features" className="w-full sm:w-auto flex items-center justify-center gap-2 border border-white/10 bg-white/5 font-semibold px-8 py-4 rounded-xl hover:bg-white/10 transition-colors text-white">
              <span>Explore Features</span>
            </a>
          </motion.div>
        </motion.div>

        {/* Floating 3D Parallax Photo Layers */}
        <motion.div 
          style={{ opacity: opacityPhotos }}
          className="relative w-full max-w-5xl h-[320px] md:h-[400px] mt-8 pointer-events-none z-10 flex items-center justify-center overflow-visible"
        >
          {/* Central Grid Base */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,rgba(99,102,241,0.08),transparent)] border border-white/5 rounded-3xl mx-6" />

          {/* Left Floating Card */}
          <motion.div 
            style={{ x: xLeftPhoto, rotate: rotateLeft }}
            className="absolute left-[8%] md:left-[15%] w-[180px] md:w-[240px] aspect-[3/4] rounded-2xl border border-white/10 bg-zinc-950/40 p-3 shadow-2xl backdrop-blur-sm -rotate-6"
          >
            <div className="relative w-full h-[80%] rounded-xl overflow-hidden bg-gradient-to-b from-indigo-950 to-zinc-950 flex flex-col justify-end p-4 border border-white/5">
              {/* Simulated Image Backdrop */}
              <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.3),transparent)]" />
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md border border-white/10 text-[9px] px-2 py-0.5 rounded-full text-indigo-300">
                WATERMARK
              </div>
              <div className="z-10">
                <p className="text-[10px] text-zinc-500 font-mono mb-1">5I0A9812.JPG</p>
                <h4 className="text-xs font-bold text-white">Malliga & Murugesan</h4>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 px-1">
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="h-3 w-3" /> Selected
              </span>
              <span className="text-[10px] text-zinc-500">12.4 MB</span>
            </div>
          </motion.div>

          {/* Right Floating Card */}
          <motion.div 
            style={{ x: xRightPhoto, rotate: rotateRight }}
            className="absolute right-[8%] md:right-[15%] w-[180px] md:w-[240px] aspect-[3/4] rounded-2xl border border-white/10 bg-zinc-950/40 p-3 shadow-2xl backdrop-blur-sm rotate-6"
          >
            <div className="relative w-full h-[80%] rounded-xl overflow-hidden bg-gradient-to-b from-violet-950 to-zinc-950 flex flex-col justify-end p-4 border border-white/5">
              {/* Simulated Image Backdrop */}
              <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.3),transparent)]" />
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md border border-white/10 text-[9px] px-2 py-0.5 rounded-full text-indigo-300">
                WATERMARK
              </div>
              <div className="z-10">
                <p className="text-[10px] text-zinc-500 font-mono mb-1">5I0A9815.JPG</p>
                <h4 className="text-xs font-bold text-white">Malliga & Murugesan</h4>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 px-1">
              <span className="text-[10px] text-indigo-400 font-semibold flex items-center gap-1">
                <Heart className="h-3 w-3 fill-indigo-400" /> Favorited
              </span>
              <span className="text-[10px] text-zinc-500">9.8 MB</span>
            </div>
          </motion.div>

          {/* Central Active Phone Showcase */}
          <div className="w-[180px] md:w-[200px] aspect-[9/19] rounded-[36px] border-4 border-zinc-800 bg-[#08080a] shadow-[0_0_50px_rgba(99,102,241,0.25)] p-2 relative overflow-hidden z-20">
            {/* Speaker bar */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-16 h-4 bg-zinc-800 rounded-full flex items-center justify-center">
              <div className="w-10 h-1 bg-black rounded-full" />
            </div>
            {/* Screen content */}
            <div className="w-full h-full rounded-[28px] overflow-hidden bg-[#0a0a0f] pt-8 px-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[8px] font-bold text-indigo-400">Malliga & Murugesan</span>
                  <span className="text-[7px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-1.5 py-0.5 rounded">Client Access</span>
                </div>
                <div className="h-24 w-full rounded-lg bg-zinc-900 border border-white/5 flex flex-col justify-end p-2 relative">
                  <div className="absolute top-1.5 left-1.5 bg-black/60 text-[6px] px-1 py-0.2 rounded text-zinc-400">PHOTOSELECT</div>
                  <div className="flex items-center justify-between">
                    <span className="text-[7px] text-zinc-400 font-mono">5I0A9807.JPG</span>
                    <Heart className="h-2.5 w-2.5 text-zinc-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                  <div className="h-12 rounded bg-zinc-900 border border-white/5" />
                  <div className="h-12 rounded bg-zinc-900 border border-white/5" />
                </div>
              </div>
              <div className="pb-3">
                <button className="w-full bg-indigo-600 text-[8px] font-bold py-2 rounded-lg text-white shadow shadow-indigo-600/50">
                  Submit Selection (0)
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 3D Dashboard Showcase on Scroll */}
      <section ref={mockupRef} className="container mx-auto px-6 py-24 z-30 relative border-t border-white/5 overflow-visible">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Your Entire Studio Workspace, Live</h2>
          <p className="text-zinc-400 max-w-xl mx-auto">Manage active portfolios, verify client selections, and inspect sync speed in a single screen.</p>
        </div>

        <motion.div 
          style={{ rotateX: rotateXMockup, scale: scaleMockup, opacity: opacityMockup }}
          className="relative max-w-5xl mx-auto rounded-2xl border border-white/10 bg-zinc-950/70 p-4 shadow-[0_0_80px_rgba(99,102,241,0.1)] shadow-2xl backdrop-blur-md overflow-hidden"
        >
          {/* Glass header bar */}
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <span className="w-3 h-3 rounded-full bg-green-500/80" />
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
                <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-3">Live Feed</h4>
                <div className="flex flex-col gap-3">
                  <div className="bg-white/5 border border-white/5 rounded-lg p-2.5 text-[10px]">
                    <p className="text-zinc-300 font-semibold mb-0.5">OTP Verified</p>
                    <p className="text-[9px] text-zinc-500">Malliga & Murugesan</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-lg p-2.5 text-[10px]">
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
                <button className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold px-4 py-2 rounded-lg text-white transition-colors">
                  + Create New Album
                </button>
              </div>

              {/* Album Cards Mock */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/5 rounded-xl p-5 relative">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] text-zinc-500 font-mono">Created 7/31/2026</span>
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded text-[9px] font-semibold">Active</span>
                  </div>
                  <h4 className="font-bold text-white mb-1">Malliga & murugesan</h4>
                  <p className="text-[11px] text-zinc-400 mb-6">alangudi</p>
                  <div className="flex items-center justify-between text-xs border-t border-white/5 pt-4">
                    <span className="text-zinc-400 text-[11px]">85 images synced</span>
                    <span className="text-indigo-400 font-semibold text-[11px] cursor-pointer">Copy Client Link</span>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-xl p-5 relative">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] text-zinc-500 font-mono">Created 7/30/2026</span>
                    <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 px-2 py-0.5 rounded text-[9px] font-semibold">Active</span>
                  </div>
                  <h4 className="font-bold text-white mb-1">asd</h4>
                  <p className="text-[11px] text-zinc-400 mb-6">asd</p>
                  <div className="flex items-center justify-between text-xs border-t border-white/5 pt-4">
                    <span className="text-zinc-400 text-[11px]">8 images synced</span>
                    <span className="text-indigo-400 font-semibold text-[11px] cursor-pointer">Copy Client Link</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Interactive 3D Tilt Feature Grid */}
      <section id="features" className="container mx-auto px-6 py-24 border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Engineered for Busy Studio Workflows</h2>
          <p className="text-zinc-400 max-w-xl mx-auto">We combine cloud coordination with a high-performance local daemon running on your computer.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <TiltCard className="glass-card p-8 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all flex flex-col justify-between group">
            <div>
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6">
                <Server className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Zero Storage Overhead</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">Original raw images never leave your local storage. Save thousands in monthly cloud hosting subscription fees.</p>
            </div>
            <span className="text-xs text-indigo-300 group-hover:text-indigo-400 flex items-center gap-1.5 font-semibold">
              Read documentation <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </TiltCard>

          <TiltCard className="glass-card p-8 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all flex flex-col justify-between group">
            <div>
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6">
                <CloudLightning className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Tunnel Preview Streaming</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">Leverages secure Cloudflare tunnels to stream watermarked previews straight from your local drive to clients' screens.</p>
            </div>
            <span className="text-xs text-indigo-300 group-hover:text-indigo-400 flex items-center gap-1.5 font-semibold">
              Learn about tunnels <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </TiltCard>

          <TiltCard className="glass-card p-8 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all flex flex-col justify-between group">
            <div>
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Granular Selection & Lock</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">Lock client galleries dynamically when selections are finished to prevent further comments or modifications.</p>
            </div>
            <span className="text-xs text-indigo-300 group-hover:text-indigo-400 flex items-center gap-1.5 font-semibold">
              See client workflow <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </TiltCard>
        </div>
      </section>

      {/* High-Performance Architecture Section */}
      <section id="architecture" className="container mx-auto px-6 py-24 border-t border-white/5 bg-gradient-to-b from-[#08080c] to-[#0c0c12]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">The Hybrid Cloud Proofing Flow</h2>
            <p className="text-zinc-400 text-sm leading-relaxed mb-8">
              Traditional proofing requires uploading gigabytes of high-res photos online. **PhotoSelect** bypasses the upload step entirely. Your agent extracts web-optimized previews, starts a secure tunnel, and syncs only the metadata to the cloud. 
            </p>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white">1. Local Daemon Extraction</h4>
                  <p className="text-zinc-400 text-xs mt-1">The Docker agent watches folders, extracts watermarked WebP previews, and stores metadata in a local cache.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white">2. Meta Synchronization</h4>
                  <p className="text-zinc-400 text-xs mt-1">Only tiny image coordinates, hashes, and size logs are synced to the cloud PostgreSQL database.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white">3. Directproof Render</h4>
                  <p className="text-zinc-400 text-xs mt-1">When clients open the page, their browser loads watermarked images directly from the local agent over the tunnel.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="glass-card p-6 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col gap-4 shadow-xl shadow-indigo-950/10">
            <h4 className="text-xs uppercase font-bold tracking-widest text-indigo-400">Local Agent Stats</h4>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                <p className="text-[10px] text-zinc-500 mb-1">Heartbeat Status</p>
                <p className="text-sm font-bold text-emerald-400">ONLINE</p>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                <p className="text-[10px] text-zinc-500 mb-1">Sync Cache</p>
                <p className="text-sm font-bold text-white">114 Images</p>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-xl p-4 col-span-2">
                <p className="text-[10px] text-zinc-500 mb-1">Tunnel Domain</p>
                <p className="text-xs font-mono font-semibold text-indigo-300">purity-awkward-idealness.ngrok-free.dev</p>
              </div>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl p-4">
              <h5 className="text-[11px] font-bold text-white mb-2">Sync Speeds (JPEG to WebP conversion)</h5>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-2">
                <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: '85%' }}></div>
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
      <section id="pricing" className="container mx-auto px-6 py-24 border-t border-white/5 bg-gradient-to-b from-[#08080c] to-[#0a0a0f]">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Flexible Plans for Every Studio</h2>
          <p className="text-zinc-400 max-w-xl mx-auto">Get started for free or unlock unlimited galleries for busy wedding studios.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-8">
          {/* Trial / Free Tier */}
          <div className="glass-card p-8 rounded-2xl border border-white/5 relative flex flex-col justify-between bg-zinc-950/20">
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
          <div className="glass-card p-8 rounded-2xl border border-indigo-500/30 relative flex flex-col justify-between bg-indigo-950/5">
            <div className="absolute top-4 right-4 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
              Recommended
            </div>
            <div>
              <h3 className="text-lg font-bold text-indigo-300 mb-2">Studio Pro</h3>
              <p className="text-zinc-500 text-sm mb-6">Designed for active wedding and event photographers.</p>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-5xl font-extrabold text-white">$49</span>
                <span className="text-zinc-400 text-sm">/ month</span>
              </div>
              <ul className="space-y-4 mb-8 text-sm text-zinc-400">
                <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-indigo-400 shrink-0" /> Unlimited Albums</li>
                <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-indigo-400 shrink-0" /> Up to 10,000 Images/Album</li>
                <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-indigo-400 shrink-0" /> Real-time Selection Feedback</li>
                <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-indigo-400 shrink-0" /> Express Range stream gateway</li>
                <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-indigo-400 shrink-0" /> Custom Watermark Settings</li>
              </ul>
            </div>
            <Link href="/register" className="w-full py-4 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-center transition-colors shadow-lg shadow-indigo-600/25">
              Subscribe Pro
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-16 text-center text-sm text-zinc-500">
        <div className="container mx-auto px-6">
          <p>© {new Date().getFullYear()} PhotoSelect Systems Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
