    import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  Eye, 
  EyeOff, 
  Target,
  Loader2,
  MapPin,
  Sparkles,
  Download
} from 'lucide-react';
import { generatePdfReport } from '@/services/reportService';
import { generateLocationSummary } from '@/services/aiService';
import { useUserMode } from './UserModeProvider';
import { useLanguage } from './LanguageProvider';
import { useIsMobile } from '@/hooks/use-mobile';

interface ControlPanelProps {
  showRadius: boolean;
  onToggleRadius: () => void;
  radiusOptions: number[];
  isCalculating: boolean;
  selectedLocation: { lng: number; lat: number; address?: string } | null;
  onRecalculate: () => void;
  onAnalyzeLocation: () => void;
  hasCalculated: boolean;
  livabilityData?: {
    overall: number;
    subscores: {
      services: number;
      mobility: number;
      safety: number;
      environment: number;
    };
    facilityCounts: {
      health: number;
      education: number;
      market: number;
      transport: number;
      walkability: number;
      recreation: number;
      safety: number;
      accessibility: number;
      police: number;
      religious: number;
    };
  };
  facilities?: Array<{
    name: string;
    category: string;
    distance: number;
  }>;
  className?: string;
  onExportPdf?: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  showRadius,
  onToggleRadius,
  radiusOptions,
  isCalculating,
  selectedLocation,
  onRecalculate,
  onAnalyzeLocation,
  hasCalculated,
  livabilityData,
  facilities,
  className
}) => {
  const { t, language } = useLanguage();
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const isMobile = useIsMobile();
  const { mode: userMode } = useUserMode();
  const handleExport = useCallback(() => {
    if (!livabilityData || !selectedLocation?.address) return;
    const nearby = facilities?.slice(0, 8).map(f => `${f.name} (${Math.round(f.distance)}m)`) || [];
    generatePdfReport({
      address: selectedLocation.address,
      coordinates: { lat: selectedLocation.lat, lng: selectedLocation.lng },
      scores: {
        overall: livabilityData.overall,
        services: livabilityData.subscores.services,
        mobility: livabilityData.subscores.mobility,
        safety: livabilityData.subscores.safety,
        environment: livabilityData.subscores.environment,
      },
      facilityCounts: livabilityData.facilityCounts,
      nearbyFacilities: nearby,
      aiSummary,
      userMode,
      language,
    });
  }, [livabilityData, selectedLocation, facilities, aiSummary, userMode, language]);

  // Generate AI summary ONLY after ALL location analysis is complete (including facilities)
  useEffect(() => {
    if (hasCalculated && livabilityData && selectedLocation?.address && facilities && facilities.length > 0 && !isGeneratingSummary) {
      generateAISummary();
    }
  }, [hasCalculated, livabilityData, selectedLocation?.address, facilities]);

  // Clear AI summary when user mode or language changes to trigger regeneration
  useEffect(() => {
    setAiSummary('');
  }, [userMode, language]);

  const generateAISummary = useCallback(async () => {
    if (!livabilityData || !selectedLocation?.address) return;
    
    setIsGeneratingSummary(true);
    try {
      const nearbyFacilities = facilities?.slice(0, 5).map(f => `${f.name} (${f.distance}m)`) || [];
      
      const summary = await generateLocationSummary({
        address: selectedLocation.address,
        facilityCounts: livabilityData.facilityCounts,
        scores: {
          overall: livabilityData.overall,
          ...livabilityData.subscores
        },
        nearbyFacilities
      }, userMode, language);
      
      setAiSummary(summary);
    } catch (error) {
      setAiSummary('Unable to generate summary at this time.');
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [livabilityData, selectedLocation?.address, facilities, userMode, language]);

  return (
    <Card className={`bg-gradient-to-br from-background via-background/95 to-accent/5 border-border/50 shadow-lg backdrop-blur-sm ${className}`}>
      <CardContent className="p-6 space-y-6">
        
        {/* AI Analysis Section */}
        {hasCalculated && livabilityData && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 pb-2 border-b border-[hsl(var(--control-border))]">
              <div className="p-2 bg-[hsl(var(--control-bg-light))] rounded-lg">
                <Sparkles className="w-5 h-5 text-[hsl(var(--control-primary))]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[hsl(var(--control-primary))]">
                  AI Analysis - {userMode === 'residents' ? 'Residents' : userMode === 'business-owner' ? 'Business' : 'Urban Planning'}
                </h3>
                <p className="text-xs text-[hsl(var(--control-primary))]/70">
                  {userMode === 'residents' ? t('smart.insights.residents') : 
                   userMode === 'business-owner' ? t('business.opportunity.analysis') : 
                   t('urban.planning.insights')}
                </p>
              </div>
            </div>
            
            <div className="p-4 bg-gradient-to-r from-[hsl(var(--control-bg-light))] to-[hsl(var(--control-bg))] rounded-xl border border-[hsl(var(--control-border))] backdrop-blur-sm control-panel-box">
              {isGeneratingSummary ? (
                <div className="flex items-center gap-3 text-sm text-[hsl(var(--control-primary))]/80">
                  <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--control-primary))]" />
                  <span>{t('generating.ai.insights')}</span>
                </div>
              ) : aiSummary ? (
                <p className="text-sm text-[hsl(var(--control-primary))] leading-relaxed">
                  {aiSummary}
                </p>
              ) : (
                <div className="text-sm text-[hsl(var(--control-primary))]/70 text-center py-2">
                  {t('click.recalculate.ai.insights')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Current Location Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 pb-2 border-b border-[hsl(var(--control-border))]">
            <div className="p-2 bg-[hsl(var(--control-bg-light))] rounded-lg">
              <MapPin className="w-5 h-5 text-[hsl(var(--control-primary))]" />
            </div>
                          <div>
                              <h3 className="text-sm font-semibold text-[hsl(var(--control-primary))]">
                  {userMode === 'residents' ? t('current.location.residents') : 
                   userMode === 'business-owner' ? t('current.location.business') : 
                   t('current.location.planning')}
                </h3>
                <p className="text-xs text-[hsl(var(--control-primary))]/70">
                  {userMode === 'residents' ? t('selected.area.analysis') : 
                   userMode === 'business-owner' ? t('selected.area.business') : 
                   t('selected.area.planning')}
                </p>
            </div>
          </div>
          
          {selectedLocation ? (
            <div className="space-y-3">
              <div className="p-4 bg-gradient-to-r from-[hsl(var(--control-bg-light))] to-[hsl(var(--control-bg))] rounded-xl border border-[hsl(var(--control-border))] control-panel-box">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 mt-0.5 text-[hsl(var(--control-primary))] flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[hsl(var(--control-primary))] break-words leading-tight">
                      {selectedLocation.address || t('loading.address')}
                    </p>
                    <p className="text-xs text-[hsl(var(--control-primary))]/70 mt-1 font-mono">
                      {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                    </p>
                  </div>
                </div>
              </div>
              
              {!hasCalculated ? (
                <Button
                  onClick={onAnalyzeLocation}
                  disabled={isCalculating}
                  size="sm"
                  className="w-full h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-xl hover:shadow-2xl transition-all duration-200"
                >
                  {isCalculating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {userMode === 'residents' ? t('analyzing.location') : 
                       userMode === 'business-owner' ? t('analyzing.business.data') : 
                       t('analyzing.planning.data')}
                    </>
                  ) : (
                    <>
                      <Target className="w-4 h-4 mr-2" />
                      {userMode === 'residents' ? t('analyze.location') : 
                       userMode === 'business-owner' ? t('analyze.business.potential') : 
                       t('analyze.planning.data')}
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={onRecalculate}
                  disabled={isCalculating}
                  size="sm"
                  variant="outline"
                  className="w-full h-11 border-2 border-[hsl(var(--control-primary))] hover:bg-[hsl(var(--control-primary))]/10 text-[hsl(var(--control-primary))] transition-all duration-200"
                >
                  {isCalculating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {userMode === 'residents' ? t('recalculating') : 
                       userMode === 'business-owner' ? t('recalculating.business.data') : 
                       t('recalculating.planning.data')}
                    </>
                  ) : (
                    <>
                      <Target className="w-4 h-4 mr-2" />
                      {userMode === 'residents' ? t('recalculate.score') : 
                       userMode === 'business-owner' ? t('recalculate.business.data') : 
                       t('recalculate.planning.data')}
                    </>
                  )}
                </Button>
              )}
              {hasCalculated && livabilityData && (
                <Button
                  onClick={handleExport}
                  disabled={isCalculating}
                  size="sm"
                  className="w-full h-11 mt-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-xl hover:shadow-2xl transition-all duration-200"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              )}
            </div>
          ) : (
            <div className="p-4 bg-[hsl(var(--control-bg-light))] rounded-xl border border-[hsl(var(--control-border))] text-center control-panel-box">
              <MapPin className="w-10 h-10 mx-auto text-[hsl(var(--control-primary))] mb-2" />
              <p className="text-sm text-[hsl(var(--control-primary))]">
                {userMode === 'residents' ? t('no.location.selected.residents') : 
                 userMode === 'business-owner' ? t('no.location.selected.business') : 
                 t('no.location.selected.planning')}
              </p>
              <p className="text-xs text-[hsl(var(--control-primary))]/70 mt-1">
                {userMode === 'residents' ? t('click.map.choose.residents') : 
                 userMode === 'business-owner' ? t('click.map.choose.business') : 
                 t('click.map.choose.planning')}
              </p>
            </div>
          )}
        </div>

        {/* Facility Counts Section */}
        {livabilityData && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 pb-2 border-b border-[hsl(var(--control-border))]">
              <div className="p-2 bg-[hsl(var(--control-bg-light))] rounded-lg">
                <div className="w-5 h-5 bg-[hsl(var(--control-primary))] rounded-full"></div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[hsl(var(--control-primary))]">{t('facility.counts')}</h3>
                <p className="text-xs text-[hsl(var(--control-primary))]/70">{t('found.in.selected.area')}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-red-500/10 to-pink-500/10 rounded-xl border border-border/30">
                              <span className="text-sm text-foreground font-medium">{t('health.emoji')}</span>
              <span className="text-lg font-bold text-red-500">{livabilityData.facilityCounts.health}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl border border-border/30">
                              <span className="text-sm text-foreground font-medium">{t('education.emoji')}</span>
              <span className="text-lg font-bold text-blue-500">{livabilityData.facilityCounts.education}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl border border-border/30">
                              <span className="text-sm text-foreground font-medium">{t('markets.emoji')}</span>
              <span className="text-lg font-bold text-amber-500">{livabilityData.facilityCounts.market}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-purple-500/10 to-violet-500/10 rounded-xl border border-border/30">
              <span className="text-sm text-foreground font-medium">{t('transport.emoji')}</span>
              <span className="text-lg font-bold text-purple-500">{livabilityData.facilityCounts.transport}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl border border-border/30">
              <span className="text-sm text-foreground font-medium">{t('walkability.emoji')}</span>
              <span className="text-lg font-bold text-orange-500">{livabilityData.facilityCounts.walkability}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 rounded-xl border border-border/30">
              <span className="text-sm text-foreground font-medium">{t('recreation.emoji')}</span>
              <span className="text-lg font-bold text-teal-500">{livabilityData.facilityCounts.recreation}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-border/30">
              <span className="text-sm text-foreground font-medium">{t('safety.emoji')}</span>
              <span className="text-lg font-bold text-green-500">{livabilityData.facilityCounts.safety}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-indigo-500/10 to-blue-500/10 rounded-xl border border-border/30">
              <span className="text-sm text-foreground font-medium">{t('police.emoji')}</span>
              <span className="text-lg font-bold text-indigo-500">{livabilityData.facilityCounts.police}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-gray-500/10 to-slate-500/10 rounded-xl border border-border/30">
              <span className="text-sm text-foreground font-medium">{t('religious.emoji')}</span>
              <span className="text-lg font-bold text-gray-500">{livabilityData.facilityCounts.religious}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-xl border border-border/30">
              <span className="text-sm text-foreground font-medium">{t('accessibility.emoji')}</span>
              <span className="text-lg font-bold text-pink-500">{livabilityData.facilityCounts.accessibility}</span>
              </div>
            </div>
          </div>
        )}

        {/* Nearby Facilities Section */}
        {facilities && facilities.length > 0 && (() => {
          // Filter facilities: within 500m, exclude safety and walkability
          const filteredFacilities = facilities.filter(facility => 
            facility.distance <= 500 && 
            facility.category !== 'safety' && 
            facility.category !== 'walkability'
          ).sort((a, b) => a.distance - b.distance); // Sort by distance (nearest first)
          
          return (
          <div className="space-y-3">
              <div className="flex items-center gap-3 pb-2 border-b border-[hsl(var(--control-border))]">
                <div className="p-2 bg-[hsl(var(--control-bg-light))] rounded-lg">
                  <div className="w-5 h-5 bg-[hsl(var(--control-primary))] rounded-full"></div> 
              </div>
              <div>
                  <h3 className="text-sm font-semibold text-[hsl(var(--control-primary))]">{t('nearby.facilities')}</h3>
                                  <p className="text-xs text-[hsl(var(--control-primary))]/70">
                  {t('nearby.facilities.description')}
                </p>
                </div>
            </div>
            
              {filteredFacilities.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {filteredFacilities.map((facility, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gradient-to-r from-accent/20 to-accent/10 rounded-xl border border-border/30 hover:bg-accent/30 transition-all duration-200">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{facility.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{facility.category}</p>
                  </div>
                  <span className="text-sm bg-background/80 backdrop-blur-sm border border-border/50 px-3 py-1.5 rounded-full ml-3 font-medium text-foreground">
                    {facility.distance}{t('meters')}
                  </span>
                </div>
              ))}
            </div>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {t('no.facilities.found')}
                </div>
              )}
            </div>
          );
        })()}

        {/* Map Control Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 pb-2 border-b border-[hsl(var(--control-border))]">
            <div className="p-2 bg-[hsl(var(--control-bg-light))] rounded-lg">
              {showRadius ? <Eye className="w-5 h-5 text-[hsl(var(--control-primary))]" /> : <EyeOff className="w-5 h-5 text-[hsl(var(--control-primary))]" />}
            </div>
            <div className="flex-1">
                              <h3 className="text-sm font-semibold text-[hsl(var(--control-primary))]">{t('map.controls')}</h3>
                              <p className="text-xs text-[hsl(var(--control-primary))]/70">{t('map.controls.description')}</p>
            </div>
            <Switch
              id="radius-toggle"
              checked={showRadius}
              onCheckedChange={onToggleRadius}
              disabled={!hasCalculated}
              className="facility-switch"
            />
          </div>
          
          <div className="p-3 bg-gradient-to-r from-[hsl(var(--control-bg-light))] to-[hsl(var(--control-bg))] rounded-xl border border-[hsl(var(--control-border))] control-panel-box-medium">
            <p className="text-xs text-[hsl(var(--control-primary))]/70 text-center">
                              {t('available.radius.options')} {radiusOptions.join(t('meters') + ', ')}{t('meters')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ControlPanel;
