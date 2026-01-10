import { useState } from 'react';
import { Music, Play, Volume2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  getSoundPreferences,
  saveSoundPreferences,
  previewSound,
  SOUND_OPTIONS,
  NOTIFICATION_TYPES,
  type SoundOption,
  type NotificationType,
  type SoundPreferences,
} from '@/lib/notificationSounds';
import { showSuccessNotification } from '@/lib/nativeNotification';

export function SoundCustomizationCard() {
  const [preferences, setPreferences] = useState<SoundPreferences>(getSoundPreferences);

  const handleSoundChange = (type: NotificationType, sound: SoundOption) => {
    const updated = { ...preferences, [type]: sound };
    setPreferences(updated);
    saveSoundPreferences(updated);
    showSuccessNotification('Sound Updated', `${NOTIFICATION_TYPES[type].label} sound set to ${SOUND_OPTIONS[sound].label}`);
  };

  const handleVolumeChange = (value: number[]) => {
    const vol = value[0];
    const updated = { ...preferences, volume: vol };
    setPreferences(updated);
    saveSoundPreferences(updated);
  };

  const handlePreview = (type: NotificationType) => {
    previewSound(preferences[type], preferences.volume);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Sound Customization
        </CardTitle>
        <CardDescription>
          Choose different sounds for each notification type
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Volume Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Volume
            </Label>
            <span className="text-sm text-muted-foreground">{preferences.volume}%</span>
          </div>
          <Slider
            value={[preferences.volume]}
            onValueChange={handleVolumeChange}
            max={100}
            min={0}
            step={5}
            className="w-full"
          />
        </div>

        {/* Sound Selection per Type */}
        <div className="space-y-4">
          {(Object.keys(NOTIFICATION_TYPES) as NotificationType[]).map((type) => (
            <div key={type} className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <Label className="text-sm font-medium">
                  {NOTIFICATION_TYPES[type].label}
                </Label>
                <p className="text-xs text-muted-foreground truncate">
                  {NOTIFICATION_TYPES[type].description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={preferences[type]}
                  onValueChange={(value: SoundOption) => handleSoundChange(type, value)}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SOUND_OPTIONS) as SoundOption[]).map((sound) => (
                      <SelectItem key={sound} value={sound}>
                        {SOUND_OPTIONS[sound].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handlePreview(type)}
                  disabled={preferences[type] === 'none'}
                  className="shrink-0"
                >
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
