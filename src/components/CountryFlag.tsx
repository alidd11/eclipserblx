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
      <rect width="60" height="30" fill="#009B3A" />
      <polygon points="30,3 57,15 30,27 3,15" fill="#FEDF00" />
      <circle cx="30" cy="15" r="7" fill="#002776" />
      <path d="M23,15 C23,12 26,9 30,9 C34,9 37,12 37,15" fill="none" stroke="#fff" strokeWidth="1" />
      <line x1="23" y1="15" x2="37" y2="15" stroke="#fff" strokeWidth="1" />
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
