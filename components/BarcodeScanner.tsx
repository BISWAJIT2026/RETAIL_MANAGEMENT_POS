
import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2, Camera, Zap } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let html5QrCode: any = null;
    let isMounted = true;

    const startScanner = async () => {
      try {
        // Wait for script to be ready if needed
        let retries = 0;
        // @ts-ignore
        while (!window.Html5Qrcode && retries < 10) {
          await new Promise(r => setTimeout(r, 200));
          retries++;
        }

        // @ts-ignore
        if (!window.Html5Qrcode) {
          throw new Error("Scanner library failed to load. Check your connection.");
        }

        if (!isMounted) return;

        // @ts-ignore
        html5QrCode = new window.Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        // Configuration specifically optimized for 1D Barcodes (EAN-13, ISBN)
        const config = { 
          fps: 20, 
          qrbox: { width: 350, height: 120 }, // Wide and shallow for 1D codes
          aspectRatio: 1.0,
          // Support standard 1D book formats
          formatsToSupport: [
            // @ts-ignore
            window.Html5QrcodeSupportedFormats.EAN_13,
            // @ts-ignore
            window.Html5QrcodeSupportedFormats.EAN_8,
            // @ts-ignore
            window.Html5QrcodeSupportedFormats.CODE_128,
            // @ts-ignore
            window.Html5QrcodeSupportedFormats.UPC_A,
            // @ts-ignore
            window.Html5QrcodeSupportedFormats.ISBN
          ]
        };

        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText: string) => {
            if (isMounted) {
              onScan(decodedText);
              if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().then(() => onClose()).catch(() => onClose());
              }
            }
          },
          () => {
            // Normal scanning noise - ignore
          }
        );

        if (isMounted) setIsInitializing(false);
      } catch (err: any) {
        if (isMounted) {
          console.error("Scanner Error:", err);
          setError(err.message || "Camera access denied or unavailable.");
          setIsInitializing(false);
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch((e: any) => console.debug("Stop failed", e));
      }
    };
  }, [onScan, onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-xl p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl max-w-lg w-full border border-white/20 animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b flex justify-between items-center bg-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <h3 className="font-black text-xs uppercase tracking-widest">Smart Barcode Lens</h3>
              <p className="text-[10px] text-slate-400 font-bold">Optimized for ISBN & EAN-13</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-8">
          <div className="relative group rounded-3xl overflow-hidden bg-black aspect-square max-h-[400px]">
            {isInitializing && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900">
                <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
                <p className="text-[10px] font-black text-white uppercase tracking-[0.3em] animate-pulse">Waking Optics...</p>
              </div>
            )}
            
            {error ? (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 text-center bg-slate-50">
                <div className="w-20 h-20 bg-red-100 text-red-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-red-500/10">
                  <Camera className="w-10 h-10" />
                </div>
                <h4 className="text-slate-900 font-black mb-2 uppercase tracking-tight">Camera Restricted</h4>
                <p className="text-xs font-medium text-slate-500 leading-relaxed">{error}</p>
                <button 
                  onClick={onClose}
                  className="mt-8 px-10 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
                >
                  Dismiss & Return
                </button>
              </div>
            ) : (
              <>
                <div id="reader" className="w-full h-full"></div>
                {!isInitializing && (
                  <div className="absolute inset-0 pointer-events-none z-30">
                    <div className="absolute inset-0 border-[40px] border-black/40"></div>
                    <div className="animate-scan"></div>
                    {/* Corner accents */}
                    <div className="absolute top-20 left-10 w-8 h-8 border-t-4 border-l-4 border-orange-500 rounded-tl-lg"></div>
                    <div className="absolute top-20 right-10 w-8 h-8 border-t-4 border-r-4 border-orange-500 rounded-tr-lg"></div>
                    <div className="absolute bottom-20 left-10 w-8 h-8 border-b-4 border-l-4 border-orange-500 rounded-bl-lg"></div>
                    <div className="absolute bottom-20 right-10 w-8 h-8 border-b-4 border-r-4 border-orange-500 rounded-br-lg"></div>
                  </div>
                )}
              </>
            )}
          </div>
          
          <div className="mt-8 text-center space-y-4">
            <div className="inline-flex items-center px-4 py-1.5 bg-orange-50 rounded-full border border-orange-100">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping mr-3"></span>
              <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Alignment Active</span>
            </div>
            <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase tracking-tight">
              Hold barcode <span className="text-slate-900 font-black">horizontally</span><br />within the orange guidelines
            </p>
          </div>
        </div>
        
        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-center">
           <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Powered by Vidyamandir Vision</p>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
