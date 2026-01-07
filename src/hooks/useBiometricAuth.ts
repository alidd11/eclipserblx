import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BiometricCredential {
  credentialId: string;
  rawId: string;
  userId: string;
}

export function useBiometricAuth() {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if WebAuthn is supported
  const checkSupport = useCallback(async () => {
    if (!window.PublicKeyCredential) {
      setIsSupported(false);
      return false;
    }

    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      setIsSupported(available);
      return available;
    } catch {
      setIsSupported(false);
      return false;
    }
  }, []);

  // Check if user has enrolled biometrics
  const checkEnrollment = useCallback((userId: string) => {
    const stored = localStorage.getItem(`biometric_credential_${userId}`);
    const enrolled = !!stored;
    setIsEnrolled(enrolled);
    return enrolled;
  }, []);

  // Enroll biometric credential
  const enrollBiometric = useCallback(async (userId: string, email: string) => {
    if (!isSupported) return { success: false, error: 'Biometric not supported' };

    setLoading(true);
    try {
      // Generate a challenge (in production, this should come from the server)
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: 'Eclipse Admin',
          id: window.location.hostname,
        },
        user: {
          id: Uint8Array.from(userId, c => c.charCodeAt(0)),
          name: email,
          displayName: email.split('@')[0],
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        return { success: false, error: 'Failed to create credential' };
      }

      // Store credential info locally
      const credentialData: BiometricCredential = {
        credentialId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
        rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
        userId,
      };

      localStorage.setItem(`biometric_credential_${userId}`, JSON.stringify(credentialData));
      setIsEnrolled(true);

      return { success: true };
    } catch (error: any) {
      console.error('Biometric enrollment error:', error);
      return { success: false, error: error.message || 'Enrollment failed' };
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  // Authenticate with biometric
  const authenticateWithBiometric = useCallback(async (userId: string) => {
    if (!isSupported) return { success: false, error: 'Biometric not supported' };

    const storedCredential = localStorage.getItem(`biometric_credential_${userId}`);
    if (!storedCredential) {
      return { success: false, error: 'No biometric credential found' };
    }

    setLoading(true);
    try {
      const credentialData: BiometricCredential = JSON.parse(storedCredential);
      
      // Generate a challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Decode the stored credential ID
      const rawIdArray = Uint8Array.from(atob(credentialData.rawId), c => c.charCodeAt(0));

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [{
          id: rawIdArray,
          type: 'public-key',
          transports: ['internal'],
        }],
        userVerification: 'required',
        timeout: 60000,
      };

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      }) as PublicKeyCredential;

      if (!assertion) {
        return { success: false, error: 'Authentication failed' };
      }

      return { success: true, userId: credentialData.userId };
    } catch (error: any) {
      console.error('Biometric authentication error:', error);
      if (error.name === 'NotAllowedError') {
        return { success: false, error: 'Authentication cancelled' };
      }
      return { success: false, error: error.message || 'Authentication failed' };
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  // Remove biometric enrollment
  const removeBiometric = useCallback((userId: string) => {
    localStorage.removeItem(`biometric_credential_${userId}`);
    setIsEnrolled(false);
  }, []);

  // Get stored user ID for biometric login
  const getStoredUserId = useCallback(() => {
    // Look for any stored biometric credential
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('biometric_credential_')) {
        const userId = key.replace('biometric_credential_', '');
        return userId;
      }
    }
    return null;
  }, []);

  return {
    isSupported,
    isEnrolled,
    loading,
    checkSupport,
    checkEnrollment,
    enrollBiometric,
    authenticateWithBiometric,
    removeBiometric,
    getStoredUserId,
  };
}
