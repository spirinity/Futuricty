import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Search, Loader2, History, X, Clock } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { cacheService } from "@/services/cacheService";
import {
  searchHistoryService,
  SearchHistoryItem,
} from "@/services/searchHistoryService";

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: string;
}

interface LocationSearchProps {
  onLocationSelect: (lng: number, lat: number, address: string) => void;
  className?: string;
}

const LocationSearch: React.FC<LocationSearchProps> = ({
  onLocationSelect,
  className,
}) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const debounceRef = useRef<NodeJS.Timeout>();
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
        setShowHistory(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load search history on component mount
  useEffect(() => {
    const history = searchHistoryService.getRecentSearches();
    setSearchHistory(history);
    console.log("Search history loaded:", history.length, "items");
  }, []);

  const searchLocation = async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsLoading(true);
    setShowResults(true); // Show dropdown immediately when searching
    try {
      const data = await cacheService.cacheSearchResults(
        searchQuery,
        async () => {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              searchQuery
            )}&limit=5&addressdetails=1`
          );
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        }
      );
      setResults(data);
    } catch (error) {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Hide history when user starts typing
    if (value.length > 0) {
      setShowHistory(false);
    }

    debounceRef.current = setTimeout(() => {
      searchLocation(value);
    }, 300);
  };

  const handleResultSelect = (result: SearchResult) => {
    const lng = parseFloat(result.lon);
    const lat = parseFloat(result.lat);
    onLocationSelect(lng, lat, result.display_name);
    setQuery(result.display_name);
    setShowResults(false);

    // Add to search history
    searchHistoryService.addToHistory(
      result.display_name,
      result.display_name,
      { lat, lng }
    );
    const updatedHistory = searchHistoryService.getRecentSearches();
    setSearchHistory(updatedHistory);
    console.log("Added to history, now have:", updatedHistory.length, "items");
  };

  const handleHistorySelect = (historyItem: SearchHistoryItem) => {
    onLocationSelect(
      historyItem.coordinates.lng,
      historyItem.coordinates.lat,
      historyItem.address
    );
    setQuery(historyItem.query);
    setShowHistory(false);
  };

  const handleRemoveHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    searchHistoryService.removeFromHistory(id);
    setSearchHistory(searchHistoryService.getRecentSearches());
  };

  const handleClearHistory = () => {
    searchHistoryService.clearHistory();
    setSearchHistory([]);
    setShowHistory(false);
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <Search
          className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${
            isLoading
              ? "text-primary"
              : query.length > 0
              ? "text-primary"
              : "text-muted-foreground"
          }`}
        />
        <Input
          type="text"
          placeholder={t("search.placeholder")}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (query.length >= 3 || isLoading) {
              setShowResults(true);
              setShowHistory(false);
            } else if (searchHistory.length > 0 && query.length === 0) {
              setShowHistory(true);
              setShowResults(false);
            }
          }}
          className={`pl-10 ${
            isLoading ? "pr-12" : "pr-10"
          } bg-card focus:border-primary focus:ring-primary text-sm md:text-base transition-all duration-200`}
        />
        {!isLoading && searchHistory.length > 0 && query.length === 0 && (
          <button
            type="button"
            onClick={() => {
              setShowHistory(!showHistory);
              setShowResults(false);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-muted rounded transition-colors"
            title="Search History"
          >
            <History className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
          </button>
        )}
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="w-4 h-4 text-primary animate-spin transition-opacity duration-200" />
          </div>
        )}
      </div>

      {(showResults || showHistory) && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-48 md:max-h-64 overflow-y-auto shadow-lg border-border">
          <div className="p-1">
            {showHistory && !showResults ? (
              // Show search history
              <div>
                <div className="flex items-center justify-between p-2 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Recent Searches
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearHistory}
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                  >
                    Clear All
                  </Button>
                </div>
                {searchHistory.length > 0 ? (
                  searchHistory.map((historyItem) => (
                    <Button
                      key={historyItem.id}
                      variant="ghost"
                      className="w-full justify-start text-left p-2 md:p-3 h-auto min-h-[44px] md:min-h-[48px] group"
                      onClick={() => handleHistorySelect(historyItem)}
                    >
                      <MapPin className="w-3 h-3 md:w-4 md:h-4 mr-2 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs md:text-sm truncate leading-tight text-foreground">
                          {historyItem.query}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTimeAgo(historyItem.timestamp)}
                        </div>
                      </div>
                      <button
                        onClick={(e) =>
                          handleRemoveHistoryItem(historyItem.id, e)
                        }
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                      >
                        <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </Button>
                  ))
                ) : (
                  <div className="flex items-center justify-center p-4 text-muted-foreground">
                    <span className="text-sm">No search history</span>
                  </div>
                )}
              </div>
            ) : showResults ? (
              // Show search results
              <div>
                {isLoading ? (
                  <div className="flex items-center justify-center p-4 text-muted-foreground">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin text-primary" />
                    <span className="text-sm">
                      {t("search.searching") || "Searching for locations..."}
                    </span>
                  </div>
                ) : results.length > 0 ? (
                  results.map((result) => (
                    <Button
                      key={result.place_id}
                      variant="ghost"
                      className="w-full justify-start text-left p-2 md:p-3 h-auto min-h-[44px] md:min-h-[48px]"
                      onClick={() => handleResultSelect(result)}
                    >
                      <MapPin className="w-3 h-3 md:w-4 md:h-4 mr-2 text-primary flex-shrink-0" />
                      <span className="text-xs md:text-sm truncate leading-tight">
                        {result.display_name}
                      </span>
                    </Button>
                  ))
                ) : query.length >= 3 ? (
                  <div className="flex items-center justify-center p-4 text-muted-foreground">
                    <span className="text-sm">
                      {t("search.no.results") || "No results found"}
                    </span>
                  </div>
                ) : query.length > 0 ? (
                  <div className="flex items-center justify-center p-4 text-muted-foreground">
                    <span className="text-sm">
                      {t("search.type.minimum") ||
                        "Type at least 3 characters to search"}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </Card>
      )}
    </div>
  );
};

export default LocationSearch;
