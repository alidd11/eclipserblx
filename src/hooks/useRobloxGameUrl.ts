import { useRobloxSettings } from './useRobloxSettings';

export function useRobloxGameUrl() {
  const { settings } = useRobloxSettings();
  return { robloxUrl: settings?.roblox_game_url || '' };
}
