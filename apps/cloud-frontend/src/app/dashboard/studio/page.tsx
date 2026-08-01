'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Camera, 
  Plus, 
  ExternalLink, 
  Settings, 
  Database, 
  ShieldCheck, 
  Users, 
  Image as ImageIcon,
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
  const [completedToast, setCompletedToast] = useState<{ name: string; total: number } | null>(null);

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

  const handleViewAlbumDetails = async (albumId: string) => {
    setFetchingDetails(true);
    try {
      const res = await api.get(`/albums/${albumId}`);
      if (res.data?.success) {
        setSelectedAlbumDetails(res.data.album);
      }
    } catch (err) {
      console.error('Failed to fetch album details', err);
      alert('Failed to load album details.');
    } finally {
      setFetchingDetails(false);
    }
  };

  const handleExportFilenames = (format: 'lightroom' | 'explorer' = 'lightroom') => {
    if (!selectedAlbumDetails) return;
    const selectedNames = selectedAlbumDetails.images
      .filter((img: any) => img.selections?.some((s: any) => s.isSelected))
      .map((img: any) => {
        return img.filename;
      });

    if (selectedNames.length === 0) {
      alert("No images have been selected by the client yet.");
      return;
    }

    let exportText = '';
    if (format === 'explorer') {
      exportText = selectedNames.join(' OR ');
    } else {
      exportText = selectedNames.join(', ');
    }

    navigator.clipboard.writeText(exportText);
    alert(`Copied selection to clipboard in ${format === 'explorer' ? 'Windows Explorer' : 'Lightroom'} format!`);
  };

  const [exportingFolder, setExportingFolder] = useState(false);

  const handleExportToFolder = async () => {
    if (!selectedAlbumDetails) return;
    const selectedNames = selectedAlbumDetails.images
      .filter((img: any) => img.selections?.some((s: any) => s.isSelected))
      .map((img: any) => {
        return img.filename;
      });

    if (selectedNames.length === 0) {
      alert("No images have been selected by the client yet.");
      return;
    }

    setExportingFolder(true);
    try {
      const res = await fetch('http://localhost:8082/export-selected', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumId: selectedAlbumDetails.id,
          filenames: selectedNames,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`Successfully copied ${selectedNames.length} selected files to the 'Selected_Photos' subfolder inside your local folder!`);
      } else {
        alert(`Failed to copy files: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to export selected files', err);
      alert('Failed to connect to local agent. Please ensure the agent is running.');
    } finally {
      setExportingFolder(false);
    }
  };

  const handleToggleAlbumStatus = async (newStatus: 'PENDING' | 'COMPLETED') => {
    if (!selectedAlbumDetails) return;
    try {
      const res = await api.put(`/albums/${selectedAlbumDetails.id}`, {
        status: newStatus,
      });

      if (res.data?.success) {
        setSelectedAlbumDetails({
          ...selectedAlbumDetails,
          status: newStatus,
        });
        loadDashboardData();
        alert(`Album status successfully updated to ${newStatus === 'COMPLETED' ? 'Locked (Finalized)' : 'Re-Opened'}.`);
      }
    } catch (err) {
      console.error('Failed to toggle album status', err);
      alert('Failed to update album status.');
    }
  };

  // Studio profile metrics
  const [storageUsage, setStorageUsage] = useState<string>('0 B');
  const [activeTunnel, setActiveTunnel] = useState<string>('Tunnel Offline');
  const [watermark, setWatermark] = useState('PhotoSelect');
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
        alert('Watermark text updated successfully! Your agent will pull the update automatically on the next heartbeat.');
      }
    } catch (err) {
      console.error('Failed to save watermark settings', err);
      alert('Failed to update watermark text.');
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
      // 1. Fetch albums
      const albumRes = await api.get('/albums');
      if (albumRes.data?.success) {
        setAlbums(albumRes.data.albums);
      }

      // 2. Fetch studio settings
      try {
        const settingsRes = await api.get('/studios/settings');
        if (settingsRes.data?.success) {
          setWatermark(settingsRes.data.settings.watermarkText || (user.firstName + ' Photography'));
        } else {
          setWatermark(user.firstName + ' Photography');
        }
      } catch (err) {
        console.error('Failed to load settings', err);
        setWatermark(user.firstName + ' Photography');
      }

      setStorageUsage('2.4 MB (0.01%)');
      setActiveTunnel('http://localhost:8082');

      // 3. Fetch real studio client events
      try {
        const eventsRes = await api.get('/albums/studio/events');
        if (eventsRes.data?.success) {
          const formattedEvents = eventsRes.data.events.map((ev: any) => {
            let details = '';
            if (ev.name === 'CLIENT_ACCESSED') {
              details = `Client opened gallery for "${ev.album?.name || 'Album'}"`;
            } else if (ev.name === 'SELECTION_UPDATED') {
              details = `Client selected/favorited image in "${ev.album?.name || 'Album'}"`;
            } else if (ev.name === 'SELECTION_COMPLETED') {
              details = `Client submitted selections for "${ev.album?.name || 'Album'}"`;
            } else if (ev.name === 'AGENT_HEARTBEAT') {
              details = `Local agent sync heartbeat completed`;
            } else {
              details = `Activity logged on "${ev.album?.name || 'Album'}"`;
            }

            const evDate = new Date(ev.createdAt);
            const diffMs = Date.now() - evDate.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            let timeStr = evDate.toLocaleDateString();
            if (diffMins < 60) {
              timeStr = diffMins <= 0 ? 'just now' : `${diffMins}m ago`;
            } else {
              const diffHrs = Math.floor(diffMins / 60);
              if (diffHrs < 24) {
                timeStr = `${diffHrs}h ago`;
              }
            }

            return {
              id: ev.id,
              name: ev.name,
              details,
              time: timeStr,
            };
          });
          setEvents(formattedEvents);
        }
      } catch (err) {
        console.error('Failed to load activity events', err);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setFetchingAlbums(false);
    }
  };

  const pollSyncStatus = async () => {
    try {
      const albumRes = await api.get('/albums');
      if (albumRes.data?.success) {
        const newAlbums = albumRes.data.albums;

        // Detect completed syncs for success toast pop-up
        setAlbums((prevAlbums) => {
          if (prevAlbums.length > 0) {
            for (const newAlb of newAlbums) {
              const oldAlb = prevAlbums.find((a) => a.id === newAlb.id);
              if (oldAlb) {
                const oldSynced = oldAlb._count?.images || 0;
                const oldTotal = oldAlb.totalImages;
                const newSynced = newAlb._count?.images || 0;
                const newTotal = newAlb.totalImages;

                const wasSyncing = oldTotal > 0 && oldSynced < oldTotal;
                const isFinished = newTotal > 0 && newSynced >= newTotal;

                if (wasSyncing && isFinished) {
                  setCompletedToast({ name: newAlb.name, total: newTotal });
                  setTimeout(() => setCompletedToast(null), 5000);
                }
              }
            }
          }
          return newAlbums;
        });
      }
    } catch (err) {
      console.error('Silent sync poll failed', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadDashboardData();

      // Poll silently in the background every 5 seconds (keeps rate limit safe!)
      const interval = setInterval(() => {
        pollSyncStatus();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [user]);

  const [refreshingAlbumId, setRefreshingAlbumId] = useState<string | null>(null);

  const handleManualRefresh = async (albumId: string) => {
    setRefreshingAlbumId(albumId);
    try {
      // Trigger scan on local agent directly
      await axios.post(`http://localhost:8082/albums/${albumId}/scan`);
    } catch (err) {
      console.error('Local agent scan trigger failed', err);
    }
    
    // Refresh dashboard values to update UI state
    await loadDashboardData();
    
    setTimeout(() => {
      setRefreshingAlbumId(null);
    }, 2000);
  };

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

        // Auto-register folder with agent in the background
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
          } catch (agentErr) {
            console.error('Failed to link local folder with agent', agentErr);
          }
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

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#08080a] flex items-center justify-center text-zinc-400">
        Loading workspace context...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080a] text-zinc-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-white/5 bg-[#0d0d11]/50 backdrop-blur-md px-8 py-5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Camera className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Photo<span className="text-indigo-400">Select</span> Studio Dashboard
          </span>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-sm font-semibold text-white">{user.firstName} {user.lastName}</div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider">{user.role}</div>
          </div>
          <button 
            onClick={logout}
            className="p-2.5 rounded-xl border border-white/5 bg-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-10 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Column - Metrics Panel */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Card 1: Studio Details */}
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Database className="h-4 w-4 text-indigo-400" />
              <span>Studio Workspace</span>
            </h3>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-zinc-500">Storage Used</div>
                <div className="text-lg font-bold text-white mt-0.5">{storageUsage}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Relay Tunnel</div>
                <div className="text-xs font-mono text-indigo-300 mt-1 break-all bg-indigo-500/5 p-2 rounded-lg border border-indigo-500/10">
                  {activeTunnel}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-zinc-500">Watermark Text</div>
                  {!isEditingWatermark ? (
                    <button
                      onClick={handleEditWatermarkClick}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                    >
                      Edit
                    </button>
                  ) : null}
                </div>
                {isEditingWatermark ? (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <input
                      type="text"
                      value={tempWatermark}
                      onChange={(e) => setTempWatermark(e.target.value)}
                      className="flex-1 text-xs text-white bg-white/5 border border-white/10 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 min-w-0"
                    />
                    <button
                      onClick={handleSaveWatermark}
                      disabled={updatingWatermark}
                      className="px-2 py-1 bg-indigo-600 text-white rounded text-[10px] font-semibold cursor-pointer hover:bg-indigo-500 disabled:opacity-50 shrink-0"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingWatermark(false)}
                      className="px-2 py-1 bg-zinc-800 text-zinc-400 border border-white/5 rounded text-[10px] font-semibold cursor-pointer hover:text-white shrink-0"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="text-sm font-medium text-zinc-300 mt-1">{watermark}</div>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: License / Plan */}
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-400" />
              <span>License Status</span>
            </h3>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-zinc-500">Active Plan</div>
                <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Trial Active
                </span>
              </div>
              <div>
                <div className="text-xs text-zinc-500">License Key</div>
                <div className="text-xs font-mono text-zinc-400 mt-1 break-all bg-white/5 p-2 rounded-lg">
                  LIC-STAGE-PS-E8934B
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Recent Activity Log */}
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-400" />
              <span>Recent Activity</span>
            </h3>
            <div className="space-y-4">
              {events.map((ev) => (
                <div key={ev.id} className="text-xs border-b border-white/5 pb-2.5 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between text-zinc-500 font-mono mb-1">
                    <span>{ev.name}</span>
                    <span>{ev.time}</span>
                  </div>
                  <p className="text-zinc-300">{ev.details}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column - Album Management */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
                <ImageIcon className="h-6 w-6 text-indigo-400" />
                <span>Wedding Albums</span>
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">Manage collections, view sync loads, and share links with clients.</p>
            </div>
            <button 
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors cursor-pointer shadow-lg shadow-indigo-600/10"
            >
              <Plus className="h-4 w-4" />
              <span>Create Album</span>
            </button>
          </div>

          {/* Album List container */}
          {fetchingAlbums ? (
            <div className="glass-panel p-12 text-center text-zinc-500">
              Fetching album nodes...
            </div>
          ) : albums.length === 0 ? (
            <div className="glass-panel p-16 text-center border-dashed">
              <ImageIcon className="h-10 w-10 text-zinc-600 mx-auto mb-4" />
              <h4 className="text-zinc-400 font-bold mb-1">No albums found</h4>
              <p className="text-zinc-600 text-xs max-w-sm mx-auto mb-6">Create your first client album and use the Studio Agent to sync photos from your computer.</p>
              <button 
                onClick={() => setShowModal(true)}
                className="bg-indigo-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl"
              >
                Create Album
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {albums.map((album) => (
                <div key={album.id} className="glass-panel p-6 rounded-2xl flex flex-col justify-between hover:border-indigo-500/30 transition-colors">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-zinc-500">
                        {new Date(album.createdAt).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          album.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : album.status === 'SUBMITTED'
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                        }`}>
                          {album.status || 'PENDING'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${album.isPrivate ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          {album.isPrivate ? 'Private' : 'Public'}
                        </span>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-white">{album.name}</h3>
                    <p className="text-zinc-400 text-xs mt-1 min-h-[32px] line-clamp-2">
                      {album.description || 'No description provided.'}
                    </p>

                    {/* Sync Status Section */}
                    <div className="mt-4">
                      {album.status === 'SCANNING' || album.status === 'PROCESSING' || album.status === 'SYNCING' || (album.totalImages > 0 && (album._count?.images || 0) < album.totalImages) ? (
                        /* Actively Syncing / Processing / Scanning state */
                        <div>
                          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5 font-sans-custom">
                            <span className="flex items-center gap-1.5">
                              <RefreshCw className="h-3.5 w-3.5 text-indigo-400 animate-spin" style={{ animationDuration: '3s' }} />
                              <span>
                                {album.status === 'SCANNING' ? 'Scanning folder...' :
                                 album.status === 'PROCESSING' ? 'Processing previews...' :
                                 `Syncing: ${album._count?.images || 0} / ${album.totalImages}`}
                              </span>
                            </span>
                            {album.totalImages > 0 && (
                              <span className="font-semibold text-indigo-300">
                                {Math.round(((album._count?.images || 0) / album.totalImages) * 100)}%
                              </span>
                            )}
                          </div>
                          {album.totalImages > 0 && (
                            <div className="w-full bg-white/5 border border-white/5 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-indigo-500 to-violet-500 h-1.5 rounded-full transition-all duration-500" 
                                style={{ width: `${Math.min(100, Math.round(((album._count?.images || 0) / album.totalImages) * 100))}%` }}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Idle / Completed state */
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                            {album.totalImages > 0 && (album._count?.images || 0) >= album.totalImages ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                                <span className="text-zinc-400">{album._count?.images || 0} images synced (Completed)</span>
                              </>
                            ) : (
                              <>
                                <ImageIcon className="h-3.5 w-3.5" />
                                <span>{album._count?.images || 0} images synced</span>
                              </>
                            )}
                          </div>
                          
                          {/* Manual refresh button for this album card */}
                          <button
                            onClick={() => handleManualRefresh(album.id)}
                            disabled={fetchingAlbums || refreshingAlbumId === album.id}
                            className="p-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1 text-[10px] font-semibold"
                            title="Check Sync Status"
                          >
                            <RefreshCw className={`h-3 w-3 ${fetchingAlbums || refreshingAlbumId === album.id ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-6">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => handleCopyLink(album.slug)}
                        className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-semibold cursor-pointer"
                      >
                        {copiedSlug === album.slug ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy Client Link</span>
                          </>
                        )}
                      </button>

                      <button 
                        onClick={() => handleViewAlbumDetails(album.id)}
                        disabled={fetchingDetails}
                        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors font-semibold cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View Selections</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleDeleteAlbum(album.id)}
                        className="p-2 rounded bg-red-500/5 border border-red-500/10 text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>

      {/* Creation Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
          <div className="glass-panel w-full max-w-lg p-8 rounded-2xl space-y-6">
            <h3 className="text-xl font-bold text-white">Create New Album</h3>

            <form onSubmit={handleCreateAlbum} className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-xs text-red-400 rounded-lg">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Album Name</label>
                <input
                  type="text"
                  required
                  placeholder="Summer Wedding 2026"
                  value={albumName}
                  onChange={(e) => {
                    setAlbumName(e.target.value);
                    setAlbumSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-colors text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Description</label>
                <textarea
                  placeholder="Wedding Ceremony of John and Jane"
                  value={albumDesc}
                  onChange={(e) => setAlbumDesc(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-colors text-sm h-20 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">URL Slug</label>
                <input
                  type="text"
                  required
                  placeholder="john-jane-2026"
                  value={albumSlug}
                  onChange={(e) => setAlbumSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-colors text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Local Folder Name (Auto-Sync)</label>
                <input
                  type="text"
                  placeholder="e.g. wedding_emma (creates in Pictures)"
                  value={localFolderName}
                  onChange={(e) => setLocalFolderName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-colors text-sm"
                />
                <p className="text-[10px] text-zinc-500 mt-1">The local agent will automatically create and watch this folder inside C:\Users\adhav\Pictures.</p>
              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-2 transition-colors"
                >
                  {isCreating ? 'Creating...' : 'Create Album'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selection Viewer Modal Overlay */}
      {selectedAlbumDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-6 overflow-y-auto animate-fade-in">
          <div className="glass-panel w-full max-w-4xl p-8 rounded-2xl space-y-6 max-h-[90vh] flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white">{selectedAlbumDetails.name}</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Synced: {selectedAlbumDetails.images?.length || 0} images • Created: {new Date(selectedAlbumDetails.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button 
                onClick={() => setSelectedAlbumDetails(null)}
                className="p-2 rounded-lg bg-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-2">
              {/* Selected stats bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-xl gap-4">
                <div className="text-sm text-zinc-300">
                  Total Selected: <span className="font-bold text-white">
                    {selectedAlbumDetails.images?.filter((img: any) => img.selections?.some((s: any) => s.isSelected)).length || 0}
                  </span> photos
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleExportFilenames('lightroom')}
                    className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2.5 rounded-lg font-semibold transition-colors cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy for Lightroom / Capture One</span>
                  </button>
                  <button
                    onClick={() => handleExportFilenames('explorer')}
                    className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white px-3.5 py-2.5 rounded-lg font-semibold transition-colors cursor-pointer border border-white/5"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy for Windows Search (OR)</span>
                  </button>
                  <button
                    onClick={handleExportToFolder}
                    disabled={exportingFolder}
                    className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2.5 rounded-lg font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    <span>{exportingFolder ? 'Copying files...' : 'Copy to "Selected_Photos" Folder'}</span>
                  </button>

                  {/* Status Finalize Toggles */}
                  {selectedAlbumDetails.status === 'COMPLETED' ? (
                    <button
                      onClick={() => handleToggleAlbumStatus('PENDING')}
                      className="flex items-center gap-1.5 text-xs bg-yellow-600 hover:bg-yellow-500 text-white px-3.5 py-2.5 rounded-lg font-semibold transition-colors cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Re-Open Selection (Unlock)</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleAlbumStatus('COMPLETED')}
                      className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2.5 rounded-lg font-semibold transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Finalize & Lock Selection</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Photo list */}
              {selectedAlbumDetails.images?.length === 0 ? (
                <div className="text-center py-10 text-zinc-500">
                  No images synced in this album yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {selectedAlbumDetails.images?.map((img: any) => {
                    const isFav = img.selections?.some((s: any) => s.isFavorite);
                    const isSel = img.selections?.some((s: any) => s.isSelected);
                    const commentsCount = img.comments?.length || 0;

                    // Compute stream URL
                    const localPreview = `http://localhost:8082/stream/file/${selectedAlbumDetails.id}/${img.filename}?size=thumbnail`;

                    return (
                      <div key={img.id} className="relative rounded-xl border border-white/5 bg-[#0d0d11] overflow-hidden p-2 flex flex-col justify-between space-y-2 group">
                        <div className="aspect-square w-full rounded-lg overflow-hidden bg-zinc-950 relative">
                          <img 
                            src={localPreview} 
                            alt={img.filename} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1519741497674-611481863552?w=150&auto=format&fit=crop&q=60`;
                            }}
                          />
                          {/* Badges */}
                          <div className="absolute top-2 right-2 flex items-center gap-1">
                            {isFav && (
                              <div className="p-1 rounded bg-rose-500/90 text-white">
                                <Heart className="h-3 w-3" fill="currentColor" />
                              </div>
                            )}
                            {isSel && (
                              <div className="p-1 rounded bg-emerald-500/90 text-white text-[10px] font-bold flex items-center justify-center">
                                <Check className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="px-1">
                          <div className="text-[10px] font-mono text-zinc-400 truncate" title={img.filename}>
                            {img.filename}
                          </div>
                          {commentsCount > 0 && (
                            <div className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1">
                              <span>💬 {commentsCount} comment{commentsCount > 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-white/5 pt-4 flex justify-end">
              <button
                onClick={() => setSelectedAlbumDetails(null)}
                className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Syncing Progress Toast */}
      {albums
        .filter((album) => album.totalImages > 0 && (album._count?.images || 0) < album.totalImages)
        .map((album) => {
          const synced = album._count?.images || 0;
          const total = album.totalImages;
          const pct = Math.round((synced / total) * 100);

          return (
            <div key={album.id} className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#18041c]/95 border border-indigo-500/30 p-4 rounded-2xl shadow-2xl animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                  <RefreshCw className="h-5 w-5 animate-spin" style={{ animationDuration: '3s' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">Syncing "{album.name}"</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">Uploading previews from your folder...</p>
                  
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2 font-mono">
                    <span>{synced} / {total} photos</span>
                    <span className="text-indigo-400 font-bold">{pct}%</span>
                  </div>
                  
                  <div className="w-full bg-white/5 border border-white/5 rounded-full h-1 mt-1.5 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-indigo-500 to-violet-500 h-1 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

      {/* Floating Completed Sync Success Toast */}
      {completedToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#18041c]/95 border border-emerald-500/30 p-4 rounded-2xl shadow-2xl animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <Check className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-white truncate">Sync Complete!</h4>
              <p className="text-xs text-zinc-400 mt-0.5">"{completedToast.name}" is fully updated.</p>
              <p className="text-[10px] text-emerald-400 font-bold mt-1">✓ {completedToast.total} photos uploaded successfully</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
