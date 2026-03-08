import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { supportedLanguages } from '@/i18n';
import { cn } from '@/lib/utils';
import { CountryFlag } from '@/components/CountryFlag';

interface LanguageSwitcherProps {
  compact?: boolean;
}

export const LanguageSwitcher = forwardRef<HTMLDivElement, LanguageSwitcherProps>(function LanguageSwitcher({ compact = false }, _ref) {
  const { i18n } = useTranslation();

  const currentLang = supportedLanguages.find((l) => l.code === i18n.language) ?? supportedLanguages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'text-muted-foreground hover:text-foreground',
            compact ? 'h-7 w-7 min-h-0 min-w-0' : 'h-9 w-9'
          )}
          aria-label="Change language"
        >
          <CountryFlag code={currentLang.code} className={cn(compact ? 'w-4 h-3' : 'w-5 h-3.5')} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {supportedLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onSelect={() => { void i18n.changeLanguage(lang.code); }}
            className={cn(
              'flex items-center gap-2 cursor-pointer',
              i18n.language === lang.code && 'bg-accent'
            )}
          >
            <CountryFlag code={lang.code} className="w-5 h-3.5" />
            <span>{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
