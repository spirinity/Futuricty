interface SearchHistoryItem {
  id: string;
  query: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  timestamp: number;
}

class SearchHistoryService {
  private readonly STORAGE_KEY = 'futuricity_search_history';
  private readonly MAX_HISTORY_ITEMS = 10;

  // Get search history from localStorage
  getHistory(): SearchHistoryItem[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const history = JSON.parse(stored);
      // Sort by timestamp (most recent first)
      return history.sort((a: SearchHistoryItem, b: SearchHistoryItem) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error loading search history:', error);
      return [];
    }
  }

  // Add a new search to history
  addToHistory(query: string, address: string, coordinates: { lat: number; lng: number }): void {
    try {
      const history = this.getHistory();
      
      // Remove any existing entry with the same coordinates to avoid duplicates
      const filteredHistory = history.filter(
        item => !(item.coordinates.lat === coordinates.lat && item.coordinates.lng === coordinates.lng)
      );
      
      // Create new history item
      const newItem: SearchHistoryItem = {
        id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        query,
        address,
        coordinates,
        timestamp: Date.now()
      };
      
      // Add to beginning of array and limit to max items
      const updatedHistory = [newItem, ...filteredHistory].slice(0, this.MAX_HISTORY_ITEMS);
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  }

  // Remove a specific item from history
  removeFromHistory(id: string): void {
    try {
      const history = this.getHistory();
      const filteredHistory = history.filter(item => item.id !== id);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredHistory));
    } catch (error) {
      console.error('Error removing from search history:', error);
    }
  }

  // Clear all search history
  clearHistory(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  }

  // Get recent searches (last 5)
  getRecentSearches(): SearchHistoryItem[] {
    return this.getHistory().slice(0, 5);
  }

  // Check if a location is already in history
  isLocationInHistory(coordinates: { lat: number; lng: number }): boolean {
    const history = this.getHistory();
    return history.some(
      item => item.coordinates.lat === coordinates.lat && item.coordinates.lng === coordinates.lng
    );
  }
}

export const searchHistoryService = new SearchHistoryService();
export type { SearchHistoryItem };

