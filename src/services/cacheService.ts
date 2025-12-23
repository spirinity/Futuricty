// Cache service for API responses and computed data
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
}

class CacheService {
  private readonly STORAGE_PREFIX = "f_cache_";
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes
  private readonly maxSize = 100; // Limit entries to avoid localStorage bloat

  constructor() {
    this.prune();
  }

  // Generate cache key from parameters
  private generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${params[key]}`)
      .join("|");
    return `${prefix}:${sortedParams}`;
  }

  // Get full storage key
  private getStorageKey(key: string): string {
    return `${this.STORAGE_PREFIX}${key}`;
  }

  // Prune expired or excessive entries
  private prune(): void {
    try {
      const keys = [];
      const now = Date.now();

      // Gather all our keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_PREFIX)) {
          keys.push(key);
        }
      }

      // Check expiry and collect valid entries
      const validEntries: { key: string; timestamp: number }[] = [];

      keys.forEach((key) => {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const parsed = JSON.parse(item);
            if (now - parsed.timestamp > parsed.ttl) {
              localStorage.removeItem(key); // Remove expired
            } else {
              validEntries.push({ key, timestamp: parsed.timestamp });
            }
          }
        } catch (e) {
          localStorage.removeItem(key); // Remove corrupted
        }
      });

      // Enforce Max Size (remove oldest)
      if (validEntries.length > this.maxSize) {
        validEntries.sort((a, b) => a.timestamp - b.timestamp); // Oldest first
        const toRemove = validEntries.slice(0, validEntries.length - this.maxSize);
        toRemove.forEach((entry) => localStorage.removeItem(entry.key));
      }
    } catch (e) {
      console.warn("Failed to prune cache:", e);
    }
  }

  // Get cached data
  get<T>(key: string): T | null {
    try {
      const storageKey = this.getStorageKey(key);
      const item = localStorage.getItem(storageKey);
      
      if (!item) return null;

      const entry: CacheEntry<T> = JSON.parse(item);

      // Check if entry is expired
      if (Date.now() - entry.timestamp > entry.ttl) {
        localStorage.removeItem(storageKey);
        return null;
      }

      return entry.data;
    } catch (e) {
      console.error("Cache read error:", e);
      return null;
    }
  }

  // Set cached data
  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    try {
      const storageKey = this.getStorageKey(key);
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      
      try {
        localStorage.setItem(storageKey, JSON.stringify(entry));
      } catch (e: any) {
        // Handle QuotaExceededError
        if (e.name === "QuotaExceededError" || e.code === 22) {
          this.prune(); // Try to make space
          try {
             // Try one more time
             localStorage.setItem(storageKey, JSON.stringify(entry));
          } catch(retryError) {
             console.warn("Cache quota exceeded, could not save entry.");
          }
        }
      }
    } catch (e) {
      console.error("Cache write error:", e);
    }
  }

  // Clear specific cache entry
  delete(key: string): boolean {
    try {
      localStorage.removeItem(this.getStorageKey(key));
      return true;
    } catch {
      return false;
    }
  }

  // Clear all cache
  clear(): void {
    try {
       const keysToRemove = [];
       for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.error("Cache clear error:", e);
    }
  }

  // Get cache statistics
  getStats() {
    // Rough estimate based on keys starting with prefix
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
        if (localStorage.key(i)?.startsWith(this.STORAGE_PREFIX)) count++;
    }
    return {
      size: count,
      maxSize: this.maxSize,
      keys: [], // Too expensive to list all keys in stat
    };
  }

  // Cache API call with automatic key generation
  async cacheAPI<T>(
    prefix: string,
    params: Record<string, any>,
    fetchFn: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const key = this.generateKey(prefix, params);

    // Try to get from cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const data = await fetchFn();

    // Cache the result
    this.set(key, data, ttl);

    return data;
  }

  // Cache location-specific data with longer TTL
  async cacheLocationData<T>(
    lat: number,
    lng: number,
    dataType: string,
    fetchFn: () => Promise<T>,
    ttl: number = 30 * 60 * 1000 // 30 minutes for location data
  ): Promise<T> {
    // Round to 3 decimal places (~111 meters precision)
    // This ensures nearby locations share the same cache for consistency
    return this.cacheAPI(
      `location-${dataType}`,
      { lat: lat.toFixed(3), lng: lng.toFixed(3) },
      fetchFn,
      ttl
    );
  }

  // Get cached location data without fetching
  getCachedLocationData<T>(
    lat: number,
    lng: number,
    dataType: string
  ): T | null {
    const key = this.generateKey(`location-${dataType}`, {
      lat: lat.toFixed(3),
      lng: lng.toFixed(3),
    });
    return this.get<T>(key);
  }

  // Cache search results with shorter TTL
  async cacheSearchResults<T>(
    query: string,
    fetchFn: () => Promise<T>,
    ttl: number = 10 * 60 * 1000 // 10 minutes for search results
  ): Promise<T> {
    return this.cacheAPI(
      "search",
      { query: query.toLowerCase().trim() },
      fetchFn,
      ttl
    );
  }

  // Cache AI responses with medium TTL
  async cacheAIResponse<T>(
    prompt: string,
    userMode: string,
    language: string,
    fetchFn: () => Promise<T>,
    ttl: number = 60 * 60 * 1000 // 1 hour for AI responses
  ): Promise<T> {
    return this.cacheAPI(
      "ai-response",
      {
        prompt: prompt.substring(0, 100), // Truncate long prompts
        userMode,
        language,
      },
      fetchFn,
      ttl
    );
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Utility functions for common caching patterns
export const cacheUtils = {
  // Generate hash for cache keys
  hash: (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  },

  // Debounce function for API calls
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  // Throttle function for API calls
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },
};
