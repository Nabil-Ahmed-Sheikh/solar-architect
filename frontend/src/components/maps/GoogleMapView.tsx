"use client";
import { useEffect, useRef, useState, useCallback } from "react";

interface GoogleMapProps {
  latitude: number;
  longitude: number;
  apiKey: string;
  onLocationSelect?: (lat: number, lng: number, address: string) => void;
  zoom?: number;
}

declare global {
  interface Window {
    google: typeof google;
    initGoogleMap: () => void;
  }
}

export default function GoogleMapView({ latitude, longitude, apiKey, onLocationSelect, zoom = 19 }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: latitude, lng: longitude },
      zoom,
      mapTypeId: "satellite",
      tilt: 0,
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      styles: [],
    });

    mapInstanceRef.current = map;

    const marker = new window.google.maps.Marker({
      position: { lat: latitude, lng: longitude },
      map,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#ffba20",
        fillOpacity: 1,
        strokeColor: "#513800",
        strokeWeight: 2,
      },
    });
    markerRef.current = marker;

    // Click handler to reposition marker
    map.addListener("click", async (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      marker.setPosition(e.latLng);

      // Reverse geocode
      const geocoder = new window.google.maps.Geocoder();
      const result = await geocoder.geocode({ location: { lat, lng } });
      const address = result.results[0]?.formatted_address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      onLocationSelect?.(lat, lng, address);
    });

    setLoaded(true);
  }, [latitude, longitude, zoom, onLocationSelect]);

  useEffect(() => {
    if (!apiKey) {
      setError("no_key");
      return;
    }
    if (window.google?.maps) {
      initMap();
      return;
    }
    window.initGoogleMap = initMap;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMap&libraries=drawing,geometry`;
    script.async = true;
    script.defer = true;
    script.onerror = () => setError("load_failed");
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [apiKey, initMap]);

  // Update map center when props change
  useEffect(() => {
    if (mapInstanceRef.current && loaded) {
      const pos = { lat: latitude, lng: longitude };
      mapInstanceRef.current.panTo(pos);
      markerRef.current?.setPosition(pos);
    }
  }, [latitude, longitude, loaded]);

  if (error === "no_key") return <MapFallback lat={latitude} lng={longitude} reason="no_key" />;
  if (error === "load_failed") return <MapFallback lat={latitude} lng={longitude} reason="load_failed" />;

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#d8e8f0] rounded-lg">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-[#19667d] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-[#40484c]">Loading satellite imagery…</p>
          </div>
        </div>
      )}
    </div>
  );
}

function MapFallback({ lat, lng, reason }: { lat: number; lng: number; reason: string }) {
  return (
    <div className="relative w-full h-full bg-[#c8dce8] rounded-lg overflow-hidden">
      <svg className="w-full h-full" viewBox="0 0 800 420" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="mapgrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(141,208,233,0.2)" strokeWidth="1"/>
          </pattern>
          <radialGradient id="irr" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffba20" stopOpacity="0.6"/>
            <stop offset="60%" stopColor="#ffba20" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#ffba20" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <rect width="800" height="420" fill="#b8ccd8"/>
        <rect width="800" height="420" fill="url(#mapgrid)"/>
        {/* Roads */}
        <line x1="0" y1="210" x2="800" y2="210" stroke="rgba(255,255,255,0.25)" strokeWidth="12"/>
        <line x1="400" y1="0" x2="400" y2="420" stroke="rgba(255,255,255,0.2)" strokeWidth="8"/>
        {/* Rooftops */}
        {[
          [60,60,110,75],[200,50,90,65],[330,58,105,80],[480,45,120,85],[640,60,100,70],
          [50,180,95,70],[190,170,130,80],[380,178,100,72],[540,172,115,78],[680,180,90,65],
          [70,295,108,75],[220,285,95,68],[380,292,110,80],[545,288,120,75],[690,298,85,60],
        ].map(([x,y,w,h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h}
            fill={i%3===0?"rgba(255,186,32,0.4)":i%3===1?"rgba(255,186,32,0.6)":"rgba(255,186,32,0.25)"}
            stroke="rgba(255,186,32,0.7)" strokeWidth="1" rx="2"/>
        ))}
        <circle cx="400" cy="210" r="60" fill="url(#irr)"/>
        <circle cx="400" cy="210" r="14" fill="rgba(81,56,0,0.2)" stroke="#513800" strokeWidth="2"/>
        <circle cx="400" cy="210" r="5" fill="#513800"/>
      </svg>

      <div className="absolute bottom-4 left-4 glass-panel px-3 py-2 rounded-xl text-xs text-[#40484c]">
        {reason === "no_key"
          ? "Add GOOGLE_MAPS_API_KEY to .env for live satellite view"
          : "Satellite map unavailable — showing schematic view"}
      </div>
      <div className="absolute top-3 left-3 px-3 py-1 rounded-full glass-panel text-[10px] font-bold text-[#19667d]">
        {lat.toFixed(4)}°N · {Math.abs(lng).toFixed(4)}°W
      </div>
    </div>
  );
}
