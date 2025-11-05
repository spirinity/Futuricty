import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, RefreshCw, Database } from 'lucide-react';
import { cacheService } from '@/services/cacheService';

const CacheManager: React.FC = () => {
  const [stats, setStats] = useState(cacheService.getStats());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(cacheService.getStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const clearCache = () => {
    cacheService.clear();
    setStats(cacheService.getStats());
  };

  const refreshStats = () => {
    setStats(cacheService.getStats());
  };

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 z-50"
        title="Cache Manager"
      >
        <Database className="w-4 h-4 mr-2" />
        Cache
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 left-4 z-50 w-80 bg-background/95 backdrop-blur-md border-border shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Cache Manager</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="h-6 w-6 p-0"
          >
            ×
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span>Cache Size:</span>
          <Badge variant="secondary" className="text-xs">
            {stats.size} / {stats.maxSize}
          </Badge>
        </div>
        
        <div className="text-xs text-muted-foreground">
          <div className="font-medium mb-1">Cached Keys:</div>
          <div className="max-h-20 overflow-y-auto space-y-1">
            {stats.keys.slice(0, 5).map((key, index) => (
              <div key={index} className="truncate text-xs">
                {key}
              </div>
            ))}
            {stats.keys.length > 5 && (
              <div className="text-xs text-muted-foreground">
                ... and {stats.keys.length - 5} more
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshStats}
            className="flex-1 text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Refresh
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={clearCache}
            className="flex-1 text-xs"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear All
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CacheManager;
