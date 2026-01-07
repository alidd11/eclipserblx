import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'Contains uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'Contains lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'Contains a number', test: (p) => /\d/.test(p) },
  { label: 'Contains special character', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

export function getPasswordStrength(password: string): PasswordStrength {
  const score = requirements.filter((req) => req.test(password)).length;
  if (score >= 5) return 'strong';
  if (score >= 4) return 'good';
  if (score >= 3) return 'fair';
  return 'weak';
}

export function isPasswordStrongEnough(password: string): boolean {
  const strength = getPasswordStrength(password);
  return strength === 'good' || strength === 'strong';
}

export function PasswordStrengthMeter({ password, className }: PasswordStrengthMeterProps) {
  const analysis = useMemo(() => {
    const passedRequirements = requirements.filter((req) => req.test(password));
    const score = passedRequirements.length;
    
    let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
    let color = 'bg-destructive';
    
    if (score >= 5) {
      strength = 'strong';
      color = 'bg-green-500';
    } else if (score >= 4) {
      strength = 'good';
      color = 'bg-emerald-500';
    } else if (score >= 3) {
      strength = 'fair';
      color = 'bg-yellow-500';
    } else {
      strength = 'weak';
      color = 'bg-destructive';
    }
    
    return {
      score,
      strength,
      color,
      passedRequirements,
      percentage: (score / requirements.length) * 100,
    };
  }, [password]);

  if (!password) return null;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Strength Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span className={cn(
            'font-medium capitalize',
            analysis.strength === 'strong' && 'text-green-500',
            analysis.strength === 'good' && 'text-emerald-500',
            analysis.strength === 'fair' && 'text-yellow-500',
            analysis.strength === 'weak' && 'text-destructive',
          )}>
            {analysis.strength}
          </span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all duration-300 rounded-full', analysis.color)}
            style={{ width: `${analysis.percentage}%` }}
          />
        </div>
      </div>

      {/* Requirements Checklist */}
      <div className="grid grid-cols-1 gap-1">
        {requirements.map((req) => {
          const passed = req.test(password);
          return (
            <div
              key={req.label}
              className={cn(
                'flex items-center gap-2 text-xs transition-colors',
                passed ? 'text-green-500' : 'text-muted-foreground'
              )}
            >
              {passed ? (
                <Check className="h-3 w-3 shrink-0" />
              ) : (
                <X className="h-3 w-3 shrink-0" />
              )}
              <span>{req.label}</span>
            </div>
          );
        })}
      </div>

      {/* Tips for weak passwords */}
      {analysis.strength === 'weak' && password.length > 0 && (
        <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
          💡 Tip: Use a mix of letters, numbers, and symbols to create a stronger password.
        </p>
      )}
    </div>
  );
}
