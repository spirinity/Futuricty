import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Users, Building2, Map } from 'lucide-react';
import { useUserMode } from './UserModeProvider';
import { useLanguage } from './LanguageProvider';

const UserModeToggle: React.FC = () => {
  const { mode, setMode } = useUserMode();
  const { t } = useLanguage();

  const getModeIcon = (currentMode: string) => {
    switch (currentMode) {
      case 'residents':
        return <Users className="w-4 h-4" />;
      case 'business-owner':
        return <Building2 className="w-4 h-4" />;
      case 'urban-planner':
        return <Map className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const getModeLabel = (currentMode: string) => {
    switch (currentMode) {
      case 'residents':
        return t('residents');
      case 'business-owner':
        return t('business');
      case 'urban-planner':
        return t('planner');
      default:
        return t('residents');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 px-3 flex items-center gap-2 hover:bg-primary hover:text-white">
          {getModeIcon(mode)}
          <span className="hidden xl:inline">{getModeLabel(mode)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => setMode('residents')}
          className={mode === 'residents' ? 'bg-accent' : ''}
        >
          <Users className="mr-2 h-4 w-4" />
          <span>{t('residents.mode')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setMode('business-owner')}
          className={mode === 'business-owner' ? 'bg-accent' : ''}
        >
          <Building2 className="mr-2 h-4 w-4" />
          <span>{t('business.owner.mode')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setMode('urban-planner')}
          className={mode === 'urban-planner' ? 'bg-accent' : ''}
        >
          <Map className="mr-2 h-4 w-4" />
          <span>{t('urban.planner.mode')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserModeToggle;
