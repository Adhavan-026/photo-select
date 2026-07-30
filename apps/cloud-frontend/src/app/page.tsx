'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Camera, 
  CloudLightning, 
  Lock, 
  Zap, 
  Sliders, 
  Check, 
  ArrowRight, 
  ShieldAlert,
  Server
} from 'lucide-react';

export default function LandingPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: 'easeOut' } }
  };

  return (
    <div className="relative overflow-hidden font-sans">
      {/* Background Decorative Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[150px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#08080a]/80 backdrop-blur-md">
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
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors px-4 py-2">
              Log in
            </Link>
            <Link href="/register" className="glow-btn bg-indigo-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-colors">
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-24 pb-20 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-xs font-semibold text-indigo-300 mb-8"
        >
          <Zap className="h-3 w-3 text-indigo-400" />
          <span>Introducing Local Studio Image Streaming v1.0</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl mx-auto"
        >
          The Hybrid Cloud Gallery for <span className="text-gradient">Professional Studios</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-lg md:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed"
        >
          Never upload RAWs to the cloud again. Keep original files in your studio. Stream watermarked WebP previews directly to clients over secure Cloudflare tunnels.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="/register" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-[#08080a] font-semibold px-8 py-4 rounded-xl hover:bg-zinc-200 transition-colors shadow-xl">
            <span>Start Free Trial</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="#features" className="w-full sm:w-auto flex items-center justify-center gap-2 border border-white/10 bg-white/5 font-semibold px-8 py-4 rounded-xl hover:bg-white/10 transition-colors text-white">
            <span>Explore Features</span>
          </a>
        </motion.div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="container mx-auto px-6 py-24 border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Engineered for Massive Collections</h2>
          <p className="text-zinc-400 max-w-xl mx-auto">We combine cloud databases with a high-performance local daemon running on your computer.</p>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          <motion.div variants={itemVariants} className="glass-card p-8 rounded-2xl">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6">
              <Server className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Zero Cloud Storage Overhead</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">Original high-res images never leave your local storage. Save thousands in monthly cloud hosting subscription fees.</p>
          </motion.div>

          <motion.div variants={itemVariants} className="glass-card p-8 rounded-2xl">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6">
              <CloudLightning className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Direct Tunnel Streaming</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">Leverages secure Cloudflare tunnels to stream watermarked previews straight from your local drive to clients' screens.</p>
          </motion.div>

          <motion.div variants={itemVariants} className="glass-card p-8 rounded-2xl">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Enterprise Security</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">Granular Role-Based Access Control, signed token validation, rate-limiting, and detailed session audits built-in.</p>
          </motion.div>
        </motion.div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-6 py-24 border-t border-white/5 bg-gradient-to-b from-[#08080a] to-[#0c0c10]">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-zinc-400 max-w-xl mx-auto">Get started for free or unlock unlimited performance for busy wedding studios.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-8">
          {/* Trial / Free Tier */}
          <div className="glass-card p-8 rounded-2xl border border-white/5 relative flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-zinc-300 mb-2">Starter / Trial</h3>
              <p className="text-zinc-500 text-sm mb-6">Perfect for small photography businesses starting out.</p>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-5xl font-extrabold text-white">$0</span>
                <span className="text-zinc-400 text-sm">/ 14 Days</span>
              </div>
              <ul className="space-y-4 mb-8 text-sm text-zinc-400">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> 1 Studio Space</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> 3 Managed Albums</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Up to 500 Images/Album</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> WebP Watermarked previews</li>
              </ul>
            </div>
            <Link href="/register" className="w-full py-3.5 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold text-center transition-colors">
              Get Started
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="glass-card p-8 rounded-2xl border border-indigo-500/30 relative flex flex-col justify-between bg-indigo-950/10">
            <div className="absolute top-4 right-4 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold px-3 py-1 rounded-full">
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
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-indigo-400" /> Unlimited Albums</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-indigo-400" /> Up to 10,000 Images/Album</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-indigo-400" /> Real-time Websocket Client Selection</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-indigo-400" /> Express Range stream gateway</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-indigo-400" /> Custom Watermark Settings</li>
              </ul>
            </div>
            <Link href="/register" className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-center transition-colors shadow-lg shadow-indigo-600/25">
              Subscribe Pro
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 text-center text-sm text-zinc-500">
        <div className="container mx-auto px-6">
          <p>© {new Date().getFullYear()} PhotoSelect Systems Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
