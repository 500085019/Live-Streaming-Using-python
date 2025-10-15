"use client"
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, Maximize2, Plus, Edit2, Trash2, X, Check, AlertCircle, Loader2 } from 'lucide-react';

// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// API Service
const overlayAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/overlays`);
    const data = await response.json();
    return data.overlays;
  },
  create: async (overlayData) => {
    const response = await fetch(`${API_BASE_URL}/overlays`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(overlayData)
    });
    return await response.json();
  },
  update: async (id, overlayData) => {
    const response = await fetch(`${API_BASE_URL}/overlays/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(overlayData)
    });
    return await response.json();
  },
  delete: async (id) => {
    const response = await fetch(`${API_BASE_URL}/overlays/${id}`, {
      method: 'DELETE'
    });
    return await response.json();
  }
};

const streamAPI = {
  start: async (streamData) => {
    const response = await fetch(`${API_BASE_URL}/stream/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(streamData)
    });
    return await response.json();
  },
  stop: async () => {
    const response = await fetch(`${API_BASE_URL}/stream/stop`, {
      method: 'POST'
    });
    return await response.json();
  },
  getStatus: async () => {
    const response = await fetch(`${API_BASE_URL}/stream/status`);
    return await response.json();
  }
};

export default function LivestreamApp() {
  const [streamUrl, setStreamUrl] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [overlays, setOverlays] = useState([]);
  const [activeOverlays, setActiveOverlays] = useState(new Set());
  const [showEditor, setShowEditor] = useState(false);
  const [editingOverlay, setEditingOverlay] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(100);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [streamError, setStreamError] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const playPromiseRef = useRef(null);
  const hlsRef = useRef(null);

  // Fetch overlays from backend on mount
  useEffect(() => {
    fetchOverlays();
  }, []);

  const fetchOverlays = async () => {
    try {
      setLoading(true);
      const overlaysData = await overlayAPI.getAll();
      setOverlays(overlaysData);
      setApiError('');
    } catch (error) {
      console.error('Failed to fetch overlays:', error);
      setApiError('Failed to connect to backend. Using local mode.');
      // Fallback to sample overlays
      setOverlays([
        {
          _id: '1',
          name: 'Live Badge',
          type: 'text',
          content: '🔴 LIVE',
          position: { x: 20, y: 20 },
          size: { width: 100, height: 40 },
          zIndex: 2,
          opacity: 0.9
        },
        {
          _id: '2',
          name: 'Logo',
          type: 'shape',
          content: '#FF6B6B',
          position: { x: 20, y: 70 },
          size: { width: 80, height: 60 },
          zIndex: 1,
          opacity: 0.7
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Handle volume changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Load HLS.js dynamically
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Initialize video stream
  useEffect(() => {
    if (isStreaming && videoRef.current && streamUrl) {
      const video = videoRef.current;
      setStreamError('');

      if (streamUrl.includes('.m3u8')) {
        if (window.Hls && window.Hls.isSupported()) {
          if (hlsRef.current) {
            hlsRef.current.destroy();
          }

          const hls = new window.Hls({
            enableWorker: true,
            lowLatencyMode: true,
          });
          hlsRef.current = hls;

          hls.loadSource(streamUrl);
          hls.attachMedia(video);

          hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
            console.log('HLS manifest loaded');
            playVideo();
          });

          hls.on(window.Hls.Events.ERROR, (event, data) => {
            console.error('HLS error:', data);
            if (data.fatal) {
              setStreamError(`HLS Error: ${data.type}`);
            }
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = streamUrl;
          video.addEventListener('loadedmetadata', () => {
            playVideo();
          });
        } else {
          setStreamError('HLS not supported in this browser');
        }
      } else if (streamUrl.startsWith('rtsp://')) {
        setStreamError('RTSP streams require a backend conversion server. Please use HLS (.m3u8) or MP4 URLs instead.');
      } else {
        video.src = streamUrl;
        video.addEventListener('loadeddata', () => {
          playVideo();
        });
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [isStreaming, streamUrl]);

  const playVideo = () => {
    if (videoRef.current) {
      playPromiseRef.current = videoRef.current.play();
      playPromiseRef.current
        .then(() => {
          setIsPlaying(true);
          playPromiseRef.current = null;
        })
        .catch(err => {
          console.log('Autoplay prevented:', err.message);
          setIsPlaying(false);
          playPromiseRef.current = null;
        });
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      if (playPromiseRef.current) {
        playPromiseRef.current.then(() => {
          if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        }).catch(() => {
          setIsPlaying(false);
        });
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      playVideo();
    }
  };

  const toggleOverlay = (id) => {
    const newActive = new Set(activeOverlays);
    if (newActive.has(id)) {
      newActive.delete(id);
    } else {
      newActive.add(id);
    }
    setActiveOverlays(newActive);
  };

  const deleteOverlay = async (id) => {
    if (!confirm('Are you sure you want to delete this overlay?')) return;

    try {
      setLoading(true);
      await overlayAPI.delete(id);
      setOverlays(overlays.filter(o => o._id !== id));
      const newActive = new Set(activeOverlays);
      newActive.delete(id);
      setActiveOverlays(newActive);
    } catch (error) {
      console.error('Failed to delete overlay:', error);
      alert('Failed to delete overlay. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayStream = async () => {
    if (!streamUrl.trim()) {
      alert('Please enter a valid stream URL');
      return;
    }

    try {
      setLoading(true);
      // Save stream to backend
      await streamAPI.start({
        url: streamUrl,
        title: 'Livestream Session',
        description: 'Active livestream'
      });
      setIsStreaming(true);
      setStreamError('');
    } catch (error) {
      console.error('Failed to start stream:', error);
      // Still allow streaming even if backend fails
      setIsStreaming(true);
      setStreamError('');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOverlay = async (formData) => {
    try {
      setLoading(true);
      if (editingOverlay) {
        const updated = await overlayAPI.update(editingOverlay._id, formData);
        setOverlays(overlays.map(o => o._id === editingOverlay._id ? updated : o));
      } else {
        const created = await overlayAPI.create(formData);
        setOverlays([...overlays, created]);
      }
      setShowEditor(false);
      setEditingOverlay(null);
    } catch (error) {
      console.error('Failed to save overlay:', error);
      alert('Failed to save overlay. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!isStreaming) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex flex-col">
        <header className="bg-black bg-opacity-30 text-white p-6 text-center backdrop-blur">
          <h1 className="text-4xl font-bold mb-2">🎥 Livestream Player</h1>
          <p className="text-blue-100">Watch and manage your livestream with custom overlays</p>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            {apiError && (
              <div className="mb-4 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 text-sm">
                {apiError}
              </div>
            )}

            <h2 className="text-2xl font-bold text-gray-800 mb-4">Enter Your Stream URL</h2>
            <p className="text-gray-600 mb-6">Paste your HLS (.m3u8) or video URL below</p>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="https://example.com/stream.m3u8"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handlePlayStream()}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-black"
                disabled={loading}
              />

              <button
                onClick={handlePlayStream}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>▶ Play Stream</>
                )}
              </button>
            </div>

            <div className="mt-8 p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
              <div className="flex items-start gap-2">
                <AlertCircle className="text-yellow-600 mt-0.5 flex-shrink-0" size={20} />
                <div>
                  <h3 className="font-bold text-gray-800 mb-2">Important Note</h3>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>RTSP streams are NOT supported</strong> directly in browsers.
                  </p>
                  <p className="text-sm text-gray-700 mb-2">
                    Supported formats:
                  </p>
                  <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
                    <li>HLS streams (.m3u8)</li>
                    <li>MP4 video files</li>
                    <li>WebM video files</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <h3 className="font-bold text-gray-800 mb-2">Test Stream Examples:</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setStreamUrl('https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8')}
                  className="w-full text-left text-xs text-blue-600 hover:bg-blue-100 p-2 rounded"
                  disabled={loading}
                >
                  📺 Demo HLS Stream
                </button>
                <button
                  onClick={() => setStreamUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4')}
                  className="w-full text-left text-xs text-blue-600 hover:bg-blue-100 p-2 rounded"
                  disabled={loading}
                >
                  🎬 Big Buck Bunny (MP4)
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-black text-white p-4 shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">🎥 Livestream Player</h1>
          {apiError && (
            <div className="text-yellow-400 text-sm">⚠️ Offline Mode</div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 max-w-7xl mx-auto">
        <div className="lg:col-span-3">
          <div className="bg-black rounded-lg overflow-hidden shadow-xl">
            {streamError && (
              <div className="bg-red-600 text-white p-4 flex items-center gap-2">
                <AlertCircle size={20} />
                <span>{streamError}</span>
              </div>
            )}

            <div
              ref={containerRef}
              className="relative w-full bg-black"
              style={{ aspectRatio: '16/9' }}
            >
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                playsInline
                controls={false}
                onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.target.duration)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onError={(e) => {
                  console.error('Video error:', e);
                  setStreamError('Failed to load video stream');
                }}
              />

              {overlays.map(
                (overlay) =>
                  activeOverlays.has(overlay._id) && (
                    <div
                      key={overlay._id}
                      className="absolute border-2 border-dashed border-white/30 hover:border-white/70 transition pointer-events-none"
                      style={{
                        left: `${overlay.position.x}px`,
                        top: `${overlay.position.y}px`,
                        width: `${overlay.size.width}px`,
                        height: `${overlay.size.height}px`,
                        zIndex: overlay.zIndex,
                        opacity: overlay.opacity,
                      }}
                    >
                      {overlay.type === 'text' && (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm bg-black/30 backdrop-blur-sm">
                          {overlay.content}
                        </div>
                      )}
                      {overlay.type === 'shape' && (
                        <div
                          className="w-full h-full"
                          style={{ backgroundColor: overlay.content }}
                        />
                      )}
                    </div>
                  )
              )}
            </div>

            <div className="bg-gradient-to-t from-black to-transparent p-4 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={(e) => {
                    if (videoRef.current && !isNaN(e.target.value)) {
                      videoRef.current.currentTime = parseFloat(e.target.value);
                                            videoRef.current.currentTime = parseFloat(e.target.value);
                      setCurrentTime(parseFloat(e.target.value));
                    }
                  }}
                  className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div className="flex items-center justify-between text-white text-sm">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition"
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                  </button>

                  <div className="flex items-center gap-2">
                    <Volume2 size={18} />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="w-24 accent-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => videoRef.current?.requestFullscreen()}
                    className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition"
                  >
                    <Maximize2 size={20} />
                  </button>
                  <button
                    onClick={async () => {
                      setLoading(true);
                      try {
                        await streamAPI.stop();
                        setIsStreaming(false);
                        setStreamUrl('');
                      } catch (err) {
                        console.error('Failed to stop stream:', err);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold text-sm"
                  >
                    ⏹ Stop Stream
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar for overlay management */}
        <div className="bg-gray-800 rounded-xl shadow-lg p-4 text-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Overlays</h2>
            <button
              onClick={() => {
                setEditingOverlay(null);
                setShowEditor(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 p-2 rounded-lg"
            >
              <Plus size={18} />
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-4 text-gray-400">
              <Loader2 size={20} className="animate-spin" /> Loading...
            </div>
          )}

          {!loading && overlays.length === 0 && (
            <p className="text-gray-400 text-sm">No overlays available.</p>
          )}

          <div className="space-y-2">
            {overlays.map((overlay) => (
              <div
                key={overlay._id}
                className={`p-3 rounded-lg flex items-center justify-between ${
                  activeOverlays.has(overlay._id)
                    ? 'bg-blue-700/30 border border-blue-500'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-semibold">{overlay.name}</span>
                  <span className="text-xs text-gray-400">
                    {overlay.type.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleOverlay(overlay._id)}
                    className={`p-1 rounded-full ${
                      activeOverlays.has(overlay._id)
                        ? 'bg-green-600'
                        : 'bg-gray-500 hover:bg-gray-400'
                    }`}
                  >
                    {activeOverlays.has(overlay._id) ? (
                      <Check size={16} />
                    ) : (
                      <Play size={16} />
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setEditingOverlay(overlay);
                      setShowEditor(true);
                    }}
                    className="p-1 rounded-full bg-yellow-500 hover:bg-yellow-600"
                  >
                    <Edit2 size={14} />
                  </button>

                  <button
                    onClick={() => deleteOverlay(overlay._id)}
                    className="p-1 rounded-full bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Overlay Editor Modal */}
      {showEditor && (
        <OverlayEditor
          overlay={editingOverlay}
          onSave={handleSaveOverlay}
          onCancel={() => {
            setShowEditor(false);
            setEditingOverlay(null);
          }}
        />
      )}
    </div>
  );
}

/* Overlay Editor Component */
function OverlayEditor({ overlay, onSave, onCancel }) {
  const [formData, setFormData] = useState(
    overlay || {
      name: '',
      type: 'text',
      content: '',
      position: { x: 0, y: 0 },
      size: { width: 100, height: 50 },
      zIndex: 1,
      opacity: 1,
    }
  );

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePositionChange = (axis, value) => {
    setFormData((prev) => ({
      ...prev,
      position: { ...prev.position, [axis]: Number(value) },
    }));
  };

  const handleSizeChange = (axis, value) => {
    setFormData((prev) => ({
      ...prev,
      size: { ...prev.size, [axis]: Number(value) },
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-bold mb-4 text-gray-800">
          {overlay ? 'Edit Overlay' : 'Add Overlay'}
        </h2>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Overlay Name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={formData.type}
            onChange={(e) => handleChange('type', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="text">Text</option>
            <option value="shape">Shape</option>
          </select>

          <input
            type="text"
            placeholder="Content (Text or Color)"
            value={formData.content}
            onChange={(e) => handleChange('content', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          <div className="flex gap-2">
            <input
              type="number"
              placeholder="X"
              value={formData.position.x}
              onChange={(e) => handlePositionChange('x', e.target.value)}
              className="w-1/2 px-3 py-2 border rounded-lg"
            />
            <input
              type="number"
              placeholder="Y"
              value={formData.position.y}
              onChange={(e) => handlePositionChange('y', e.target.value)}
              className="w-1/2 px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Width"
              value={formData.size.width}
              onChange={(e) => handleSizeChange('width', e.target.value)}
              className="w-1/2 px-3 py-2 border rounded-lg"
            />
            <input
              type="number"
              placeholder="Height"
              value={formData.size.height}
              onChange={(e) => handleSizeChange('height', e.target.value)}
              className="w-1/2 px-3 py-2 border rounded-lg"
            />
          </div>

          <input
            type="number"
            placeholder="Z-Index"
            value={formData.zIndex}
            onChange={(e) => handleChange('zIndex', Number(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg"
          />

          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={formData.opacity}
            onChange={(e) => handleChange('opacity', parseFloat(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg"
          >
            <X size={16} className="inline mr-1" /> Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            <Check size={16} className="inline mr-1" /> Save
          </button>
        </div>
      </div>
    </div>
  );
}
