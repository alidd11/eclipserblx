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

interface LanguageSwitcherProps {
  compact?: boolean;
}

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
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
          <span className={cn('leading-none', compact ? 'text-base' : 'text-lg')} role="img" aria-label={currentLang.label}>
            {currentLang.flag}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {supportedLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={cn(
              'flex items-center gap-2 cursor-pointer',
              i18n.language === lang.code && 'bg-accent'
            )}
          >
            <span className="text-base leading-none" role="img" aria-label={lang.label}>{lang.flag}</span>
            <span>{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
