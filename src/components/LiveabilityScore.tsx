import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  GraduationCap, 
  ShieldCheck, 
  Car, 
  TrendingUp,
  MapPin
} from 'lucide-react';
import { useLanguage } from './LanguageProvider';

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
    recreation: number;
  };
}

interface LiveabilityScoreProps {
  data: {
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
  };
  className?: string;
}

const LiveabilityScore: React.FC<LiveabilityScoreProps> = ({ data, className }) => {
  const { t } = useLanguage();
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-environment';
    if (score >= 60) return 'text-services';
    if (score >= 40) return 'text-safety';
    return 'text-destructive';
  };

  const getScoreLevel = (score: number) => {
    if (score >= 80) return t('excellent');
    if (score >= 60) return t('good');
    if (score >= 40) return t('fair');
    return t('poor');
  };

  const subscoreItems = [
    {
      key: 'services',
      label: t('access.to.services'),
      icon: Heart,
      description: t('healthcare.education.markets'),
      color: 'services',
      count: data.facilityCounts.health + data.facilityCounts.education + data.facilityCounts.market + data.facilityCounts.religious
    },
    {
      key: 'mobility',
      label: t('mobility.transport'),
      icon: Car,
      description: t('public.transport.walkability'),
      color: 'mobility',
      count: data.facilityCounts.transport + data.facilityCounts.walkability
    },
    {
      key: 'safety',
      label: t('safety.security'),
      icon: ShieldCheck,
      description: t('public.safety.indicators'),
      color: 'safety',
      count: data.facilityCounts.safety + data.facilityCounts.police
    },
    {
      key: 'environment',
      label: t('environment'),
      icon: GraduationCap,
      description: t('green.spaces.air.quality'),
      color: 'environment',
      count: data.facilityCounts.recreation
    },

  ];

  if (!data.location) {
    return (
      <Card className={`${className} bg-gradient-card border-border shadow-sm hover:shadow-md transition-shadow duration-300`}>
        <CardHeader className="text-center py-6 md:py-8">
          <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-accent/80 rounded-full flex items-center justify-center mb-4 md:mb-5 shadow-sm">
            <MapPin className="w-6 h-6 md:w-8 md:h-8 text-primary" />
          </div>
          <CardTitle className="text-base md:text-lg text-muted-foreground mb-2">
            {t('select.location')}
          </CardTitle>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('click.map')}
          </p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 md:space-y-5 ${className}`}>
      {/* Overall Score */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <CardTitle className="text-sm md:text-base font-semibold">{t('livability.score')}</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground truncate max-w-[180px] md:max-w-[200px] leading-relaxed">
                {data.location.address}
              </p>
            </div>
            <div className="text-right ml-3">
              <div className={`text-2xl md:text-3xl font-bold ${getScoreColor(data.overall)} mb-1`}>
                {Math.round(data.overall)}
              </div>
              <Badge variant="secondary" className="text-xs px-2 py-1 rounded-full">
                {getScoreLevel(data.overall)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-4">
          <div className="w-full bg-muted/60 rounded-full h-2.5 mb-3 overflow-hidden">
            <div 
              className="h-2.5 rounded-full shadow-sm"
              style={{
                width: `${data.overall}%`,
                background: 'var(--gradient-score)'
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground px-1">
            <span className="hidden sm:inline">{t('poor.range')}</span>
            <span className="sm:hidden">{t('poor')}</span>
            <span className="hidden sm:inline">{t('fair.range')}</span>
            <span className="sm:hidden">{t('fair')}</span>
            <span className="hidden sm:inline">{t('good.range')}</span>
            <span className="sm:hidden">{t('good')}</span>
            <span className="hidden sm:inline">{t('excellent.range')}</span>
            <span className="sm:hidden">{t('excellent')}</span>
          </div>
        </CardContent>
      </Card>

      {/* Sub-scores */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <CardTitle className="text-sm md:text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              {t('score.breakdown')}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-0 pb-4">
          {subscoreItems.map((item) => {
            const score = data.subscores[item.key as keyof typeof data.subscores];
            const Icon = item.icon;
            
            return (
              <div key={item.key} className="space-y-2 p-2 rounded-lg bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`w-5 h-5 md:w-6 md:h-6 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${
                      item.color === 'services' ? 'bg-blue-500' :
                      item.color === 'mobility' ? 'bg-green-500' :
                      item.color === 'safety' ? 'bg-red-500' :
                      'bg-purple-500'
                    }`}>
                      <Icon className={`w-3 h-3 md:w-3.5 md:h-3.5 text-white`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-xs md:text-sm">{item.label}</div>
                      <div className="text-xs text-muted-foreground hidden sm:block leading-relaxed">{item.description}</div>
                    </div>
                  </div>
                  <div className="text-right ml-2">
                    <div className={`font-bold text-base ${getScoreColor(score)}`}>
                      {Math.round(score)}
                    </div>
                    {item.count > 0 && (
                      <div className="text-xs text-muted-foreground bg-background/60 px-2 py-0.5 rounded-full">
                        {item.count} {t('facilities')}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="h-1.5 rounded-full bg-primary"
                      style={{
                        width: `${score}%`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0</span>
                    <span>100</span>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>


    </div>
  );
};

export default LiveabilityScore;