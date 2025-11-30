// Service for managing custom Points of Interest (POI)
// Stores data in localStorage for persistence

export interface CustomPOI {
  id: string;
  name: string;
  category: string;
  lng: number;
  lat: number;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "futuricity_custom_pois";

class CustomPoiService {
  // Get all custom POIs from localStorage
  getAllPOIs(): CustomPOI[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error("Error loading custom POIs:", error);
      return [];
    }
  }

  // Get POIs near a specific location (within radius in meters)
  getPOIsNearLocation(
    lat: number,
    lng: number,
    radiusMeters: number = 1000
  ): CustomPOI[] {
    const allPOIs = this.getAllPOIs();
    return allPOIs.filter((poi) => {
      const distance = this.calculateDistance(lat, lng, poi.lat, poi.lng);
      return distance <= radiusMeters;
    });
  }

  // Add a new custom POI
  addPOI(poi: Omit<CustomPOI, "id" | "createdAt" | "updatedAt">): CustomPOI {
    const newPOI: CustomPOI = {
      ...poi,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const pois = this.getAllPOIs();
    pois.push(newPOI);
    this.savePOIs(pois);

    return newPOI;
  }

  // Update an existing POI
  updatePOI(
    id: string,
    updates: Partial<Omit<CustomPOI, "id" | "createdAt">>
  ): CustomPOI | null {
    const pois = this.getAllPOIs();
    const index = pois.findIndex((p) => p.id === id);

    if (index === -1) return null;

    pois[index] = {
      ...pois[index],
      ...updates,
      updatedAt: Date.now(),
    };

    this.savePOIs(pois);
    return pois[index];
  }

  // Delete a POI
  deletePOI(id: string): boolean {
    const pois = this.getAllPOIs();
    const filtered = pois.filter((p) => p.id !== id);

    if (filtered.length === pois.length) return false;

    this.savePOIs(filtered);
    return true;
  }

  // Get POI by ID
  getPOIById(id: string): CustomPOI | null {
    const pois = this.getAllPOIs();
    return pois.find((p) => p.id === id) || null;
  }

  // Calculate distance between two coordinates (Haversine formula)
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
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
  }

  // Save POIs to localStorage
  private savePOIs(pois: CustomPOI[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pois));
    } catch (error) {
      console.error("Error saving custom POIs:", error);
    }
  }

  // Clear all custom POIs
  clearAllPOIs(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  // Export POIs as JSON
  exportPOIs(): string {
    const pois = this.getAllPOIs();
    return JSON.stringify(pois, null, 2);
  }

  // Import POIs from JSON
  importPOIs(jsonString: string): boolean {
    try {
      const imported = JSON.parse(jsonString);
      if (!Array.isArray(imported)) return false;

      const existing = this.getAllPOIs();
      const merged = [...existing, ...imported];
      this.savePOIs(merged);
      return true;
    } catch (error) {
      console.error("Error importing POIs:", error);
      return false;
    }
  }
}

// Export singleton instance
export const customPoiService = new CustomPoiService();
