'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Camera, 
  Heart, 
  CheckCircle, 
  MessageSquare, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Lock, 
  Loader2,
  Check,
  Send
} from 'lucide-react';
import { api } from '../../../lib/api';

interface Image {
  id: string;
  filename: string;
  localPath: string;
  relativeStream: string;
  hash: string;
  width: number;
  height: number;
  fileSize: string;
  exifData: any;
  syncState: string;
  selections?: Selection[];
  _count?: {
    comments: number;
  };
}

interface Selection {
  id: string;
  imageId: string;
  clientId: string;
  isFavorite: boolean;
  isSelected: boolean;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  authorId: string;
}

export default function GalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const { slug } = use(params);

  // Gallery Details
  const [album, setAlbum] = useState<any>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAgentOnline, setIsAgentOnline] = useState<boolean>(true);

  // Client Session Context
  const [clientId, setClientId] = useState<string>('');
  const [passcode, setPasscode] = useState('');
  const [passcodeRequired, setPasscodeRequired] = useState(false);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [verifyingPasscode, setVerifyingPasscode] = useState(false);

  // Active Lightbox Overlay
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  
  // Comments Drawer
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [activeComments, setActiveComments] = useState<Comment[]>([]);
  const [postingComment, setPostingComment] = useState(false);

  // Tunnel stream base
  const [streamBase, setStreamBase] = useState<string>('');

  // Submit Selection States
  const [submittingSelection, setSubmittingSelection] = useState(false);
  const [selectionSubmitted, setSelectionSubmitted] = useState(false);

  // Responsive mobile screen state detection
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSubmitSelection = async () => {
    const selectedCount = images.filter(img => img.selections?.some(s => s.clientId === clientId && s.isSelected)).length;
    if (selectedCount === 0) {
      alert("Please select at least one photo before submitting.");
      return;
    }

    if (!confirm(`Are you sure you want to submit your selection of ${selectedCount} photos? This will notify your photographer.`)) {
      return;
    }

    setSubmittingSelection(true);
    try {
      await api.post(`/albums/slug/${slug}/submit`, { clientId, selectedCount });
      setSelectionSubmitted(true);
      alert("Your selection has been successfully sent to the studio!");
    } catch (err) {
      console.error("Failed to submit selection", err);
      alert("Failed to submit selection. Please try again.");
    } finally {
      setSubmittingSelection(false);
    }
  };

  useEffect(() => {
    // Generate simple local client UUID if not exists
    let id = localStorage.getItem('ps_client_uuid');
    if (!id) {
      id = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('ps_client_uuid', id);
    }
    setClientId(id);
  }, []);

  const loadGallery = async (bypassPasscodeCheck = false) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Initial access check
      const accessRes = await api.post(`/albums/slug/${slug}/access`, { passcode });
      
      if (!accessRes.data?.authenticated) {
        setPasscodeRequired(true);
        setLoading(false);
        return;
      }

      setPasscodeRequired(false);

      // 2. Fetch Album details
      const albumRes = await api.get(`/albums/slug/${slug}`);
      if (albumRes.data?.success) {
        // Since slug endpoints are public, they return the album structure.
        // If not in the public database, let's fetch by slug or fallback
        const albumData = albumRes.data.album;
        setAlbum(albumData);
        setImages(albumData.images || []);
        setIsAgentOnline(albumRes.data.isAgentOnline ?? true);
        
        // Setup stream URL based on Studio configuration
        let tunnelUrl = albumRes.data.tunnelUrl;
        if (!tunnelUrl || tunnelUrl === 'https://studio-relay.trycloudflare.com') {
          tunnelUrl = 'http://localhost:8082';
        }
        setStreamBase(`${tunnelUrl}/stream`);
      }
    } catch (err: any) {
      if (err.response?.status === 400 || err.response?.status === 401) {
        setPasscodeRequired(true);
      } else {
        setError(err.response?.data?.message || 'Failed to load gallery. Please verify the URL.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) {
      loadGallery();
    }
  }, [slug]);

  const handlePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError(null);
    setVerifyingPasscode(true);

    try {
      const accessRes = await api.post(`/albums/slug/${slug}/access`, { passcode });
      if (accessRes.data?.authenticated) {
        loadGallery();
      } else {
        setPasscodeError('Incorrect passcode. Please try again.');
      }
    } catch (err: any) {
      setPasscodeError('Error validating passcode.');
    } finally {
      setVerifyingPasscode(false);
    }
  };

  const handleSelectToggle = async (image: Image, type: 'isSelected' | 'isFavorite') => {
    if (album?.status === 'COMPLETED') {
      alert("This gallery selection is finalized and locked by the studio. Selections can no longer be edited.");
      return;
    }
    try {
      const activeSelection = image.selections?.find((s) => s.clientId === clientId);
      const isSelected = type === 'isSelected' ? !activeSelection?.isSelected : activeSelection?.isSelected || false;
      const isFavorite = type === 'isFavorite' ? !activeSelection?.isFavorite : activeSelection?.isFavorite || false;

      // Update state immediately (optimistic update)
      setImages((prev) =>
        prev.map((img) => {
          if (img.id === image.id) {
            const updatedSelections = [...(img.selections || [])];
            const idx = updatedSelections.findIndex((s) => s.clientId === clientId);
            if (idx > -1) {
              updatedSelections[idx] = { ...updatedSelections[idx], isSelected, isFavorite };
            } else {
              updatedSelections.push({ id: 'temp', imageId: image.id, clientId, isSelected, isFavorite });
            }
            return { ...img, selections: updatedSelections };
          }
          return img;
        })
      );

      // Call REST api
      await api.post(`/client/images/${image.id}/select`, {
        clientId,
        isSelected,
        isFavorite,
      });
    } catch (err) {
      console.error('Failed to update image selection', err);
    }
  };

  const loadComments = async (imageId: string) => {
    try {
      const res = await api.get(`/client/images/${imageId}/comments`);
      if (res.data?.success) {
        setActiveComments(res.data.comments);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e: React.FormEvent, imageId: string) => {
    e.preventDefault();
    if (album?.status === 'COMPLETED') {
      alert("This gallery is locked. Comments can no longer be added.");
      return;
    }
    if (!commentText.trim()) return;
    setPostingComment(true);

    try {
      const res = await api.post(`/client/images/${imageId}/comments`, {
        authorId: clientId,
        content: commentText,
      });

      if (res.data?.success) {
        setActiveComments((prev) => [...prev, res.data.comment]);
        setCommentText('');
        // Update images list count
        setImages((prev) =>
          prev.map((img) => {
            if (img.id === imageId) {
              return { ...img, _count: { comments: (img._count?.comments || 0) + 1 } };
            }
            return img;
          })
        );
      }
    } catch (err) {
      console.error('Failed to post comment');
    } finally {
      setPostingComment(false);
    }
  };

  const activeImage = activeImageIndex !== null ? images[activeImageIndex] : null;

  // Render Passcode Form Screen
  if (passcodeRequired) {
    return (
      <div className="min-h-screen bg-[#08080a] flex items-center justify-center px-6">
        <div className="glass-panel w-full max-w-sm p-8 rounded-2xl text-center space-y-6">
          <div className="h-12 w-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Private Gallery</h3>
            <p className="text-xs text-zinc-400 mt-1">Please enter the 4-digit passcode to unlock the wedding photos.</p>
          </div>

          <form onSubmit={handlePasscodeSubmit} className="space-y-4">
            {passcodeError && (
              <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-xs text-red-400 rounded-lg">
                {passcodeError}
              </div>
            )}
            <input
              type="password"
              placeholder="••••"
              maxLength={6}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full text-center tracking-[1em] font-mono text-xl px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              type="submit"
              disabled={verifyingPasscode}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-semibold flex items-center justify-center gap-2"
            >
              {verifyingPasscode ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Unlocking...</span>
                </>
              ) : (
                <span>Unlock Gallery</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08080a] flex items-center justify-center text-zinc-500">
        Assembling gallery assets...
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="min-h-screen bg-[#08080a] flex items-center justify-center text-red-400 px-6 text-center">
        {error || 'Album not found.'}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080a] text-zinc-200 font-sans flex flex-col">
      {/* Gallery Header */}
      <header className="border-b border-white/5 bg-[#08080a]/80 backdrop-blur-md sticky top-0 z-30 px-8 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{album.name}</h1>
          <p className="text-xs text-zinc-500 mt-0.5">{album.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {images.length > 0 && (
            album.status === 'COMPLETED' ? (
              <div className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1.5 cursor-default">
                <Lock className="h-3.5 w-3.5" />
                <span>Selection Locked</span>
              </div>
            ) : (
              <button
                onClick={handleSubmitSelection}
                disabled={submittingSelection || selectionSubmitted}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-2 ${
                  selectionSubmitted
                    ? 'bg-emerald-600/10 border-emerald-500/20 text-emerald-400 cursor-default'
                    : 'bg-indigo-600 border-indigo-500 hover:bg-indigo-500 text-white cursor-pointer active:scale-95 disabled:opacity-50'
                }`}
              >
                {submittingSelection ? (
                  <span>Submitting...</span>
                ) : selectionSubmitted ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Selection Submitted</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Submit Selection ({images.filter(img => img.selections?.some(s => s.clientId === clientId && s.isSelected)).length})</span>
                  </>
                )}
              </button>
            )
          )}
          <div className="h-9 w-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Camera className="h-4.5 w-4.5" />
          </div>
        </div>
      </header>

      {album.status === 'COMPLETED' && (
        <div className="bg-emerald-500/5 border-b border-emerald-500/10 px-8 py-3 text-center text-xs text-emerald-400 font-medium flex items-center justify-center gap-2 animate-fade-in">
          <span>🔒 Finalized: This gallery selection is locked. Choices have been sent to the photographer.</span>
        </div>
      )}

      {/* Grid Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {!isAgentOnline && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 flex items-center gap-3 animate-fade-in">
            <Camera className="h-5 w-5 text-amber-400 animate-pulse shrink-0" />
            <div className="text-xs text-amber-200">
              <span className="font-bold">Photographer is offline.</span> The studio agent is currently disconnected. Photos and selection controls will load once the photographer starts the app online.
            </div>
          </div>
        )}

        {images.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            This album has no photos yet.
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {images.map((img, idx) => {
              const selection = img.selections?.find((s) => s.clientId === clientId);
              const isFav = selection?.isFavorite || false;
              const isSel = selection?.isSelected || false;

              // Render responsive size stream endpoint (thumbnail for mobile, preview for desktop)
              const sizeParam = isMobile ? 'thumbnail' : 'preview';
              const imgSrc = `${streamBase}/file/${album.id}/${img.filename}?size=${sizeParam}`;

              return (
                <div 
                  key={img.id} 
                  className="break-inside-avoid relative rounded-xl overflow-hidden group bg-[#0d0d11] border border-white/5 hover:border-indigo-500/30 transition-colors"
                >
                  <img
                    src={imgSrc}
                    alt={img.filename}
                    onClick={() => {
                      setActiveImageIndex(idx);
                      setImageLoading(true);
                      loadComments(img.id);
                    }}
                    className="w-full h-auto object-cover cursor-zoom-in group-hover:scale-[1.02] transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback layout if Cloudflare tunnel offline
                      (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=60`;
                    }}
                  />
                  
                  {/* Floating Action Bars */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleSelectToggle(img, 'isFavorite')}
                      className={`p-2 rounded-lg backdrop-blur-md border border-white/10 transition-colors ${isFav ? 'bg-indigo-600 text-white' : 'bg-[#08080a]/60 text-zinc-400 hover:text-white'}`}
                    >
                      <Heart className="h-4 w-4" fill={isFav ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={() => handleSelectToggle(img, 'isSelected')}
                      className={`p-2 rounded-lg backdrop-blur-md border border-white/10 transition-colors ${isSel ? 'bg-emerald-600 text-white' : 'bg-[#08080a]/60 text-zinc-400 hover:text-white'}`}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Lightbox Overlay */}
      {activeImageIndex !== null && activeImage && (
        <div className="fixed inset-0 z-50 bg-[#08080a]/95 backdrop-blur-md flex flex-col md:flex-row">
          
          {/* Main Photo Visualizer */}
          <div className="flex-1 relative flex items-center justify-center p-6 border-r border-white/5">
            <button 
              onClick={() => setActiveImageIndex(null)}
              className="absolute top-6 left-6 p-2 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Left/Right controls */}
            <button
              disabled={activeImageIndex === 0}
              onClick={() => {
                setActiveImageIndex(activeImageIndex - 1);
                setImageLoading(true);
                loadComments(images[activeImageIndex - 1].id);
              }}
              className="absolute left-6 p-3 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors z-20"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="w-12 h-12 border-4 border-zinc-700 border-t-white rounded-full animate-spin shadow-xl"></div>
              </div>
            )}
            <img
              key={activeImage.id}
              src={`${streamBase}/file/${album.id}/${activeImage.filename}?size=${isMobile ? 'preview' : 'watermark'}`}
              alt={activeImage.filename}
              className={`max-h-[85vh] max-w-[90%] object-contain rounded-lg transition-opacity duration-300 relative z-10 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
              onLoad={() => setImageLoading(false)}
              onError={(e) => {
                setImageLoading(false);
                (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&auto=format&fit=crop&q=80`;
              }}
            />

            <button
              disabled={activeImageIndex === images.length - 1}
              onClick={() => {
                setActiveImageIndex(activeImageIndex + 1);
                setImageLoading(true);
                loadComments(images[activeImageIndex + 1].id);
              }}
              className="absolute right-6 p-3 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors z-20"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          {/* Sidebar - Selection controls & Comment system */}
          <div className="w-full md:w-96 bg-[#0d0d11]/80 p-8 flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-bold text-white">{activeImage.filename}</h4>
                <p className="text-xs text-zinc-500 mt-1">EXIF: {activeImage.exifData?.camera || 'Unavailable'}</p>
              </div>

              {/* Selector box */}
              <div className="flex gap-4">
                <button
                  onClick={() => handleSelectToggle(activeImage, 'isFavorite')}
                  className={`flex-1 py-3 rounded-xl border border-white/5 flex items-center justify-center gap-2 transition-colors text-sm font-semibold ${activeImage.selections?.find(s => s.clientId === clientId)?.isFavorite ? 'bg-indigo-600 text-white' : 'bg-white/5 text-zinc-400 hover:text-white'}`}
                >
                  <Heart className="h-4.5 w-4.5" fill={activeImage.selections?.find(s => s.clientId === clientId)?.isFavorite ? 'currentColor' : 'none'} />
                  <span>Favorite</span>
                </button>
                <button
                  onClick={() => handleSelectToggle(activeImage, 'isSelected')}
                  className={`flex-1 py-3 rounded-xl border border-white/5 flex items-center justify-center gap-2 transition-colors text-sm font-semibold ${activeImage.selections?.find(s => s.clientId === clientId)?.isSelected ? 'bg-emerald-600 text-white' : 'bg-white/5 text-zinc-400 hover:text-white'}`}
                >
                  <CheckCircle className="h-4.5 w-4.5" />
                  <span>Select</span>
                </button>
              </div>

              {/* Comments Board */}
              <div className="border-t border-white/5 pt-6">
                <h5 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Comments ({activeComments.length})</span>
                </h5>
                
                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                  {activeComments.length === 0 ? (
                    <div className="text-xs text-zinc-600">No comments yet. Write one below!</div>
                  ) : (
                    activeComments.map((com) => (
                      <div key={com.id} className="text-xs bg-white/5 p-3 rounded-lg border border-white/5">
                        <div className="flex items-center justify-between text-zinc-500 font-mono mb-1">
                          <span>{com.authorId === clientId ? 'You' : 'Client'}</span>
                          <span>{new Date(com.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <p className="text-zinc-300">{com.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Comment Form */}
            <form onSubmit={(e) => handleAddComment(e, activeImage.id)} className="border-t border-white/5 pt-4 mt-6">
              <input
                type="text"
                placeholder="Type a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-colors text-xs"
              />
              <button
                type="submit"
                disabled={postingComment || !commentText.trim()}
                className="w-full mt-2.5 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold"
              >
                Post Comment
              </button>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
