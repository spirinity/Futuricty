// Livability calculation service using OpenStreetMap Overpass API
import { cacheService, cacheUtils } from "./cacheService";
import { customPoiService } from "./customPoiService";

interface Facility {
  id: string;
  name: string;
  category: string;
  lng: number;
  lat: number;
  distance: number;
  contribution: number;
  tags?: any; // Store original OSM tags for icon selection
}

interface LiveabilityData {
  overall: number;
  subscores: {
    services: number;
    mobility: number;
    safety: number;
    environment: number;
  };
  location: {
    address: string;
    coordinates: { lng: number; lat: number };
  } | null;
  facilityCounts: {
    health: number;
    education: number;
    market: number;
    transport: number;
    walkability: number; // New category for walkability infrastructure
    recreation: number;
    safety: number;
    accessibility: number;
    police: number;
    religious: number;
  };
}

// Distance configuration for different facility types
const FACILITY_DISTANCES = {
  health: 1000,
  education: 1000,
  market: 1000,
  transport: 1000,
  walkability: 1000, // New category for walkability infrastructure
  recreation: 1000,
  safety: 1000,
  accessibility: 1000,
  police: 1000,
  religious: 1000,
};

// Generate Overpass API queries with appropriate distances
const generateOverpassQuery = (
  category: string,
  lat: number,
  lng: number
): string => {
  const distance =
    FACILITY_DISTANCES[category as keyof typeof FACILITY_DISTANCES] || 1000;

  const queries = {
    health: `
      [out:json];
      (
        node["amenity"~"^(hospital|clinic|doctors|dentist|pharmacy|veterinary)$"](around:${distance},{lat},{lng});
        way["amenity"~"^(hospital|clinic|doctors|dentist|pharmacy|veterinary)$"](around:${distance},{lat},{lng});
        node["name"~"^(rumah sakit|rsud|klinik|apotek|apotik|dokter|puskesmas|poli)"](around:${distance},{lat},{lng});
        way["name"~"^(rumah sakit|rsud|klinik|apotek|apotik|dokter|puskesmas|poli)"](around:${distance},{lat},{lng});
      );
      out center;
    `,
    education: `
      [out:json];
      (
        node["amenity"~"^(school|university|college|kindergarten|library)$"](around:${distance},{lat},{lng});
        way["amenity"~"^(school|university|college|kindergarten|library)$"](around:${distance},{lat},{lng});
        node["name"~"^(sekolah|sd|smp|sma|smk|universitas|univ|kampus|tk|paud|perpustakaan|library)"](around:${distance},{lat},{lng});
        way["name"~"^(sekolah|sd|smp|sma|smk|universitas|univ|kampus|tk|paud|perpustakaan|library)"](around:${distance},{lat},{lng});
      );
      out center;
    `,
    market: `
      [out:json];
      (
        // GRAB ALL SHOPS - OSM already knows what's a shop!
        node["shop"](around:${distance},{lat},{lng});
        way["shop"](around:${distance},{lat},{lng});
        
        // GRAB ALL RESTAURANTS/FOOD ESTABLISHMENTS
        node["amenity"~"^(restaurant|cafe|fast_food|food_court|bar|pub|ice_cream|coffee_shop)$"](around:${distance},{lat},{lng});
        way["amenity"~"^(restaurant|cafe|fast_food|food_court|bar|pub|ice_cream|coffee_shop)$"](around:${distance},{lat},{lng});
        
        // GRAB ALL AMENITIES THAT COULD BE SHOPS
        node["amenity"~"^(shop|store|market|retail|food|beverage)$"](around:${distance},{lat},{lng});
        way["amenity"~"^(shop|store|market|retail|food|beverage)$"](around:${distance},{lat},{lng});
        
        // GRAB ALL FUEL STATIONS AND GAS STATIONS
        node["amenity"~"^(fuel|gas_station|petrol_station|service_station)$"](around:${distance},{lat},{lng});
        way["amenity"~"^(fuel|gas_station|petrol_station|service_station)$"](around:${distance},{lat},{lng});
        
        // GRAB BY NAME PATTERNS (Indonesian and English) - more specific to avoid recreation
        node["name"~"^(spbu|pom bensin|gas station|petrol|fuel|bensin|solar|pertamina|shell|bp|esso|caltex|toko|warung|shop|store|market|mall|plaza)"](around:${distance},{lat},{lng});
        way["name"~"^(spbu|pom bensin|gas station|petrol|fuel|bensin|solar|pertamina|shell|bp|esso|caltex|toko|warung|shop|store|market|mall|plaza)"](around:${distance},{lat},{lng});
        
        // Community centers that might be market-like
        node["amenity"="community_centre"]["name"~"^(pasar|market|pusat|center|centre)"](around:${distance},{lat},{lng});
        way["amenity"="community_centre"]["name"~"^(pasar|market|pusat|center|centre)"](around:${distance},{lat},{lng});
      );
      out center;
    `,

    transport: `
      [out:json];
      (
        node["public_transport"~"^(platform|station|stop_position)$"](around:${distance},{lat},{lng});
        node["highway"="bus_stop"](around:${distance},{lat},{lng});
        node["railway"~"^(station|halt|tram_stop)$"](around:${distance},{lat},{lng});
        way["public_transport"~"^(platform|station)$"](around:${distance},{lat},{lng});
        node["name"~"^(halte|bus stop|terminal|stasiun|station|mrt|lrt|transjakarta|angkot)"](around:${distance},{lat},{lng});
        way["name"~"^(halte|bus stop|terminal|stasiun|station|mrt|lrt|transjakarta|angkot)"](around:${distance},{lat},{lng});
      );
      out center;
    `,
    walkability: `
      [out:json];
      (
        // Pedestrian-friendly streets and paths
        way["highway"~"^(footway|pedestrian|path|steps|bridleway)$"](around:${distance},{lat},{lng});
        way["highway"="residential"]["foot"="designated"](around:${distance},{lat},{lng});
        way["highway"="service"]["foot"="designated"](around:${distance},{lat},{lng});
        
        // Sidewalks and pedestrian infrastructure
        way["sidewalk"~"^(both|left|right|separate)$"](around:${distance},{lat},{lng});
        way["footway"="sidewalk"](around:${distance},{lat},{lng});
        way["footway"="crossing"](around:${distance},{lat},{lng});
        
        // Pedestrian crossings and safety
        node["highway"="crossing"]["foot"="designated"](around:${distance},{lat},{lng});
        node["highway"="crossing"]["crossing"="zebra"](around:${distance},{lat},{lng});
        node["highway"="crossing"]["crossing"="traffic_signals"](around:${distance},{lat},{lng});
        node["highway"="crossing"]["crossing"="uncontrolled"](around:${distance},{lat},{lng});
        
        // Pedestrian bridges and tunnels
        way["bridge"="yes"]["highway"~"^(footway|pedestrian|path)$"](around:${distance},{lat},{lng});
        way["tunnel"="yes"]["highway"~"^(footway|pedestrian|path)$"](around:${distance},{lat},{lng});
        
        // Pedestrian zones and areas
        way["pedestrian"="yes"](around:${distance},{lat},{lng});
        way["pedestrian"="designated"](around:${distance},{lat},{lng});
        way["pedestrian"="zone"](around:${distance},{lat},{lng});
        
        // Walking routes and trails
        way["route"="foot"](around:${distance},{lat},{lng});
        way["route"="hiking"](around:${distance},{lat},{lng});
        way["route"="walking"](around:${distance},{lat},{lng});
        
        // Pedestrian-friendly amenities
        node["amenity"="bench"](around:${distance},{lat},{lng});
        way["amenity"="bench"](around:${distance},{lat},{lng});
        node["amenity"="drinking_water"](around:${distance},{lat},{lng});
        way["amenity"="drinking_water"](around:${distance},{lat},{lng});
        
        // Street furniture for pedestrians
        node["highway"="street_lamp"](around:${distance},{lat},{lng});
        way["highway"]["lit"="yes"](around:${distance},{lat},{lng});
        
        // Traffic calming for pedestrian safety
        way["traffic_calming"~"^(speed_bump|table|chicane|hump|cushion)$"](around:${distance},{lat},{lng});
        
        // Low-speed zones (better for walking)
        way["maxspeed"~"^(20|30|40)$"](around:${distance},{lat},{lng});
        way["zone:traffic"="20"](around:${distance},{lat},{lng});
        way["zone:traffic"="30"](around:${distance},{lat},{lng});
        
        // Pedestrian-friendly street design
        way["highway"="residential"]["lanes"="1"](around:${distance},{lat},{lng});
        way["highway"="residential"]["lanes"="2"](around:${distance},{lat},{lng});
        way["highway"="service"]["lanes"="1"](around:${distance},{lat},{lng});
        
        // Green infrastructure for walking
        way["natural"="tree_row"](around:${distance},{lat},{lng});
        way["natural"="hedge"](around:${distance},{lat},{lng});
        way["landuse"="grass"](around:${distance},{lat},{lng});
        way["landuse"="meadow"](around:${distance},{lat},{lng});
      );
      out center;
    `,
    recreation: `
      [out:json];
      (
        node["leisure"~"^(park|playground|sports_centre|fitness_centre|swimming_pool|garden)$"](around:${distance},{lat},{lng});
        way["leisure"~"^(park|playground|sports_centre|fitness_centre|swimming_pool|garden)$"](around:${distance},{lat},{lng});
        node["amenity"~"^(cinema|theatre)$"](around:${distance},{lat},{lng});
        way["amenity"~"^(cinema|theatre)$"](around:${distance},{lat},{lng});
        node["name"~"^(taman|park|playground|kolam renang|swimming|gym|fitness|bioskop|cinema|teater|theatre)"](around:${distance},{lat},{lng});
        way["name"~"^(taman|park|playground|kolam renang|swimming|gym|fitness|bioskop|cinema|teater|theatre)"](around:${distance},{lat},{lng});
      );
      out center;
    `,
    safety: `
      [out:json];
      (
        // Street lighting
        node["highway"="street_lamp"](around:${distance},{lat},{lng});
        way["highway"]["lit"="yes"](around:${distance},{lat},{lng});
        
        // Crossings and traffic signals
        node["highway"="crossing"](around:${distance},{lat},{lng});
        node["highway"="crossing"]["crossing_ref"="zebra"](around:${distance},{lat},{lng});
        node["highway"="crossing"]["crossing"="uncontrolled"](around:${distance},{lat},{lng});
        node["highway"="traffic_signals"](around:${distance},{lat},{lng});
        
        // Traffic calming measures
        way["traffic_calming"](around:${distance},{lat},{lng});
        way["traffic_calming"="speed_bump"](around:${distance},{lat},{lng});
        way["traffic_calming"="table"](around:${distance},{lat},{lng});
        way["traffic_calming"="chicane"](around:${distance},{lat},{lng});
        
        // Speed limits (high speed = higher risk)
        way["maxspeed"](around:${distance},{lat},{lng});
        
        // Pedestrian infrastructure
        way["sidewalk"](around:${distance},{lat},{lng});
        way["sidewalk"="both"](around:${distance},{lat},{lng});
        way["sidewalk"="left"](around:${distance},{lat},{lng});
        way["sidewalk"="right"](around:${distance},{lat},{lng});
        way["footway"="sidewalk"](around:${distance},{lat},{lng});
        way["kerb"="lowered"](around:${distance},{lat},{lng});
        
        // Emergency response facilities (excluding police - they have their own category)
        node["amenity"="fire_station"](around:${distance},{lat},{lng});
        way["amenity"="fire_station"](around:${distance},{lat},{lng});
        node["amenity"="hospital"](around:${distance},{lat},{lng});
        way["amenity"="hospital"](around:${distance},{lat},{lng});
        
        // Surveillance/CCTV
        node["man_made"="surveillance"](around:${distance},{lat},{lng});
        way["man_made"="surveillance"](around:${distance},{lat},{lng});
        node["surveillance:type"="camera"](around:${distance},{lat},{lng});
        way["surveillance:type"="camera"](around:${distance},{lat},{lng});
        
        // Accessibility features (merged from access category)
        node["barrier"="kerb"](around:${distance},{lat},{lng});
        way["barrier"="kerb"](around:${distance},{lat},{lng});
        node["kerb"="lowered"](around:${distance},{lat},{lng});
        way["kerb"="lowered"](around:${distance},{lat},{lng});
        node["kerb"="flush"](around:${distance},{lat},{lng});
        way["kerb"="flush"](around:${distance},{lat},{lng});
        
        // Ramps and accessible entrances
        node["highway"="steps"]["incline"](around:${distance},{lat},{lng});
        way["highway"="steps"]["incline"](around:${distance},{lat},{lng});
        node["highway"="elevator"](around:${distance},{lat},{lng});
        way["highway"="elevator"](around:${distance},{lat},{lng});
        
        // Accessible parking
        node["amenity"="parking"]["access"="designated"](around:${distance},{lat},{lng});
        way["amenity"="parking"]["access"="designated"](around:${distance},{lat},{lng});
        
        // Tactile paving and guidance
        node["tactile_paving"="yes"](around:${distance},{lat},{lng});
        way["tactile_paving"="yes"](around:${distance},{lat},{lng});
        
        // Accessible toilets
        node["amenity"="toilets"]["wheelchair"="yes"](around:${distance},{lat},{lng});
        way["amenity"="toilets"]["wheelchair"="yes"](around:${distance},{lat},{lng});
      );
      out center;
    `,
    police: `
      [out:json];
      (
        // Police stations and related facilities
        node["amenity"="police"](around:${distance},{lat},{lng});
        way["amenity"="police"](around:${distance},{lat},{lng});
        node["name"~"^(polisi|polres|polsek|polda|satlantas|satpol|pp|police)"](around:${distance},{lat},{lng});
        way["name"~"^(polisi|polres|polsek|polda|satlantas|satpol|pp|police)"](around:${distance},{lat},{lng});
      );
      out center;
    `,
    religious: `
      [out:json];
      (
        node["amenity"~"^(place_of_worship|mosque|church|temple|synagogue|hindu_temple|buddhist_temple)$"](around:${distance},{lat},{lng});
        way["amenity"~"^(place_of_worship|mosque|church|temple|synagogue|hindu_temple|buddhist_temple)$"](around:${distance},{lat},{lng});
        node["name"~"^(masjid|gudang|gereja|katedral|katedral|synagogue|hindu_temple|buddhist_temple)"](around:${distance},{lat},{lng});
        way["name"~"^(masjid|gudang|gereja|katedral|katedral|synagogue|hindu_temple|buddhist_temple)"](around:${distance},{lat},{lng});
      );
      out center;
    `,
  };

  return queries[category as keyof typeof queries] || queries.health;
};

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Query Overpass API for facilities with caching
const queryOverpassAPI = async (
  query: string,
  lat: number,
  lng: number
): Promise<any[]> => {
  const formattedQuery = query
    .replace(/{lat}/g, lat.toString())
    .replace(/{lng}/g, lng.toString());

  return cacheService.cacheLocationData(
    lat,
    lng,
    `overpass-${cacheUtils.hash(formattedQuery)}`,
    async () => {
      // REMOVED TRY-CATCH HERE so errors propagate to the retry logic!
      const response = await fetch("https://overpass.private.coffee/api/interpreter", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formattedQuery,
      });

      if (!response.ok) {
        // Throw detailed error with status for retry logic
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.elements || [];
    },
    30 * 60 * 1000 // 30 minutes cache for facility data
  );
};

// ... existing code ...


// Calculate distance-based contribution using gradual decay
const calculateDistanceContribution = (
  distance: number,
  category: string
): number => {
  // Different decay rates for different facility types
  const decayConfig = {
    health: { maxDistance: 1000, maxContribution: 10, decayRate: 0.8 },
    education: { maxDistance: 1000, maxContribution: 10, decayRate: 0.9 },
    market: { maxDistance: 1000, maxContribution: 8, decayRate: 0.85 },
    transport: { maxDistance: 1000, maxContribution: 10, decayRate: 0.95 },
    walkability: { maxDistance: 1000, maxContribution: 12, decayRate: 0.85 }, // Higher contribution for walkability
    recreation: { maxDistance: 1000, maxContribution: 8, decayRate: 0.8 },
    safety: { maxDistance: 1000, maxContribution: 6, decayRate: 0.7 },
    accessibility: { maxDistance: 1000, maxContribution: 4, decayRate: 0.9 },
    police: { maxDistance: 1000, maxContribution: 8, decayRate: 0.6 },
    religious: { maxDistance: 1000, maxContribution: 6, decayRate: 0.75 },
  };

  const config =
    decayConfig[category as keyof typeof decayConfig] || decayConfig.health;

  // If beyond max distance, no contribution
  if (distance > config.maxDistance) {
    return 0;
  }

  // Calculate contribution using exponential decay
  // Formula: contribution = maxContribution * (1 - distance/maxDistance)^decayRate
  const normalizedDistance = distance / config.maxDistance;
  const contribution =
    config.maxContribution * Math.pow(1 - normalizedDistance, config.decayRate);

  // Ensure minimum contribution for very close facilities
  const minContribution = config.maxContribution * 0.1;
  return Math.max(contribution, minContribution);
};

// Process facility data and calculate contribution scores
const processFacilities = (
  elements: any[],
  category: string,
  userLat: number,
  userLng: number
): Facility[] => {
  const facilities = elements
    .map((element, index) => {
      const lat = element.lat || (element.center && element.center.lat) || 0;
      const lng = element.lon || (element.center && element.center.lon) || 0;
      const distance = calculateDistance(userLat, userLng, lat, lng);

      // Calculate contribution based on distance using gradual decay
      let contribution = 0;

      // Determine the actual category based on the element's tags
      let actualCategory = category;

      // PRIORITY 1: Check for education facilities FIRST (highest priority)
      if (
        element.tags?.amenity === "school" ||
        element.tags?.amenity === "university" ||
        element.tags?.amenity === "college" ||
        element.tags?.amenity === "kindergarten" ||
        element.tags?.amenity === "library" ||
        (element.tags?.name &&
          (element.tags.name.toLowerCase().includes("sekolah") ||
            element.tags.name.toLowerCase().includes("sd ") ||
            element.tags.name.toLowerCase().includes(" smp") ||
            element.tags.name.toLowerCase().includes(" sma") ||
            element.tags.name.toLowerCase().includes("smk") ||
            element.tags.name.toLowerCase().includes("universitas") ||
            element.tags.name.toLowerCase().includes("univ") ||
            element.tags.name.toLowerCase().includes("kampus") ||
            element.tags.name.toLowerCase().includes("tk") ||
            element.tags.name.toLowerCase().includes("paud") ||
            element.tags.name.toLowerCase().includes("perpustakaan") ||
            element.tags.name.toLowerCase().includes("library")))
      ) {
        actualCategory = "education";
      }
      // PRIORITY 2: Check for police facilities
      else if (
        element.tags?.amenity === "police" ||
        (element.tags?.name &&
          (element.tags.name.toLowerCase().includes("polisi") ||
            element.tags.name.toLowerCase().includes("polres") ||
            element.tags.name.toLowerCase().includes("polsek") ||
            element.tags.name.toLowerCase().includes("polda") ||
            element.tags.name.toLowerCase().includes("satlantas") ||
            element.tags.name.toLowerCase().includes("satpol") ||
            element.tags.name.toLowerCase().includes("pp") ||
            element.tags.name.toLowerCase().includes("police")))
      ) {
        actualCategory = "police";
      }
      // PRIORITY 3: Check for market/shop facilities
      else if (
        element.tags?.shop ||
        element.tags?.amenity === "restaurant" ||
        element.tags?.amenity === "cafe" ||
        element.tags?.amenity === "fast_food" ||
        element.tags?.amenity === "food_court" ||
        element.tags?.amenity === "bar" ||
        element.tags?.amenity === "pub" ||
        element.tags?.amenity === "ice_cream" ||
        element.tags?.amenity === "coffee_shop" ||
        element.tags?.amenity === "fuel" ||
        element.tags?.amenity === "gas_station" ||
        element.tags?.amenity === "petrol_station" ||
        element.tags?.amenity === "service_station" ||
        (element.tags?.amenity === "community_centre" &&
          element.tags?.name &&
          (element.tags.name.toLowerCase().includes("pasar") ||
            element.tags.name.toLowerCase().includes("market") ||
            element.tags.name.toLowerCase().includes("pusat") ||
            element.tags.name.toLowerCase().includes("center") ||
            element.tags.name.toLowerCase().includes("centre"))) ||
        (element.tags?.name &&
          (element.tags.name.toLowerCase().includes("spbu") ||
            element.tags.name.toLowerCase().includes("pom bensin") ||
            element.tags.name.toLowerCase().includes("gas station") ||
            element.tags.name.toLowerCase().includes("petrol") ||
            element.tags.name.toLowerCase().includes("fuel") ||
            element.tags.name.toLowerCase().includes("bensin") ||
            element.tags.name.toLowerCase().includes("solar") ||
            element.tags.name.toLowerCase().includes("pertamina") ||
            element.tags.name.toLowerCase().includes("shell") ||
            element.tags.name.toLowerCase().includes("bp") ||
            element.tags.name.toLowerCase().includes("esso") ||
            element.tags.name.toLowerCase().includes("caltex") ||
            element.tags.name.toLowerCase().includes("toko") ||
            element.tags.name.toLowerCase().includes("warung") ||
            element.tags.name.toLowerCase().includes("shop") ||
            element.tags.name.toLowerCase().includes("store") ||
            element.tags.name.toLowerCase().includes("market") ||
            element.tags.name.toLowerCase().includes("mall") ||
            element.tags.name.toLowerCase().includes("plaza")))
      ) {
        actualCategory = "market";
      }
      // PRIORITY 4: Check for health facilities
      else if (
        element.tags?.amenity === "hospital" ||
        element.tags?.amenity === "clinic" ||
        element.tags?.amenity === "doctors" ||
        element.tags?.amenity === "dentist" ||
        element.tags?.amenity === "pharmacy" ||
        element.tags?.amenity === "veterinary" ||
        (element.tags?.name &&
          (element.tags.name.toLowerCase().includes("rumah sakit") ||
            (element.tags.name.toLowerCase().includes("rs ") &&
              !element.tags.name.toLowerCase().includes("sekolah") &&
              !element.tags.name.toLowerCase().includes("sd") &&
              !element.tags.name.toLowerCase().includes("smp") &&
              !element.tags.name.toLowerCase().includes("sma") &&
              !element.tags.name.toLowerCase().includes("smk")) ||
            element.tags.name.toLowerCase().includes("rsud") ||
            element.tags.name.toLowerCase().includes("klinik") ||
            element.tags.name.toLowerCase().includes("apotek") ||
            element.tags.name.toLowerCase().includes("apotik") ||
            element.tags.name.toLowerCase().includes("dokter") ||
            element.tags.name.toLowerCase().includes("puskesmas") ||
            element.tags.name.toLowerCase().includes("poli")))
      ) {
        actualCategory = "health";
      }
      // PRIORITY 5: Check for transport facilities
      else if (
        element.tags?.public_transport === "platform" ||
        element.tags?.public_transport === "station" ||
        element.tags?.public_transport === "stop_position" ||
        element.tags?.highway === "bus_stop" ||
        element.tags?.railway === "station" ||
        element.tags?.railway === "halt" ||
        element.tags?.railway === "tram_stop" ||
        (element.tags?.name &&
          (element.tags.name.toLowerCase().includes("halte") ||
            element.tags.name.toLowerCase().includes("bus stop") ||
            element.tags.name.toLowerCase().includes("terminal") ||
            element.tags.name.toLowerCase().includes("stasiun") ||
            element.tags.name.toLowerCase().includes("station") ||
            element.tags.name.toLowerCase().includes("mrt") ||
            element.tags.name.toLowerCase().includes("lrt") ||
            element.tags.name.toLowerCase().includes("transjakarta") ||
            element.tags.name.toLowerCase().includes("angkot")))
      ) {
        actualCategory = "transport";
      }
      // PRIORITY 6: Check for religious facilities
      else if (
        element.tags?.amenity === "place_of_worship" ||
        element.tags?.amenity === "mosque" ||
        element.tags?.amenity === "church" ||
        element.tags?.amenity === "temple" ||
        element.tags?.amenity === "synagogue" ||
        element.tags?.amenity === "hindu_temple" ||
        element.tags?.amenity === "buddhist_temple" ||
        (element.tags?.name &&
          (element.tags.name.toLowerCase().includes("masjid") ||
            element.tags.name.toLowerCase().includes("gudang") ||
            element.tags.name.toLowerCase().includes("gereja") ||
            element.tags.name.toLowerCase().includes("katedral") ||
            element.tags.name.toLowerCase().includes("synagogue") ||
            element.tags.name.toLowerCase().includes("hindu_temple") ||
            element.tags.name.toLowerCase().includes("buddhist_temple") ||
            element.tags.name.toLowerCase().includes("pura") ||
            element.tags.name.toLowerCase().includes("candi") ||
            element.tags.name.toLowerCase().includes("vihara")))
      ) {
        actualCategory = "religious";
      }
      // PRIORITY 7: Check for recreation facilities
      else if (
        element.tags?.leisure === "park" ||
        element.tags?.leisure === "playground" ||
        element.tags?.leisure === "sports_centre" ||
        element.tags?.leisure === "fitness_centre" ||
        element.tags?.leisure === "swimming_pool" ||
        element.tags?.leisure === "garden" ||
        element.tags?.amenity === "cinema" ||
        element.tags?.amenity === "theatre" ||
        element.tags?.amenity === "community_centre" ||
        (element.tags?.name &&
          (element.tags.name.toLowerCase().includes("taman") ||
            element.tags.name.toLowerCase().includes("park") ||
            element.tags.name.toLowerCase().includes("playground") ||
            element.tags.name.toLowerCase().includes("kolam renang") ||
            element.tags.name.toLowerCase().includes("swimming") ||
            element.tags.name.toLowerCase().includes("gym") ||
            element.tags.name.toLowerCase().includes("fitness") ||
            element.tags.name.toLowerCase().includes("bioskop") ||
            element.tags.name.toLowerCase().includes("cinema") ||
            element.tags.name.toLowerCase().includes("teater") ||
            element.tags.name.toLowerCase().includes("theatre") ||
            element.tags.name.toLowerCase().includes("pusat komunitas")))
      ) {
        actualCategory = "recreation";
      }
      // PRIORITY 8: Check for walkability infrastructure features
      else if (
        element.tags?.highway === "footway" ||
        element.tags?.highway === "pedestrian" ||
        element.tags?.highway === "path" ||
        element.tags?.highway === "steps" ||
        element.tags?.highway === "bridleway" ||
        element.tags?.sidewalk ||
        element.tags?.footway === "sidewalk" ||
        element.tags?.footway === "crossing" ||
        element.tags?.pedestrian ||
        element.tags?.route === "foot" ||
        element.tags?.route === "hiking" ||
        element.tags?.route === "walking" ||
        element.tags?.amenity === "bench" ||
        element.tags?.amenity === "drinking_water" ||
        element.tags?.highway === "street_lamp" ||
        element.tags?.lit === "yes" ||
        element.tags?.traffic_calming ||
        element.tags?.maxspeed ||
        element.tags?.zone_traffic ||
        element.tags?.natural === "tree_row" ||
        element.tags?.natural === "hedge" ||
        element.tags?.landuse === "grass" ||
        element.tags?.landuse === "meadow" ||
        (element.tags?.highway === "crossing" &&
          element.tags?.foot === "designated") ||
        (element.tags?.highway === "crossing" &&
          element.tags?.crossing === "zebra") ||
        (element.tags?.highway === "crossing" &&
          element.tags?.crossing === "traffic_signals") ||
        (element.tags?.highway === "crossing" &&
          element.tags?.crossing === "uncontrolled") ||
        (element.tags?.bridge === "yes" &&
          (element.tags?.highway === "footway" ||
            element.tags?.highway === "pedestrian" ||
            element.tags?.highway === "path")) ||
        (element.tags?.tunnel === "yes" &&
          (element.tags?.highway === "footway" ||
            element.tags?.highway === "pedestrian" ||
            element.tags?.highway === "path"))
      ) {
        actualCategory = "walkability";
      }
      // PRIORITY 9: Check for accessibility features
      else if (
        element.tags?.barrier === "kerb" ||
        element.tags?.kerb === "lowered" ||
        element.tags?.kerb === "flush" ||
        element.tags?.highway === "elevator" ||
        (element.tags?.highway === "steps" && element.tags?.incline) ||
        (element.tags?.amenity === "parking" &&
          element.tags?.access === "designated") ||
        element.tags?.tactile_paving === "yes" ||
        (element.tags?.amenity === "toilets" &&
          element.tags?.wheelchair === "yes")
      ) {
        actualCategory = "accessibility";
      }
      // PRIORITY 10: Check for safety features (lowest priority - catch-all for safety-related items)
      else if (
        element.tags?.highway === "street_lamp" ||
        element.tags?.lit === "yes" ||
        element.tags?.highway === "crossing" ||
        element.tags?.traffic_calming ||
        element.tags?.maxspeed ||
        element.tags?.sidewalk ||
        element.tags?.amenity === "fire_station" ||
        element.tags?.amenity === "hospital" ||
        element.tags?.man_made === "surveillance" ||
        element.tags?.surveillance_type === "camera"
      ) {
        actualCategory = "safety";
      }

      const name =
        element.tags?.name ||
        element.tags?.shop ||
        element.tags?.amenity ||
        element.tags?.leisure ||
        element.tags?.highway ||
        element.tags?.traffic_calming ||
        element.tags?.crossing_ref ||
        element.tags?.man_made ||
        element.tags?.barrier ||
        element.tags?.kerb ||
        element.tags?.wheelchair ||
        element.tags?.tactile_paving ||
        `${actualCategory} facility`;

      // Calculate contribution using the new distance decay function
      contribution = calculateDistanceContribution(distance, actualCategory);

      const facility = {
        id: `${actualCategory}-${element.id || index}`,
        name: String(name),
        category: actualCategory,
        lng,
        lat,
        distance: Math.round(distance),
        contribution,
        tags: element.tags, // Store original OSM tags for icon selection
      };

      // Log ALL market facilities for debugging
      if (actualCategory === "market") {
        // Specifically log gas stations and fuel facilities
        if (
          element.tags?.amenity === "fuel" ||
          element.tags?.amenity === "gas_station" ||
          element.tags?.amenity === "petrol_station" ||
          element.tags?.amenity === "service_station" ||
          (element.tags?.name &&
            (element.tags.name.toLowerCase().includes("spbu") ||
              element.tags.name.toLowerCase().includes("pom bensin") ||
              element.tags.name.toLowerCase().includes("gas station") ||
              element.tags.name.toLowerCase().includes("petrol") ||
              element.tags.name.toLowerCase().includes("fuel") ||
              element.tags.name.toLowerCase().includes("pertamina") ||
              element.tags.name.toLowerCase().includes("shell") ||
              element.tags.name.toLowerCase().includes("bp") ||
              element.tags.name.toLowerCase().includes("esso") ||
              element.tags.name.toLowerCase().includes("caltex")))
        ) {
          // Gas station/fuel facility found
        }
      }

      // Log walkability facilities for debugging
      if (actualCategory === "walkability") {
        // Walkability facility found
      }

      // Log facilities with specific names we're looking for
      if (
        name.toLowerCase().includes("bebe") ||
        name.toLowerCase().includes("narsis") ||
        name.toLowerCase().includes("store") ||
        name.toLowerCase().includes("kedai")
      ) {
        // Found facility with target name
      }

      // Log safety facilities for debugging
      if (actualCategory === "safety") {
        // Safety facility found
      }

      // Log accessibility facilities for debugging
      if (actualCategory === "accessibility") {
        // Accessibility facility found
      }

      // Log police facilities for debugging
      if (actualCategory === "police") {
        // Police facility found
      }

      // Log religious facilities for debugging
      if (actualCategory === "religious") {
        // Religious facility found
      }

      // Log health facilities for debugging
      if (actualCategory === "health") {
        // Health facility found
      }

      return facility;
    })
    .filter((f) => {
      // Use category-specific max distances from decay config
      const decayConfig = {
        health: 1000,
        education: 1000,
        market: 1000,
        transport: 1000,
        walkability: 1000, // New category for walkability infrastructure
        recreation: 1000,
        safety: 1000,
        accessibility: 1000,
        police: 1000,
        religious: 1000,
      };
      const maxDistance =
        decayConfig[f.category as keyof typeof decayConfig] || 1000;
      return f.distance <= maxDistance;
    });

  // Deduplicate facilities based on coordinates and name
  const uniqueFacilities = facilities.reduce((acc: Facility[], facility) => {
    const existingIndex = acc.findIndex((existing) => {
      // Check if coordinates are very close (within 50 meters - more lenient)
      const coordDistance = calculateDistance(
        existing.lat,
        existing.lng,
        facility.lat,
        facility.lng
      );

      // Check if names are similar (case-insensitive)
      const existingName = existing.name.toLowerCase().trim();
      const facilityName = facility.name.toLowerCase().trim();

      const nameSimilar =
        existingName === facilityName ||
        existingName.includes(facilityName) ||
        facilityName.includes(existingName) ||
        // Handle common variations
        (existingName.includes("sd") && facilityName.includes("sd")) ||
        (existingName.includes("sekolah") && facilityName.includes("sekolah"));

      const isDuplicate = coordDistance < 50 && nameSimilar;

      if (isDuplicate) {
        // Duplicate found
      }

      return isDuplicate;
    });

    if (existingIndex === -1) {
      acc.push(facility);
    } else {
      // Keep the one with better contribution score
      if (facility.contribution > acc[existingIndex].contribution) {
        acc[existingIndex] = facility;
      }
    }

    return acc;
  }, []);

  // Additional deduplication by ID (in case same element appears multiple times)
  const finalFacilities = uniqueFacilities.reduce(
    (acc: Facility[], facility) => {
      const existingIndex = acc.findIndex(
        (existing) => existing.id === facility.id
      );
      if (existingIndex === -1) {
        acc.push(facility);
      } else {
      }
      return acc;
    },
    []
  );

  return finalFacilities;
};

  // Calculate sub-scores using DISTANCE-BASED CONTRIBUTIONS
  // This is much more accurate than just counting facilities.
  // Example: A park 50m away (score 9.5) is worth more than a park 900m away (score 2.0)
  const calculateSubScores = (
    categoryScores: Record<string, number>, // Sum of contributions
    counts: Record<string, number> // Keep counts for specific logic if needed
  ) => {
    // Helper to cap score at 100
    const cap = (val: number) => Math.min(100, Math.round(val));

    // Services Score
    // Weighting: Health/Market are critical, Education/Religious are important
    // Base divisors loosely based on "target score" (e.g., getting 20-30 contribution points = great)
    const servicesScore = cap(
      categoryScores.health * 1.2 + // e.g. 2 good clinics (2x8=16) * 1.2 = ~19
        categoryScores.education * 1.0 +
        categoryScores.market * 0.8 + // Markets are common, lower weight to prevent saturation
        categoryScores.religious * 0.8
    );

    // Mobility Score
    // Transport nodes + Walkability quality
    const mobilityScore = cap(
      categoryScores.transport * 1.5 + categoryScores.walkability * 0.5
      // Walkability often has MANY items (lamps, benches), so lower weight per item prevents inflation
    );

    // Safety Score
    // Composed of Safety infra + Police + Hospital access + Accessibility
    const safetyScore = cap(
      categoryScores.safety * 0.6 + // Safety infra (lamps etc) is abundant, weight low
        categoryScores.police * 2.0 + // Police stations are rare, weight high
        categoryScores.health * 0.8 + // Hospital access aids safety
        categoryScores.accessibility * 1.0
    );

    // Environment Score
    // Recreation (Parks, etc)
    const environmentScore = cap(categoryScores.recreation * 2.5); // 4 good parks (4x10=40) * 2.5 = 100

    return {
      services: servicesScore,
      mobility: mobilityScore,
      safety: safetyScore,
      environment: environmentScore,
    };
  };

  // Main function to calculate livability score
export const calculateLivabilityScore = async (
  lat: number,
  lng: number,
  address: string
): Promise<{ data: LiveabilityData; facilities: Facility[] }> => {
  const allFacilities: Facility[] = [];
  
  // Track COUNT (quantity) for UI display
  const facilityCounts = {
    health: 0,
    education: 0,
    market: 0,
    transport: 0,
    walkability: 0,
    recreation: 0,
    safety: 0,
    accessibility: 0,
    police: 0,
    religious: 0,
  };

  // Track SCORE (quality/contribution sum) for calculation
  const categoryScores = {
    health: 0,
    education: 0,
    market: 0,
    transport: 0,
    walkability: 0,
    recreation: 0,
    safety: 0,
    accessibility: 0,
    police: 0,
    religious: 0,
  };

  // Query all categories in parallel for faster processing
  const categories = Object.keys(FACILITY_DISTANCES);

  // Helper helper to add delay
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  // Helper to fetch with retry logic
  const fetchCategoryWithRetry = async (
    category: string,
    lat: number,
    lng: number,
    retries = 3 // Increased retries
  ) => {
    // Check CACHE first to skip delay if possible
    const tempQuery = generateOverpassQuery(category, lat, lng);
    const formattedQuery = tempQuery
      .replace(/{lat}/g, lat.toString())
      .replace(/{lng}/g, lng.toString());
    
    // Hash needs to match what queryOverpassAPI uses: overpass-{hash}
    const cachedElements = cacheService.getCachedLocationData<any[]>(
      lat, 
      lng, 
      `overpass-${cacheUtils.hash(formattedQuery)}`
    );

    if (cachedElements) {
       console.log(`%c[Cache] ⚡ Hit for ${category}, skipping API call.`, "color: #8b5cf6");
       const facilities = processFacilities(cachedElements, category, lat, lng);
       return { category, facilities, status: "fulfilled", fromCache: true };
    }

    for (let i = 0; i <= retries; i++) {
      try {
        console.log(
          `%c[Overpass] Fetching ${category}... (Attempt ${i + 1}/${
            retries + 1
          })`,
          "color: #3b82f6"
        );
        const query = generateOverpassQuery(category, lat, lng);
        const elements = await queryOverpassAPI(query, lat, lng);
        const facilities = processFacilities(elements, category, lat, lng);
        console.log(
          `%c[Overpass] ✅ Success ${category}: Found ${facilities.length} items.`,
          "color: #22c55e"
        );
        return { category, facilities, status: "fulfilled", fromCache: false };
      } catch (error: any) {
        console.warn(
          `[Overpass] ⚠️ Failed ${category} (Attempt ${i + 1}):`,
          error
        );

        // Special handling for rate limits (429) or timeouts (504)
        const errorMessage = error.message || "";
        const isRateLimit = errorMessage.includes("429");
        const isTimeout = errorMessage.includes("504");

        if (i === retries) throw error; // Throw if last retry fails

        let waitTime = 2000 * (i + 1); // Default exponential: 2s, 4s, 6s

        if (isRateLimit) {
          console.log(
            `%c[Overpass] Hit Rate Limit! Cooling down for 5s...`,
            "color: #f59e0b"
          );
          waitTime = 5000; // Wait 5s specifically for rate limits
        }

        console.log(`[Overpass] Retrying ${category} in ${waitTime / 1000}s...`);
        await delay(waitTime);
      }
    }
    return { category, facilities: [], status: "rejected" };
  };

  // Execute requests SEQUENTIALLY to avoid Rate Limiting (429)
  const results = [];
  for (const category of categories) {
    try {
      const result = await fetchCategoryWithRetry(category, lat, lng);
      results.push(result);
      
      // Only delay if we actually hit the API (not from cache)
      if (!result.fromCache) {
         // Increased delay between SUCCESSFUL requests to be safer (2s)
         await delay(2000);
      }
    } catch (error) {
      console.error(
        `%c[Overpass] ❌ Final failure for ${category} after retries. Assuming 0 facilities.`,
        "color: #ef4444",
        error
      );
      results.push({ category, facilities: [], status: "fulfilled" });
    }
  }

  // Process results
  results.forEach((result) => {
    if (result && result.status === "fulfilled") {
      const { facilities } = result as any;
      allFacilities.push(...facilities);

      // Count facilities AND Sum Scores
      facilities.forEach((facility: Facility) => {
        if (facilityCounts.hasOwnProperty(facility.category)) {
          // Increment count
          facilityCounts[facility.category as keyof typeof facilityCounts]++;
          
          // Add contribution score logic
          // IMPORTANT: Cap widely available items to prevent massive inflation
          
          if (facility.category === 'walkability') {
             // Walkability items (paths, lights) are numerous/segmented. Reduce impact.
             const reducedContribution = facility.contribution * 0.25;
             categoryScores.walkability += reducedContribution;

             // CRITICAL FIX: Street lamps are captured by 'walkability' (Priority 8) but should also contribute to 'safety'
             const isLighting = 
                facility.tags?.highway === 'street_lamp' || 
                facility.tags?.lit === 'yes';
                
             if (isLighting) {
                 // Add to safety score as well (with same reduced weight)
                 categoryScores.safety += reducedContribution;
             }
          } 
          else if (facility.category === 'safety') {
             // Differentiate infrastructure (cameras) vs Major Services (Fire Stations)
             const isMajorSafety = 
                facility.tags?.amenity === 'fire_station';
             
             if (isMajorSafety) {
                 categoryScores.safety += facility.contribution; // Full value for Fire Stations
             } else {
                 categoryScores.safety += (facility.contribution * 0.25); // Reduced for cameras/infra
             }
          } else {
             categoryScores[facility.category as keyof typeof categoryScores] += facility.contribution;
          }
        }
      });
    }
  });

  // ===== ADD CUSTOM POIs =====
  const customPOIs = customPoiService.getPOIsNearLocation(lat, lng, 1000);

  const customFacilities: Facility[] = customPOIs.map((poi) => {
    const distance = calculateDistance(lat, lng, poi.lat, poi.lng);
    const contribution = calculateDistanceContribution(distance, poi.category);

    return {
      id: poi.id,
      name: `${poi.name} (Custom)`,
      category: poi.category === "custom" ? "recreation" : poi.category,
      lng: poi.lng,
      lat: poi.lat,
      distance: Math.round(distance),
      contribution,
      tags: { custom: true },
    };
  });

  // Add custom facilities to the main list
  allFacilities.push(...customFacilities);

  // Update facility counts with custom POIs
  customFacilities.forEach((facility) => {
    if (facilityCounts.hasOwnProperty(facility.category)) {
      facilityCounts[facility.category as keyof typeof facilityCounts]++;
      categoryScores[facility.category as keyof typeof categoryScores] += facility.contribution;
    }
  });
  // ===== END CUSTOM POI INTEGRATION =====

  // Calculate scores using the NEW contribution sums
  const subscores = calculateSubScores(categoryScores, facilityCounts);

  // Overall score is weighted average of sub-scores
  const overall =
    subscores.services * 0.3 +
    subscores.mobility * 0.25 +
    subscores.safety * 0.25 +
    subscores.environment * 0.2;

  const data: LiveabilityData = {
    overall,
    subscores,
    location: {
      address,
      coordinates: { lng, lat },
    },
    facilityCounts,
  };

  return { data, facilities: allFacilities };
};

// Initial empty state
export const getEmptyLivabilityData = (): LiveabilityData => ({
  overall: 0,
  subscores: {
    services: 0,
    mobility: 0,
    safety: 0,
    environment: 0,
  },
  location: null,
  facilityCounts: {
    health: 0,
    education: 0,
    market: 0,
    transport: 0,
    walkability: 0, // New category for walkability infrastructure
    recreation: 0,
    safety: 0,
    accessibility: 0,
    police: 0,
    religious: 0,
  },
});
