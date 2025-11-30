import React, { useCallback, useEffect, useRef, useState } from "react";
import { Map as MapLibre, Marker, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import LocationSearch from "@/components/LocationSearch";
import { cacheService } from "@/services/cacheService";
import { useTheme } from "@/components/ThemeProvider";
import { useLanguage } from "@/components/LanguageProvider";

interface MapProps {
  onLocationSelect: (lng: number, lat: number, address?: string) => void;
  selectedLocation: { lng: number; lat: number; address?: string } | null;
  facilities: Array<{
    id: string;
    name: string;
    category: string;
    lng: number;
    lat: number;
    distance: number;
    contribution: number;
    tags?: any;
  }>;
  showRadius: boolean;
  radiusOptions: number[];
  hasCalculated?: boolean;
  visibleCategories: Record<string, boolean>;
  satelliteEnabled?: boolean; // new optional prop to toggle satellite imagery
  isCustomPoiMode?: boolean; // new prop to indicate Custom POI Mode is active
}

const Map: React.FC<MapProps> = ({
  onLocationSelect,
  selectedLocation,
  facilities,
  showRadius,
  radiusOptions,
  hasCalculated = false,
  visibleCategories,
  satelliteEnabled = false,
  isCustomPoiMode = false,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibre | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [styleLoaded, setStyleLoaded] = useState(false);
  const markersRef = useRef<Marker[]>([]);
  const selectedLocationMarkerRef = useRef<Marker | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const onLocationSelectRef = useRef(onLocationSelect);
  const isCustomPoiModeRef = useRef(isCustomPoiMode);
  const { theme } = useTheme();
  const { t } = useLanguage();

  const isMapReady = mapLoaded && styleLoaded;

  // Determine if dark mode is active
  const isDarkMode =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  // Update the ref when the callback changes
  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  // Update the ref when isCustomPoiMode changes
  useEffect(() => {
    isCustomPoiModeRef.current = isCustomPoiMode;
  }, [isCustomPoiMode]);

  // Helper function to get address from coordinates with caching
  const getAddressFromCoordinates = async (
    lng: number,
    lat: number
  ): Promise<string> => {
    return cacheService.cacheLocationData(
      lat,
      lng,
      "address",
      async () => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`
          );
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        } catch (error) {
          return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
      },
      60 * 60 * 1000 // 1 hour cache for addresses
    );
  };

  // Effect to fetch address if missing (e.g. when switching back from Custom POI mode)
  useEffect(() => {
    if (!isCustomPoiMode && selectedLocation && !selectedLocation.address) {
      getAddressFromCoordinates(selectedLocation.lng, selectedLocation.lat).then(
        (address) => {
          onLocationSelectRef.current(
            selectedLocation.lng,
            selectedLocation.lat,
            address
          );
        }
      );
    }
  }, [isCustomPoiMode, selectedLocation]);

  // Helper function to create circle geometry
  const createCircle = (lng: number, lat: number, radiusInMeters: number) => {
    // Use a simpler approach for testing
    const points = 32; // Fewer points for simpler circle
    const coordinates = [];

    // Convert meters to degrees (latitude-dependent)
    // At the equator: 1 degree ≈ 111,320 meters
    // At latitude lat: 1 degree longitude ≈ 111,320 * cos(lat) meters
    const latRadiusInDegrees = radiusInMeters / 111320; // Latitude radius (same everywhere)
    const cosLat = Math.cos((lat * Math.PI) / 180);
    const lngRadiusInDegrees =
      cosLat > 0.001 ? radiusInMeters / (111320 * cosLat) : 0; // Prevent division by zero at poles

    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * 2 * Math.PI;
      const x = lng + lngRadiusInDegrees * Math.cos(angle);
      const y = lat + latRadiusInDegrees * Math.sin(angle);
      coordinates.push([x, y]);
    }

    const circleData = {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "Polygon" as const,
        coordinates: [coordinates],
      },
    };

    return circleData;
  };

  // Category colors matching the ControlPanel facility categories
  const categoryColors = {
    health: "#ef4444", // red-500 for healthcare
    education: "#3b82f6", // blue-500 for education
    market: "#a16207", // amber-700 for market (brown)
    transport: "#8b5cf6", // purple-500 for transport
    recreation: "#14b8a6", // teal-500 for recreation
    safety: "#10b981", // green-500 for safety
    accessibility: "#ec4899", // pink-500 for accessibility
    police: "#6366f1", // indigo-500 for police
    religious: "#d1d5db", // gray-300 for religious
    walkability: "#fb923c", // orange-400 for walkability
    default: "#6b7280",
  };

  const categoryIcons = {
    health: "🏥",
    education: "🏫",
    market: "🛒", // shopping cart for market (will be overridden by getMarketIcon)
    transport: "🚌",
    recreation: "🌳",
    safety: "🚦", // traffic light for traffic safety
    accessibility: "♿", // wheelchair for accessibility features (visual only)
    police: "👮", // police officer for police facilities
    religious: "🙏", // generic religious icon (will be overridden by getReligiousIcon)
    walkability: "🚶", // walkability icon
    default: "📍",
  };

  // Function to get religion-specific icon based on facility name
  const getReligiousIcon = (facilityName: string): string => {
    const name = facilityName.toLowerCase();

    // Christianity - English & Indonesian
    if (
      name.includes("church") ||
      name.includes("cathedral") ||
      name.includes("chapel") ||
      name.includes("basilica") ||
      name.includes("gereja") ||
      name.includes("katedral") ||
      name.includes("kapel")
    ) {
      return "⛪";
    }

    // Islam - English & Indonesian
    if (
      name.includes("mosque") ||
      name.includes("masjid") ||
      name.includes("masjid") ||
      name.includes("surau") ||
      name.includes("musholla") ||
      name.includes("langgar")
    ) {
      return "🕌";
    }

    // Hinduism - English & Indonesian
    if (
      name.includes("temple") ||
      name.includes("mandir") ||
      name.includes("gurdwara") ||
      name.includes("pura") ||
      name.includes("candi") ||
      name.includes("mandir")
    ) {
      return "🕉️";
    }

    // Judaism - English & Indonesian
    if (
      name.includes("synagogue") ||
      name.includes("jewish") ||
      name.includes("jew") ||
      name.includes("sinagoga") ||
      name.includes("rumah ibadat yahudi")
    ) {
      return "🕍";
    }

    // Buddhism - English & Indonesian
    if (
      name.includes("buddhist") ||
      name.includes("pagoda") ||
      name.includes("vihara") ||
      name.includes("vihara") ||
      name.includes("pagoda") ||
      name.includes("klenteng") ||
      name.includes("wihara")
    ) {
      return "🏛️";
    }

    // Sikhism - English & Indonesian
    if (
      name.includes("sikh") ||
      name.includes("gurdwara") ||
      name.includes("gurdwara") ||
      name.includes("rumah ibadat sikh")
    ) {
      return "🕉️";
    }

    // Confucianism - Indonesian
    if (
      name.includes("klenteng") ||
      name.includes("vihara") ||
      name.includes("kelenteng")
    ) {
      return "🏛️";
    }

    // Generic religious terms - Indonesian
    if (
      name.includes("rumah ibadat") ||
      name.includes("tempat ibadah") ||
      name.includes("ibadah")
    ) {
      return "🙏";
    }

    // Default religious icon
    return "🙏";
  };

  // Function to get market-specific icon based on facility type and name
  const getMarketIcon = (facilityName: string, tags?: any): string => {
    if (!tags) return "🛒"; // Default icon if no tags available
    const name = facilityName.toLowerCase();

    // Gas stations and fuel facilities
    if (
      tags?.amenity === "fuel" ||
      tags?.amenity === "gas_station" ||
      tags?.amenity === "petrol_station" ||
      tags?.amenity === "service_station" ||
      name.includes("spbu") ||
      name.includes("pom bensin") ||
      name.includes("gas station") ||
      name.includes("petrol") ||
      name.includes("fuel") ||
      name.includes("bensin") ||
      name.includes("solar") ||
      name.includes("pertamina") ||
      name.includes("shell") ||
      name.includes("bp") ||
      name.includes("esso") ||
      name.includes("caltex")
    ) {
      return "⛽";
    }

    // Restaurants and food establishments
    if (
      tags?.amenity === "restaurant" ||
      tags?.amenity === "cafe" ||
      tags?.amenity === "fast_food" ||
      tags?.amenity === "food_court" ||
      tags?.amenity === "bar" ||
      tags?.amenity === "pub" ||
      tags?.amenity === "ice_cream" ||
      tags?.amenity === "coffee_shop" ||
      name.includes("restaurant") ||
      name.includes("cafe") ||
      name.includes("warung") ||
      name.includes("warung makan") ||
      name.includes("rumah makan") ||
      name.includes("kedai kopi") ||
      name.includes("coffee") ||
      name.includes("bakery") ||
      name.includes("roti") ||
      name.includes("cake") ||
      name.includes("pizza") ||
      name.includes("burger") ||
      name.includes("nasi") ||
      name.includes("mie") ||
      name.includes("sate") ||
      name.includes("ayam")
    ) {
      return "🍽️";
    }

    // Coffee shops and cafes
    if (
      tags?.amenity === "cafe" ||
      tags?.amenity === "coffee_shop" ||
      name.includes("coffee") ||
      name.includes("kopi") ||
      name.includes("cafe") ||
      name.includes("kedai kopi") ||
      name.includes("coffee shop") ||
      name.includes("starbucks")
    ) {
      return "☕";
    }

    // Bakeries and pastry shops
    if (
      tags?.shop === "bakery" ||
      tags?.amenity === "bakery" ||
      name.includes("bakery") ||
      name.includes("roti") ||
      name.includes("cake") ||
      name.includes("pastry") ||
      name.includes("bread") ||
      name.includes("kue")
    ) {
      return "🥐";
    }

    // Supermarkets and grocery stores
    if (
      tags?.shop === "supermarket" ||
      tags?.shop === "convenience" ||
      tags?.shop === "grocery" ||
      name.includes("supermarket") ||
      name.includes("minimarket") ||
      name.includes("indomaret") ||
      name.includes("alfamart") ||
      name.includes("carrefour") ||
      name.includes("giant") ||
      name.includes("hypermart") ||
      name.includes("lotte mart") ||
      name.includes("grocery") ||
      name.includes("mr diy")
    ) {
      return "🛒";
    }

    // Clothing and fashion stores
    if (
      tags?.shop === "clothes" ||
      tags?.shop === "fashion" ||
      tags?.shop === "jewelry" ||
      name.includes("clothes") ||
      name.includes("fashion") ||
      name.includes("baju") ||
      name.includes("pakaian") ||
      name.includes("jewelry") ||
      name.includes("perhiasan") ||
      name.includes("sepatu") ||
      name.includes("shoes") ||
      name.includes("bag") ||
      name.includes("tas") ||
      name.includes("accessories")
    ) {
      return "👕";
    }

    // Electronics and technology stores
    if (
      tags?.shop === "electronics" ||
      tags?.shop === "mobile_phone" ||
      tags?.shop === "computer" ||
      name.includes("electronics") ||
      name.includes("electronic") ||
      name.includes("hp") ||
      name.includes("mobile") ||
      name.includes("phone") ||
      name.includes("computer") ||
      name.includes("laptop") ||
      name.includes("gadget") ||
      name.includes("cell") ||
      name.includes("tech")
    ) {
      return "📱";
    }

    // Pharmacies and drug stores
    if (
      tags?.shop === "pharmacy" ||
      tags?.amenity === "pharmacy" ||
      name.includes("pharmacy") ||
      name.includes("apotek") ||
      name.includes("apotik") ||
      name.includes("drugstore") ||
      name.includes("obat")
    ) {
      return "💊";
    }

    // Hardware and DIY stores
    if (
      tags?.shop === "hardware" ||
      tags?.shop === "doityourself" ||
      tags?.shop === "paint" ||
      name.includes("hardware") ||
      name.includes("bangunan") ||
      name.includes("material") ||
      name.includes("paint") ||
      name.includes("cat") ||
      name.includes("tools") ||
      name.includes("alat") ||
      name.includes("perkakas")
    ) {
      return "🔨";
    }

    // Bookstores and stationery
    if (
      tags?.shop === "books" ||
      tags?.shop === "stationery" ||
      tags?.shop === "newsagent" ||
      name.includes("book") ||
      name.includes("buku") ||
      name.includes("stationery") ||
      name.includes("alat tulis") ||
      name.includes("paper") ||
      name.includes("fotocopy") ||
      name.includes("kertas")
    ) {
      return "📚";
    }

    // General convenience stores and small shops
    if (
      tags?.shop === "convenience" ||
      tags?.shop === "general" ||
      tags?.shop === "kiosk" ||
      name.includes("toko") ||
      name.includes("warung") ||
      name.includes("kedai") ||
      name.includes("store") ||
      name.includes("shop") ||
      name.includes("convenience")
    ) {
      return "🏪";
    }

    // Default market icon
    return "🛒";
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    const maptilerKey = (import.meta as any).env?.VITE_MAPTILER_KEY;

    map.current = new MapLibre({
      container: mapContainer.current,
      style: maptilerKey
        ? `https://api.maptiler.com/maps/streets-v2${
            isDarkMode ? "-dark" : ""
          }/style.json?key=${maptilerKey}`
        : {
            version: 8,
            sources: {
              osm: {
                type: "raster",
                tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                tileSize: 256,
                attribution: "© OpenStreetMap contributors",
              },
            },
            layers: [
              {
                id: "osm",
                type: "raster",
                source: "osm",
              },
            ],
          },
      center: [106.8456, -6.2088], // Jakarta default
      zoom: 12,
      maxZoom: 18,
      minZoom: 5,
    });

    map.current.on("load", () => {
      // Add satellite source & layer AFTER base style load
      const maptilerKey = (import.meta as any).env?.VITE_MAPTILER_KEY;
      // Prefer MapTiler satellite if key present else fallback to Esri World Imagery
      if (!map.current!.getSource("satellite")) {
        if (maptilerKey) {
          map.current!.addSource("satellite", {
            type: "raster",
            tiles: [
              `https://api.maptiler.com/tiles/satellite/{z}/{x}/{y}.jpg?key=${maptilerKey}`,
            ],
            tileSize: 256,
            attribution: "© MapTiler © OpenStreetMap contributors",
          });
        } else {
          map.current!.addSource("satellite", {
            type: "raster",
            tiles: [
              "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "© Esri, Maxar, Earthstar Geographics",
          });
        }
        // Add satellite layer
        map.current!.addLayer({
          id: "satellite-layer",
          type: "raster",
          source: "satellite",
          layout: {
            visibility: satelliteEnabled ? "visible" : "none",
          },
        });
      }
      setMapLoaded(true);
    });

    map.current.on("style.load", () => {
      setStyleLoaded(true);
    });

    map.current.on("click", async (e) => {
      const { lng, lat } = e.lngLat;

      // Skip address loading in Custom POI Mode for faster pinning
      if (isCustomPoiModeRef.current) {
        onLocationSelectRef.current(lng, lat);
      } else {
        // Get address from coordinates
        const address = await getAddressFromCoordinates(lng, lat);
        onLocationSelectRef.current(lng, lat, address);
      }
    });

    // Also add a click handler to the container as backup
    mapContainer.current?.addEventListener("click", (e) => {
      // Container click handler
    });

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []); // Remove onLocationSelect from dependencies

  // Toggle between light and dark map styles based on theme
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const currentIsDark =
      theme === "dark" ||
      (theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    const maptilerKey = (import.meta as any).env?.VITE_MAPTILER_KEY;

    // If using MapTiler, reload the style with the correct theme
    if (maptilerKey && !satelliteEnabled) {
      const newStyle = `https://api.maptiler.com/maps/streets-v2${
        currentIsDark ? "-dark" : ""
      }/style.json?key=${maptilerKey}`;
      map.current.setStyle(newStyle);
    }
  }, [theme, mapLoaded, satelliteEnabled]);

  // Respond to satelliteEnabled prop changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    if (map.current.getLayer("satellite-layer")) {
      map.current.setLayoutProperty(
        "satellite-layer",
        "visibility",
        satelliteEnabled ? "visible" : "none"
      );
    }
  }, [satelliteEnabled, mapLoaded]);

  // Update selected location marker and radius circles
  useEffect(() => {
    if (!map.current || !isMapReady) {
      return;
    }

    if (!selectedLocation) {
      // Clear existing marker when no location is selected
      if (selectedLocationMarkerRef.current) {
        selectedLocationMarkerRef.current.remove();
        selectedLocationMarkerRef.current = null;
      }
      return;
    }

    // Wait for style to be fully loaded before manipulating sources/layers
    if (!map.current.isStyleLoaded()) {
      return;
    }

    // Only clear radius circles if we're showing new ones or if there are no facilities
    // This prevents clearing radius when just selecting a new location
    if (!facilities.length || !showRadius) {
      const layersToRemove = [
        "radius-250",
        "radius-500",
        "radius-1000",
        "radius-250-fill",
        "radius-500-fill",
        "radius-1000-fill",
      ];
      const sourcesToRemove = ["radius-250", "radius-500", "radius-1000"];

      layersToRemove.forEach((layerId) => {
        if (map.current!.getLayer(layerId)) {
          map.current!.removeLayer(layerId);
        }
      });

      sourcesToRemove.forEach((sourceId) => {
        if (map.current!.getSource(sourceId)) {
          map.current!.removeSource(sourceId);
        }
      });

      // No more pulse intervals to clear
    }

    if (showRadius && radiusOptions.length > 0) {
      radiusOptions.forEach((radius, index) => {
        try {
          const sourceId = `radius-${radius}`;
          const layerId = `radius-${radius}`;

          const circleData = createCircle(
            selectedLocation.lng,
            selectedLocation.lat,
            radius
          );

          map.current!.addSource(sourceId, {
            type: "geojson",
            data: circleData,
          });

          map.current!.addLayer({
            id: layerId,
            type: "line",
            source: sourceId,
            paint: {
              "line-color":
                index === 0 ? "#22c55e" : index === 1 ? "#eab308" : "#ef4444",
              "line-width": 3,
              "line-opacity": 0.8,
            },
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
          });

          // Add a fill layer for better visual appeal (static, no pulse)
          map.current!.addLayer(
            {
              id: `${layerId}-fill`,
              type: "fill",
              source: sourceId,
              paint: {
                "fill-color":
                  index === 0 ? "#22c55e" : index === 1 ? "#eab308" : "#ef4444",
                "fill-opacity": index === 0 ? 0.08 : index === 1 ? 0.06 : 0.04,
              },
            },
            layerId
          ); // Insert after the line layer
        } catch (error) {
          // Error adding radius circle
        }
      });
    }

    // Only update marker if location changed or marker doesn't exist
    const currentMarker = selectedLocationMarkerRef.current;
    const shouldUpdateMarker =
      !currentMarker ||
      currentMarker.getLngLat().lng !== selectedLocation.lng ||
      currentMarker.getLngLat().lat !== selectedLocation.lat;

    if (shouldUpdateMarker) {
      // Remove existing selected location marker
      if (selectedLocationMarkerRef.current) {
        selectedLocationMarkerRef.current.remove();
        selectedLocationMarkerRef.current = null;
      }

      // Add selected location marker
      const selectedMarkerEl = document.createElement("div");
      const markerColor = hasCalculated ? "#ef4444" : "#2563eb"; // Red if calculated, blue if not
      const markerIcon = hasCalculated ? "📍" : "🎯";

      selectedMarkerEl.style.cssText = `
        background-color: ${markerColor};
        width: 30px;
        height: 30px;
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        z-index: 1000;
        cursor: pointer;
      `;
      selectedMarkerEl.innerHTML = markerIcon;

      selectedLocationMarkerRef.current = new Marker(selectedMarkerEl)
        .setLngLat([selectedLocation.lng, selectedLocation.lat])
        .addTo(map.current!);
    }

    // Center map on selected location
    map.current.flyTo({
      center: [selectedLocation.lng, selectedLocation.lat],
      zoom: 14,
      duration: 1000,
    });
  }, [
    selectedLocation,
    showRadius,
    radiusOptions,
    isMapReady,
    hasCalculated,
    facilities,
  ]);

  // Update facility markers with performance optimizations
  useEffect(() => {
    if (!map.current || !isMapReady) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => {
      marker.remove();
    });
    markersRef.current = [];

    let visibleCount = 0;
    let hiddenCount = 0;

    // Performance optimization: Limit concurrent marker creation
    const BATCH_SIZE = 50;
    const visibleFacilities = facilities.filter(
      (facility) => visibleCategories[facility.category]
    );

    // Process markers in batches to prevent blocking
    const processMarkerBatch = (startIndex: number) => {
      const endIndex = Math.min(
        startIndex + BATCH_SIZE,
        visibleFacilities.length
      );
      const batch = visibleFacilities.slice(startIndex, endIndex);

      batch.forEach((facility) => {
        visibleCount++;

        const color =
          categoryColors[facility.category as keyof typeof categoryColors] ||
          categoryColors.default;
        let icon =
          categoryIcons[facility.category as keyof typeof categoryColors] ||
          categoryIcons.default;

        // Use religion-specific icon for religious facilities
        if (facility.category === "religious") {
          icon = getReligiousIcon(facility.name);
        }

        // Use market-specific icon for market facilities
        if (facility.category === "market") {
          icon = getMarketIcon(facility.name, (facility as any).tags);
        }

        // Check if this is a custom POI
        const isCustom = facility.tags?.custom === true;

        // Create marker element with optimized styles for better performance
        const el = document.createElement("div");
        el.innerHTML = `
        <div style="
          background: linear-gradient(135deg, ${color}, ${color}dd);
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2px solid ${isCustom ? "#fbbf24" : "rgba(255,255,255,0.8)"};
          box-shadow: ${
            isCustom
              ? "0 0 0 2px #fbbf24, 0 4px 12px rgba(251,191,36,0.4)"
              : "0 4px 12px rgba(0,0,0,0.25)"
          };
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          cursor: pointer;
          transition: transform 0.2s ease;
          z-index: 1000;
          position: relative;
          pointer-events: auto;
        " data-category="${facility.category}" data-color="${color}">
          ${icon}
        </div>
      `;

        const markerElement = el.firstElementChild as HTMLElement;

        // Simplified hover effects for better performance
        markerElement.addEventListener("mouseenter", () => {
          markerElement.style.transform = "scale(1.1)";
        });

        markerElement.addEventListener("mouseleave", () => {
          markerElement.style.transform = "scale(1)";
        });

        // Add click event for popup
        markerElement.addEventListener("click", (e) => {
          e.stopPropagation();

          if (popupRef.current) {
            popupRef.current.remove();
          }

          const popup = new Popup({
            closeButton: false,
            closeOnClick: false,
            className: "facility-popup",
          })
            .setLngLat([facility.lng, facility.lat])
            .setHTML(
              `
            <div class="relative p-3 min-w-[200px] bg-card text-card-foreground rounded-lg shadow-lg">
              <button 
                id="popup-close-btn"
                class="absolute top-2 right-2 w-6 h-6 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground flex items-center justify-center text-sm font-bold transition-colors"
                style="z-index: 1001;"
              >
                ×
              </button>
              <h3 class="font-semibold text-sm mb-1 text-foreground pr-8">${
                facility.name
              }</h3>
              <p class="text-xs text-muted-foreground mb-2 capitalize">${
                t(facility.category) || facility.category
              }</p>
              <div class="space-y-1 text-xs">
                <div class="flex justify-between">
                  <span class="text-muted-foreground">${t("distance")}</span>
                  <span class="font-medium text-foreground">${Math.round(
                    facility.distance
                  )}m</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">${t("score.impact")}</span>
                  <span class="font-medium text-foreground">+${facility.contribution.toFixed(
                    1
                  )}</span>
                </div>
              </div>
            </div>
          `
            )
            .addTo(map.current!);

          setTimeout(() => {
            const closeBtn = popup
              .getElement()
              ?.querySelector("#popup-close-btn");
            if (closeBtn) {
              closeBtn.addEventListener("click", () => {
                popup.remove();
              });
            }
          }, 10);

          popupRef.current = popup;
        });

        const marker = new Marker({
          element: el,
          anchor: "center",
        })
          .setLngLat([facility.lng, facility.lat])
          .addTo(map.current!);

        markersRef.current.push(marker);
      });

      // Process next batch if there are more facilities
      if (endIndex < visibleFacilities.length) {
        requestAnimationFrame(() => processMarkerBatch(endIndex));
      } else {
      }
    };

    // Start processing batches
    if (visibleFacilities.length > 0) {
      processMarkerBatch(0);
    }
  }, [facilities, isMapReady, visibleCategories, t]);

  return (
    <div
      className="relative w-full h-full rounded-lg overflow-hidden"
      style={{ boxShadow: "var(--shadow-map)" }}
    >
      {/* Search Bar Overlay - Mobile Only */}
      <div className="absolute top-4 left-4 z-10 w-80 max-w-[calc(100vw-2rem)] lg:hidden">
        <LocationSearch
          onLocationSelect={(lng, lat, address) =>
            onLocationSelect(lng, lat, address)
          }
        />
      </div>

      <style>
        {`
          .facility-health { background-color: #ef4444 !important; }
          .facility-education { background-color: #3b82f6 !important; }
          .facility-market { background-color: #a16207 !important; }
          .facility-transport { background-color: #8b5cf6 !important; }
          .facility-recreation { background-color: #14b8a6 !important; }
          .facility-safety { background-color: #10b981 !important; }
          .facility-accessibility { background-color: #ec4899 !important; }
          .facility-police { background-color: #6366f1 !important; }
          .facility-religious { background-color: #d1d5db !important; }
          .facility-walkability { background-color: #fb923c !important; }
          
          /* Glow effects for different facility categories */
          .facility-health { box-shadow: 0 0 20px rgba(239, 68, 68, 0.3) !important; }
          .facility-education { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3) !important; }
          .facility-market { box-shadow: 0 0 20px rgba(161, 98, 7, 0.3) !important; }
          .facility-transport { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3) !important; }
          .facility-recreation { box-shadow: 0 0 20px rgba(20, 184, 166, 0.3) !important; }
          .facility-safety { box-shadow: 0 0 20px rgba(16, 185, 129, 0.3) !important; }
          .facility-accessibility { box-shadow: 0 0 20px rgba(236, 72, 153, 0.3) !important; }
          .facility-police { box-shadow: 0 0 20px rgba(99, 102, 241, 0.3) !important; }
          .facility-religious { box-shadow: 0 0 20px rgba(209, 213, 219, 0.3) !important; }
          .facility-walkability { box-shadow: 0 0 20px rgba(251, 146, 60, 0.3) !important; }
          
          /* Radius circle styling */
          .maplibregl-canvas-container {
            filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.1));
          }
          
          /* Enhanced radius circle visibility */
          .maplibregl-canvas {
            filter: contrast(1.1) brightness(1.05);
          }
          
          /* Pulse animation for important facilities */
          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.05);
              opacity: 0.9;
            }
          }
          
          /* Entrance animation for facilities */
          @keyframes fadeInScale {
            from {
              opacity: 0;
              transform: scale(0.8);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          
          /* Dark mode popup styling */
          .maplibre-popup-content,
          .maplibregl-popup-content {
            background: hsl(var(--card)) !important;
            color: hsl(var(--card-foreground)) !important;
            border: none !important;
            border-radius: 0.5rem !important;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
            padding: 0 !important;
          }
          
          .maplibre-popup-tip,
          .maplibregl-popup-tip {
            border-top-color: hsl(var(--card)) !important;
          }
          
          /* Ensure popup content uses our theme colors */
          .facility-popup .maplibre-popup-content,
          .facility-popup .maplibregl-popup-content {
            background: hsl(var(--card)) !important;
            color: hsl(var(--card-foreground)) !important;
            border: none !important;
            padding: 0 !important;
          }
          
          /* Override any default MapLibre popup styling */
          .maplibregl-popup {
            border: none !important;
            box-shadow: none !important;
          }
          
          .maplibregl-popup-content {
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        `}
      </style>
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
};

export default Map;
