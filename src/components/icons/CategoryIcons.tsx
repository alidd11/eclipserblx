import { forwardRef } from 'react';

type IconProps = { className?: string };

// Police badge with star
export const PoliceIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ className, ...props }, ref) => (
    <svg ref={ref} className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l1.12 2.26L15.5 7.6l-1.64 1.6.39 2.3L12 10.27 9.75 11.5l.39-2.3L8.5 7.6l2.38-.34L12 5z" />
    </svg>
  )
);
PoliceIcon.displayName = 'PoliceIcon';

// Shield with slash for unmarked
export const UnmarkedPoliceIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ className, ...props }, ref) => (
    <svg ref={ref} className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 3.18L19 7.6v3.4c0 4.5-3.1 8.72-7 9.93-3.9-1.21-7-5.43-7-9.93V7.6l7-3.42zM7.56 8.2v2.8c0 3.42 2.36 6.62 4.44 7.6V8.2H7.56z" />
    </svg>
  )
);
UnmarkedPoliceIcon.displayName = 'UnmarkedPoliceIcon';

// Civilian car silhouette
export const CivilianCarIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ className, ...props }, ref) => (
    <svg ref={ref} className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
    </svg>
  )
);
CivilianCarIcon.displayName = 'CivilianCarIcon';

// Fire/flame
export const FireIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ className, ...props }, ref) => (
    <svg ref={ref} className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" />
    </svg>
  )
);
FireIcon.displayName = 'FireIcon';

// Ambulance cross
export const AmbulanceIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ className, ...props }, ref) => (
    <svg ref={ref} className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M18 7h-3V4c0-.55-.45-1-1-1H6c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h1c0 1.66 1.34 3 3 3s3-1.34 3-3h2c0 1.66 1.34 3 3 3s3-1.34 3-3h1c.55 0 1-.45 1-1v-3.33c0-.36-.2-.69-.51-.86L18 7zm-9 1H7V6h2v2zm4 0h-2V6h2v2zm5.5 4H17V9.5h1.17L19.5 12zM10 16.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm8 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
    </svg>
  )
);
AmbulanceIcon.displayName = 'AmbulanceIcon';

// Aircraft/plane
export const AircraftIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ className, ...props }, ref) => (
    <svg ref={ref} className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
  )
);
AircraftIcon.displayName = 'AircraftIcon';

// Uniform/shirt
export const UniformIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ className, ...props }, ref) => (
    <svg ref={ref} className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M21.6 4.2l-5.6-2.8-4 4-4-4L2.4 4.2C2.15 4.33 2 4.59 2 4.88V10c0 .55.45 1 1 1h3v9c0 .55.45 1 1 1h10c.55 0 1-.45 1-1v-9h3c.55 0 1-.45 1-1V4.88c0-.29-.15-.55-.4-.68zM12 4.4l1.94 1.94c.2-.07.4-.14.62-.18L12 3.6l-2.56 2.56c.22.04.42.11.62.18L12 4.4z" />
    </svg>
  )
);
UniformIcon.displayName = 'UniformIcon';

// Military star
export const MilitaryIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ className, ...props }, ref) => (
    <svg ref={ref} className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" />
    </svg>
  )
);
MilitaryIcon.displayName = 'MilitaryIcon';

// Map with fold lines
export const MapIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ className, ...props }, ref) => (
    <svg ref={ref} className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z" />
    </svg>
  )
);
MapIcon.displayName = 'MapIcon';

// Bundle/gift box
export const BundleIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ className, ...props }, ref) => (
    <svg ref={ref} className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 12 7.4l3.38 4.6L17 10.83 14.92 8H20v6z" />
    </svg>
  )
);
BundleIcon.displayName = 'BundleIcon';

// Bot/robot head
export const BotIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ className, ...props }, ref) => (
    <svg ref={ref} className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zM7.5 11.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S9.83 13 9 13s-1.5-.67-1.5-1.5zM16 17H8v-2h8v2zm-1-4c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13z" />
    </svg>
  )
);
BotIcon.displayName = 'BotIcon';

// Building
export const BuildingIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ className, ...props }, ref) => (
    <svg ref={ref} className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M15 11V5l-3-3-3 3v2H3v14h18V11h-6zm-8 8H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V9h2v2zm6 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V9h2v2zm0-4h-2V5h2v2zm6 12h-2v-2h2v2zm0-4h-2v-2h2v2z" />
    </svg>
  )
);
BuildingIcon.displayName = 'BuildingIcon';

// Scripts/code
export const ScriptsIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ className, ...props }, ref) => (
    <svg ref={ref} className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" />
    </svg>
  )
);
ScriptsIcon.displayName = 'ScriptsIcon';

// UI Layout
export const UIIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ className, ...props }, ref) => (
    <svg ref={ref} className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 12h2v5H7zm4-3h2v8h-2zm4-3h2v11h-2z" />
    </svg>
  )
);
UIIcon.displayName = 'UIIcon';

// Generic package fallback
export const PackageIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ className, ...props }, ref) => (
    <svg ref={ref} className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H4V4h16v16zM11 5h2v5h5v2h-5v5h-2v-5H6v-2h5V5z" />
    </svg>
  )
);
PackageIcon.displayName = 'PackageIcon';

// Map slug → icon component
export const categoryIconMap: Record<string, React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>> = {
  // Parent categories
  'vehicles': CivilianCarIcon,
  'models': PackageIcon,
  'vfxs': PackageIcon,
  'gear': UniformIcon,
  'misc': BundleIcon,
  'maps': MapIcon,
  'scripts-systems': ScriptsIcon,
  'buildings': BuildingIcon,
  'aircraft': AircraftIcon,
  // Subcategories (still used in product cards, filters, etc.)
  'civilian-vehicles': CivilianCarIcon,
  'marked-police-vehicles': PoliceIcon,
  'unmarked-police-vehicles': UnmarkedPoliceIcon,
  'fire-vehicles': FireIcon,
  'ambulance-vehicles': AmbulanceIcon,
  'military-vehicles': MilitaryIcon,
  'uniforms': UniformIcon,
  'bundle-deals': BundleIcon,
  'bots': BotIcon,
  'roblox-bots': BotIcon,
  'roblox-ui': UIIcon,
  'ui-kits': UIIcon,
};

// Map icon string name (from DB) → icon component
export const categoryIconByName: Record<string, React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>> = {
  'Car': CivilianCarIcon,
  'FileCode': ScriptsIcon,
  'Bot': BotIcon,
  'Layout': UIIcon,
  'Box': PackageIcon,
  'Palette': PackageIcon,
  'Wrench': PackageIcon,
  'Gamepad2': PackageIcon,
  'Package': BundleIcon,
  'Map': MapIcon,
  'Shirt': UniformIcon,
  'Plane': AircraftIcon,
  'Sparkles': PackageIcon,
  'Shield': PoliceIcon,
  'ShieldOff': UnmarkedPoliceIcon,
  'Flame': FireIcon,
  'Ambulance': AmbulanceIcon,
  'Swords': MilitaryIcon,
  'Building2': BuildingIcon,
};
