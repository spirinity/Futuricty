import { Satellite } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SatelliteToggleProps {
  satelliteEnabled: boolean;
  onToggle: () => void;
}

export function SatelliteToggle({ satelliteEnabled, onToggle }: SatelliteToggleProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onToggle}
      className={`w-9 h-9 ${satelliteEnabled ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}
      title={satelliteEnabled ? 'Switch to street map' : 'Switch to satellite view'}
    >
      <Satellite className="h-[1.2rem] w-[1.2rem]" />
      <span className="sr-only">Toggle satellite view</span>
    </Button>
  );
}
