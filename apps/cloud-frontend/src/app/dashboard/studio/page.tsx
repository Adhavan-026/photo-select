'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Database, 
  ShieldCheck, 
  Activity, 
  Copy, 
  Check, 
  Trash2,
  RefreshCw,
  LogOut,
  Eye,
  Heart,
  X,
  FolderOpen
} from 'lucide-react';
import { useAuth } from '../../../lib/authContext';
import { api } from '../../../lib/api';
import axios from 'axios';

interface Album {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  isPrivate: boolean;
  status?: 'PENDING' | 'SUBMITTED' | 'COMPLETED' | 'SCANNING' | 'PROCESSING' | 'SYNCING';
  totalImages: number;
  createdAt: string;
  _count?: {
    images: number;
  };
}

export default function StudioDashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  
  const [albums, setAlbums] = useState<Album[]>([]);
  const [fetchingAlbums, setFetchingAlbums] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Form states for new album
  const [albumName, setAlbumName] = useState('');
  const [albumDesc, setAlbumDesc] = useState('');
  const [albumSlug, setAlbumSlug] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [passcode, setPasscode] = useState('1234');
  const [formError, setFormError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [localFolderName, setLocalFolderName] = useState('');

  // Album Detail Selection states
  const [selectedAlbumDetails, setSelectedAlbumDetails] = useState<any>(null);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SELECTED' | 'PENDING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Studio profile metrics
  const [storageUsage, setStorageUsage] = useState<string>('2.4 MB / 10 GB');
  const [activeTunnel, setActiveTunnel] = useState<string>('http://localhost:8082');
  const [watermark, setWatermark] = useState('Studioz');
  const [events, setEvents] = useState<any[]>([]);

  const [isEditingWatermark, setIsEditingWatermark] = useState(false);
  const [tempWatermark, setTempWatermark] = useState('');
  const [updatingWatermark, setUpdatingWatermark] = useState(false);

  const handleEditWatermarkClick = () => {
    setTempWatermark(watermark);
    setIsEditingWatermark(true);
  };

  const handleSaveWatermark = async () => {
    if (!tempWatermark.trim()) return;
    setUpdatingWatermark(true);
    try {
      const res = await api.put('/studios/settings', {
        watermarkText: tempWatermark,
      });
      if (res.data?.success) {
        setWatermark(tempWatermark);
        setIsEditingWatermark(false);
      }
    } catch (err) {
      console.error('Failed to save watermark settings', err);
    } finally {
      setUpdatingWatermark(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const loadDashboardData = async () => {
    if (!user) return;
    setFetchingAlbums(true);
    try {
      const albumRes = await api.get('/albums');
      if (albumRes.data?.success) {
        setAlbums(albumRes.data.albums);
      }

      try {
        const settingsRes = await api.get('/studios/settings');
        if (settingsRes.data?.success) {
          setWatermark(settingsRes.data.settings.watermarkText || (user.firstName + ' Photography'));
        } else {
          setWatermark(user.firstName + ' Photography');
        }
      } catch (err) {
        setWatermark(user.firstName + ' Photography');
      }

      setStorageUsage('2.4 MB / 10 GB');
      setActiveTunnel('http://localhost:8082');
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setFetchingAlbums(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadDashboardData();
      const interval = setInterval(() => {
        api.get('/albums').then((res) => {
          if (res.data?.success) setAlbums(res.data.albums);
        }).catch(() => {});
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleCopyLink = (slug: string) => {
    const link = `${window.location.origin}/gallery/${slug}`;
    navigator.clipboard.writeText(link);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsCreating(true);

    try {
      const response = await api.post('/albums', {
        name: albumName,
        description: albumDesc,
        slug: albumSlug || albumName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        isPrivate,
        passcode: isPrivate ? passcode : undefined,
      });

      if (response.data?.success) {
        const newAlbum = response.data.album;
        if (localFolderName.trim()) {
          try {
            const agentPath = `/usr/src/app/watched_photos/${localFolderName.trim()}`;
            await fetch('http://localhost:8082/watch-folder', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                path: agentPath,
                albumId: newAlbum.id,
              }),
            });
          } catch (agentErr) {}
        }

        setShowModal(false);
        setAlbumName('');
        setAlbumDesc('');
        setAlbumSlug('');
        setLocalFolderName('');
        loadDashboardData();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Error occurred creating album.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteAlbum = async (id: string) => {
    if (!confirm('Are you sure you want to delete this album? This cannot be undone.')) return;
    try {
      await api.delete(`/albums/${id}`);
      loadDashboardData();
    } catch (err) {
      alert('Delete failed');
    }
  };

  const filteredAlbums = albums.filter((alb) => {
    const matchesSearch = alb.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilter === 'SELECTED') return matchesSearch && alb.status === 'SUBMITTED';
    if (statusFilter === 'PENDING') return matchesSearch && (alb.status === 'PENDING' || !alb.status);
    return matchesSearch;
  });

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#F6EDE2] text-[#3A2B23] flex items-center justify-center text-[#6B5B4E]">
        Loading workspace context...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6EDE2] text-[#3A2B23] flex flex-col font-sans">
      
      {/* 1. Full-Width Sticky --paper Nav Bar with Sprockets Detail */}
      <header className="sticky top-0 z-40 w-full bg-[#F6EDE2] border-b border-[#3A2B23]/10">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2">
              <span className="font-serif italic text-2xl font-medium tracking-tight text-[#3A2B23]">
                Studioz <span className="inline-block w-2 h-2 rounded-full bg-[#C17B72]"></span>
              </span>
            </a>
          </div>

          <div className="flex items-center gap-4">
            {/* License Badge */}
            <span className="px-3 py-1 rounded-full text-xs font-semibold border border-[#3A2B23]/20 text-[#6B5B4E]">
              PRO STUDIO
            </span>

            {/* Avatar & Logout */}
            <div className="flex items-center gap-3 border-l border-[#3A2B23]/10 pl-4">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-[#3A2B23]">{user.firstName} {user.lastName}</div>
                <div className="text-[10px] text-[#6B5B4E] uppercase tracking-wider">{user.role}</div>
              </div>
              <button 
                onClick={logout}
                title="Log Out"
                className="p-2 rounded-[3px] border border-[#3A2B23]/15 bg-[#FFFDF9] text-[#6B5B4E] hover:text-[#C17B72] transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Signature Motif: Film Sprocket Holes along bottom edge */}
        <div className="w-full h-2 bg-[#3A2B23] flex justify-around items-center px-4 overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className="w-2.5 h-1 bg-[#F6EDE2] rounded-[1px] opacity-70" />
          ))}
        </div>
      </header>

      {/* 2. Single Horizontal Stat Strip directly under navbar */}
      <section className="w-full max-w-7xl mx-auto px-8 pt-8">
        <div className="w-full bg-[#EFE2D2]/60 border border-[#3A2B23]/10 rounded-[3px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#3A2B23]/10">
          
          {/* Chip 1: Storage Used */}
          <div className="p-4 space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6B5B4E]">Storage Used</div>
            <div className="text-sm font-bold text-[#3A2B23]">{storageUsage}</div>
            <div className="w-full bg-[#3A2B23]/10 rounded-full h-1.5 overflow-hidden">
              <div className="bg-[#C17B72] h-full w-[1%]" />
            </div>
          </div>

          {/* Chip 2: Relay Tunnel */}
          <div className="p-4 space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6B5B4E]">Relay Tunnel</div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#8A9678] animate-pulse" />
              <span className="font-mono text-xs text-[#B4863F] truncate">{activeTunnel}</span>
            </div>
          </div>

          {/* Chip 3: Watermark Text */}
          <div className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B5B4E]">Watermark Text</span>
              {!isEditingWatermark && (
                <button onClick={handleEditWatermarkClick} className="text-[10px] text-[#C17B72] hover:underline font-semibold">
                  Edit
                </button>
              )}
            </div>
            {isEditingWatermark ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={tempWatermark}
                  onChange={(e) => setTempWatermark(e.target.value)}
                  className="px-2 py-0.5 text-xs bg-[#FFFDF9] border border-[#3A2B23]/20 rounded-[3px] text-[#3A2B23]"
                />
                <button onClick={handleSaveWatermark} disabled={updatingWatermark} className="px-2 py-0.5 bg-[#C17B72] text-[#FFFDF9] text-[10px] font-medium rounded-[3px]">
                  Save
                </button>
              </div>
            ) : (
              <div className="text-xs font-semibold text-[#3A2B23]">{watermark}</div>
            )}
          </div>

          {/* Chip 4: License Status */}
          <div className="p-4 space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6B5B4E]">License Status</div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-[#B4863F]/15 border border-[#B4863F]/30 text-[#B4863F] text-[10px] font-semibold rounded-[3px]">
                PRO TIER
              </span>
              <span className="font-mono text-[11px] text-[#6B5B4E]">LIC-STAGE-••••</span>
            </div>
          </div>

        </div>
      </section>

      {/* 3. Hero & Wedding Albums Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-8 space-y-6">
        
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif italic text-3xl font-medium text-[#3A2B23] tracking-tight">
              Your albums <span className="text-sm font-sans not-italic text-[#6B5B4E]">({albums.length})</span>
            </h1>
            <p className="text-xs text-[#6B5B4E] mt-0.5">Manage collections, view sync loads, and share links with clients.</p>
          </div>

          {/* Search & Filter Pills */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search albums..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3.5 py-1.5 rounded-[3px] bg-[#FFFDF9] border border-[#3A2B23]/15 text-[#3A2B23] placeholder-[#6B5B4E]/50 text-xs focus:outline-none focus:border-[#C17B72]"
            />
            <div className="flex items-center bg-[#EFE2D2] p-0.5 rounded-[3px] border border-[#3A2B23]/10">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 text-xs font-medium rounded-[2px] transition-colors ${statusFilter === 'ALL' ? 'bg-[#FFFDF9] text-[#3A2B23] shadow-xs' : 'text-[#6B5B4E]'}`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('SELECTED')}
                className={`px-3 py-1 text-xs font-medium rounded-[2px] transition-colors ${statusFilter === 'SELECTED' ? 'bg-[#FFFDF9] text-[#3A2B23] shadow-xs' : 'text-[#6B5B4E]'}`}
              >
                Selected
              </button>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`px-3 py-1 text-xs font-medium rounded-[2px] transition-colors ${statusFilter === 'PENDING' ? 'bg-[#FFFDF9] text-[#3A2B23] shadow-xs' : 'text-[#6B5B4E]'}`}
              >
                Pending
              </button>
            </div>
          </div>
        </div>

        {/* Polaroid Album Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* First Grid Item: Dashed Polaroid "+" Trigger Card (Acts as both empty state and create trigger) */}
          <div
            onClick={() => setShowModal(true)}
            className="polaroid-card bg-[#FFFDF9] border-2 border-dashed border-[#3A2B23]/20 hover:border-[#C17B72] p-8 rounded-[3px] flex flex-col items-center justify-center text-center cursor-pointer min-h-[320px] transition-all group"
          >
            <div className="w-14 h-14 rounded-full bg-[#EFE2D2] text-[#3A2B23] group-hover:bg-[#C17B72] group-hover:text-[#FFFDF9] flex items-center justify-center transition-colors mb-4 shadow-sm">
              <Plus className="h-6 w-6" />
            </div>
            <h3 className="font-serif italic text-lg text-[#3A2B23] font-medium group-hover:text-[#C17B72] transition-colors">
              Create New Album
            </h3>
            <p className="text-xs text-[#6B5B4E] mt-1 max-w-[200px] leading-relaxed">
              The next photo waiting to be taken. Click to set up a client gallery.
            </p>
          </div>

          {/* Existing Album Cards */}
          {filteredAlbums.map((album) => (
            <div 
              key={album.id} 
              className="polaroid-card bg-[#FFFDF9] border border-[#3A2B23]/10 p-5 rounded-[3px] flex flex-col justify-between"
            >
              <div>
                {/* 4:3 Aspect Cover Photo Frame */}
                <div className="relative aspect-[4/3] w-full bg-[#EFE2D2] rounded-[2px] overflow-hidden mb-4 border border-[#3A2B23]/10">
                  <div className="absolute inset-0 flex items-center justify-center text-[#6B5B4E]">
                    <span className="font-serif italic text-2xl font-medium opacity-40">{album.name.charAt(0)}</span>
                  </div>

                  {/* Privacy Badge */}
                  <span className={`absolute top-2.5 right-2.5 px-2.5 py-1 rounded-[2px] text-[10px] font-semibold shadow-xs ${
                    album.isPrivate 
                      ? 'bg-[#3A2B23] text-[#F6EDE2]' 
                      : 'bg-[#8A9678] text-[#FFFDF9]'
                  }`}>
                    {album.isPrivate ? '🔒 Private' : 'Public'}
                  </span>
                </div>

                {/* Meta Header */}
                <div className="flex items-center justify-between text-[11px] text-[#6B5B4E] mb-1">
                  <span>{new Date(album.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span className={`font-semibold ${album.status === 'SUBMITTED' ? 'text-[#8A9678]' : 'text-[#6B5B4E]'}`}>
                    {album.status || 'PENDING'}
                  </span>
                </div>

                {/* Album Title */}
                <h3 className="font-serif italic text-xl text-[#3A2B23] font-medium tracking-tight truncate">
                  {album.name}
                </h3>
                <p className="text-xs text-[#6B5B4E] line-clamp-2 mt-1 min-h-[32px]">
                  {album.description || 'No description provided.'}
                </p>

                {/* Progress Bar & Selection Count */}
                <div className="mt-4 pt-3 border-t border-[#3A2B23]/10 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-[#6B5B4E]">
                    <span>Selection progress</span>
                    <span className="font-medium text-[#3A2B23]">{album._count?.images || 0} of {album.totalImages || 100} selected</span>
                  </div>
                  <div className="w-full bg-[#3A2B23]/10 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-[#8A9678] h-full rounded-full transition-all" 
                      style={{ width: `${Math.min(100, Math.round(((album._count?.images || 0) / (album.totalImages || 1)) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Row */}
              <div className="flex items-center justify-between border-t border-[#3A2B23]/10 pt-3 mt-4">
                <button
                  onClick={() => handleCopyLink(album.slug)}
                  className="flex items-center gap-1.5 text-xs text-[#6B5B4E] hover:text-[#C17B72] transition-colors font-medium cursor-pointer"
                >
                  {copiedSlug === album.slug ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[#8A9678]" />
                      <span className="text-[#8A9678]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Client Link</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeleteAlbum(album.id)}
                    className="p-1.5 text-[#6B5B4E] hover:text-[#B5564A] transition-colors cursor-pointer"
                    title="Delete Album"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

        </div>

      </main>

      {/* Crisp-Overlay Album Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3A2B23]/40 px-6">
          <div className="paper-card bg-[#FFFDF9] border border-[#3A2B23]/10 w-full max-w-lg p-8 rounded-[3px] shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#3A2B23]/10 pb-4">
              <h3 className="font-serif italic text-2xl text-[#3A2B23] font-medium">Create Client Album</h3>
              <button onClick={() => setShowModal(false)} className="text-[#6B5B4E] hover:text-[#3A2B23]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAlbum} className="space-y-4">
              {formError && (
                <div className="p-3 bg-[#B5564A]/10 border-l-3 border-[#B5564A] text-xs text-[#B5564A]">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#6B5B4E] uppercase tracking-wider mb-1.5">Album Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul & Priya Wedding"
                  value={albumName}
                  onChange={(e) => {
                    setAlbumName(e.target.value);
                    setAlbumSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                  }}
                  className="w-full px-4 py-2.5 rounded-[3px] bg-[#FFFDF9] border border-[#3A2B23]/15 text-[#3A2B23] text-sm focus:outline-none focus:border-[#C17B72]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B5B4E] uppercase tracking-wider mb-1.5">Description (Optional)</label>
                <textarea
                  placeholder="Ceremony and reception photos..."
                  value={albumDesc}
                  onChange={(e) => setAlbumDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-[3px] bg-[#FFFDF9] border border-[#3A2B23]/15 text-[#3A2B23] text-sm focus:outline-none focus:border-[#C17B72] h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#6B5B4E] uppercase tracking-wider mb-1.5">Client Passcode</label>
                  <input
                    type="text"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-[3px] bg-[#FFFDF9] border border-[#3A2B23]/15 text-[#3A2B23] text-sm focus:outline-none focus:border-[#C17B72]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B5B4E] uppercase tracking-wider mb-1.5">Local Watch Folder</label>
                  <input
                    type="text"
                    placeholder="e.g. Wedding_Folder_01"
                    value={localFolderName}
                    onChange={(e) => setLocalFolderName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-[3px] bg-[#FFFDF9] border border-[#3A2B23]/15 text-[#3A2B23] text-sm focus:outline-none focus:border-[#C17B72]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-[#3A2B23]/10">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-6 py-2.5 rounded-[3px] bg-[#C17B72] hover:bg-[#b06a61] text-[#FFFDF9] text-xs font-medium cursor-pointer"
                >
                  {isCreating ? 'Creating Album...' : 'Create Album'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-xs text-[#6B5B4E] hover:text-[#3A2B23]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
