/* ═══════════════════════════════════════════════════════════
   BarcodeScanner Component — W3-10 Camera-based Barcode Scanner
   Uses ZXing library for browser-based barcode scanning
   ═══════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BrowserMultiFormatReader } from '@zxing/library';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export default function BarcodeScanner({ isOpen, onClose, onScan }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [lastScan, setLastScan] = useState<string>('');
  const [scanCooldown, setScanCooldown] = useState(false);

  // Initialize reader and get available cameras
  useEffect(() => {
    if (!isOpen) return;

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    // Get available video devices
    reader
      .listVideoInputDevices()
      .then((videoDevices) => {
        setDevices(videoDevices);
        if (videoDevices.length > 0) {
          // Prefer back camera on mobile
          const backCamera = videoDevices.find(
            (device) =>
              device.label.toLowerCase().includes('back') ||
              device.label.toLowerCase().includes('rear')
          );
          setSelectedDeviceId(backCamera?.deviceId || videoDevices[0].deviceId);
        } else {
          setError('Tidak ada kamera yang tersedia');
        }
      })
      .catch((err) => {
        console.error('Failed to list video devices:', err);
        setError('Gagal mengakses daftar kamera');
      });

    return () => {
      reader.reset();
    };
  }, [isOpen]);

  // Start scanning when device is selected
  useEffect(() => {
    if (!isOpen || !selectedDeviceId || !videoRef.current || !readerRef.current) return;

    setIsScanning(true);
    setError(null);

    const reader = readerRef.current;

    reader
      .decodeFromVideoDevice(selectedDeviceId, videoRef.current, (result, err) => {
        if (result) {
          const barcodeText = result.getText();

          // Prevent duplicate scans (cooldown)
          if (barcodeText === lastScan && scanCooldown) {
            return;
          }

          setLastScan(barcodeText);
          setScanCooldown(true);

          // Haptic feedback if available
          if (navigator.vibrate) {
            navigator.vibrate(100);
          }

          // Play success sound
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuJ0/HQfS4HG2m98OScTAoOUqXh7qxeFws5ktXv0H0sCiV6yO/ajUEIDlyy5+qnVBEJQprZ8L9pIAQngtTvy3krBSF2xu7ZjT4IDFGj4OyvYBgLN4/U79F+LQggdcju2oxABw5cp+XqplMQCECY2O+/aCADJX/T78p5KgUieMXu2ow+Bw1PouDtr2AYCzaO0+/RfS0HH3TH7tqMQAcOW6fk6qZTEAg+ltfu/v8=');
          audio.play().catch(() => {});

          // Call onScan callback
          onScan(barcodeText);

          // Reset cooldown after 1 second
          setTimeout(() => {
            setScanCooldown(false);
          }, 1000);
        }

        if (err && !(err as any).name) {
          // Only show real errors, not "not found" errors
          console.error('Scan error:', err);
        }
      })
      .catch((err) => {
        console.error('Failed to start scanning:', err);
        setError('Gagal memulai scanner. Pastikan izin kamera sudah diberikan.');
        setIsScanning(false);
      });

    return () => {
      reader.reset();
      setIsScanning(false);
    };
  }, [isOpen, selectedDeviceId, onScan, lastScan, scanCooldown]);

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen && readerRef.current) {
      readerRef.current.reset();
      setIsScanning(false);
      setError(null);
      setLastScan('');
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.reset();
    }
    setIsScanning(false);
    onClose();
  }, [onClose]);

  const handleDeviceChange = useCallback((deviceId: string) => {
    if (readerRef.current) {
      readerRef.current.reset();
    }
    setSelectedDeviceId(deviceId);
  }, []);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="text-white">
            <h2 className="text-lg font-bold">Scan Barcode</h2>
            <p className="text-sm text-white/70">Arahkan kamera ke barcode produk</p>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Tutup Scanner"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Video Preview */}
      <div className="relative w-full h-full flex items-center justify-center">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />

        {/* Scanning Frame Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-64 h-64 sm:w-80 sm:h-80">
            {/* Corner decorations */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />

            {/* Scanning line animation */}
            {isScanning && !error && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary animate-scan-line" />
            )}

            {/* Center guide */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-1 bg-primary/50 rounded-full" />
            </div>
          </div>
        </div>

        {/* Last Scan Result */}
        {lastScan && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 px-4 py-2 bg-green-500 text-white rounded-full shadow-lg animate-fade-in-down">
            <div className="flex items-center gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="font-mono text-sm">{lastScan}</span>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="px-6 py-4 bg-red-500/90 text-white rounded-2xl shadow-xl max-w-sm">
            <div className="text-4xl mb-2">⚠️</div>
            <p className="font-medium">{error}</p>
            <p className="text-sm text-white/80 mt-2">
              Pastikan Anda sudah memberikan izin akses kamera
            </p>
          </div>
        </div>
      )}

      {/* Camera Selector (if multiple cameras) */}
      {devices.length > 1 && !error && (
        <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="max-w-4xl mx-auto">
            <select
              value={selectedDeviceId}
              onChange={(e) => handleDeviceChange(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 text-white border border-white/20 rounded-xl focus:outline-none focus:border-primary"
            >
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId} className="text-black">
                  {device.label || `Kamera ${device.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-20 left-0 right-0 z-10 text-center text-white/70 text-sm px-4">
        <p>Posisikan barcode di dalam frame untuk scan otomatis</p>
      </div>

      {/* CSS for scanning animation */}
      <style>{`
        @keyframes scan-line {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
        .animate-scan-line {
          animation: scan-line 2s ease-in-out infinite;
        }
        @keyframes fade-in-down {
          from {
            opacity: 0;
            transform: translate(-50%, -10px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.3s ease-out;
        }
      `}</style>
    </div>,
    document.body
  );
}
