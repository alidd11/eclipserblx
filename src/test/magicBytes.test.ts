import { describe, it, expect } from 'vitest';
import { isBlockedExtension, verifyMagicBytes } from '@/lib/magicBytes';

describe('isBlockedExtension', () => {
  it('blocks .exe files', () => {
    expect(isBlockedExtension('malware.exe')).toBe(true);
  });

  it('blocks .bat files', () => {
    expect(isBlockedExtension('script.bat')).toBe(true);
  });

  it('blocks .ps1 files', () => {
    expect(isBlockedExtension('script.ps1')).toBe(true);
  });

  it('blocks case-insensitive', () => {
    expect(isBlockedExtension('VIRUS.EXE')).toBe(true);
  });

  it('allows .png files', () => {
    expect(isBlockedExtension('image.png')).toBe(false);
  });

  it('allows .lua files', () => {
    expect(isBlockedExtension('script.lua')).toBe(false);
  });

  it('allows .rbxl files', () => {
    expect(isBlockedExtension('game.rbxl')).toBe(false);
  });
});

describe('verifyMagicBytes', () => {
  it('detects PNG magic bytes', async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const file = new File([pngBytes], 'test.png', { type: 'image/png' });
    const result = await verifyMagicBytes(file);
    expect(result.isValid).toBe(true);
    expect(result.detectedType).toBe('image/png');
    expect(result.isSuspicious).toBe(false);
  });

  it('detects JPEG magic bytes', async () => {
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const file = new File([jpegBytes], 'test.jpg', { type: 'image/jpeg' });
    const result = await verifyMagicBytes(file);
    expect(result.isValid).toBe(true);
    expect(result.detectedType).toBe('image/jpeg');
  });

  it('flags type mismatch as suspicious', async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const file = new File([pngBytes], 'fake.exe', { type: 'application/x-msdownload' });
    const result = await verifyMagicBytes(file);
    expect(result.isSuspicious).toBe(true);
    expect(result.isValid).toBe(false);
  });

  it('accepts unknown file types', async () => {
    const unknownBytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0, 0, 0, 0, 0, 0, 0, 0]);
    const file = new File([unknownBytes], 'data.rbxl', { type: '' });
    const result = await verifyMagicBytes(file);
    expect(result.isValid).toBe(true);
    expect(result.detectedType).toBeNull();
  });
});
