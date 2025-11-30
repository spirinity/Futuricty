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
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes
  private readonly maxSize = 100; // Maximum cache entries

  // Generate cache key from parameters
  private generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${params[key]}`)
      .join("|");
    return `${prefix}:${sortedParams}`;
  }

  // Get cached data
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if entry is expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  // Set cached data
  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  // Clear specific cache entry
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys()),
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
