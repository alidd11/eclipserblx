interface CountryFlagProps {
  code: string;
  className?: string;
}

const flags: Record<string, React.ReactNode> = {
  en: (
    <svg viewBox="0 0 60 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <clipPath id="en"><rect width="60" height="30" /></clipPath>
      <g clipPath="url(#en)">
        <rect width="60" height="30" fill="#012169" />
        <path d="M0 0L60 30M60 0L0 30" stroke="#fff" strokeWidth="6" />
        <path d="M0 0L60 30M60 0L0 30" stroke="#C8102E" strokeWidth="2" />
        <path d="M30 0V30M0 15H60" stroke="#fff" strokeWidth="10" />
        <path d="M30 0V30M0 15H60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  ),
  es: (
    <svg viewBox="0 0 60 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="30" fill="#AA151B" />
      <rect y="7.5" width="60" height="15" fill="#F1BF00" />
    </svg>
  ),
  pt: (
    <svg viewBox="0 0 60 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="30" fill="#009739" />
      <rect x="20" width="40" height="30" fill="#FFDF00" />
      <rect x="20" width="40" height="30" fill="#002776" />
      <polygon points="0,0 24,15 0,30" fill="#009739" />
      <polygon points="0,0 24,15 0,30" fill="#009B3A" />
      <rect width="24" height="30" fill="#009B3A" />
      <rect x="24" width="36" height="30" fill="#FEDF00" />
      <polygon points="30,6 44,15 30,24 16,15" fill="#002776" stroke="#002776" strokeWidth="0.5" />
      <circle cx="30" cy="15" r="5" fill="#fff" stroke="#002776" strokeWidth="0.5" />
    </svg>
  ),
  fr: (
    <svg viewBox="0 0 60 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="20" height="30" fill="#002395" />
      <rect x="20" width="20" height="30" fill="#fff" />
      <rect x="40" width="20" height="30" fill="#ED2939" />
    </svg>
  ),
  de: (
    <svg viewBox="0 0 60 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="10" fill="#000" />
      <rect y="10" width="60" height="10" fill="#DD0000" />
      <rect y="20" width="60" height="10" fill="#FFCC00" />
    </svg>
  ),
};

export function CountryFlag({ code, className = '' }: CountryFlagProps) {
  return (
    <span className={`inline-block rounded-sm overflow-hidden ${className}`}>
      {flags[code] ?? flags.en}
    </span>
  );
}
