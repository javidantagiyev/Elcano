import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import ScreenContainer from '../components/ScreenContainer';
import SurfaceCard from '../components/SurfaceCard';
import { palette, radius, spacing, typography } from '../constants/ui';
import { auth } from '../firebaseConfig';
import { useActiveRedemption } from '../hooks/useActiveRedemption';

const formatCountdown = (milliseconds: number) => {
  const safeMs = Math.max(milliseconds, 0);
  const minutes = Math.floor(safeMs / 60000);
  const seconds = Math.floor((safeMs % 60000) / 1000);

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

type Props = NativeStackScreenProps<RootStackParamList, 'OfferQR'>;

export default function OfferQRCodeScreen({ route, navigation }: Props) {
  const { offerId, partnerName, reward, redemptionId, expiresAt: initialExpiresAt } = route.params;
  const currentUserId = auth.currentUser?.uid ?? null;
  const lookupId = redemptionId ?? offerId;
  const { redemption: activeRedemption } = useActiveRedemption(currentUserId, lookupId);
  const expiresAtMs = activeRedemption?.expiresAt?.toMillis() ?? initialExpiresAt;
  const [remainingMs, setRemainingMs] = useState(expiresAtMs - Date.now());

  const isExpired = remainingMs <= 0;

  useEffect(() => {
    setRemainingMs(expiresAtMs - Date.now());

    const interval = setInterval(() => {
      setRemainingMs(expiresAtMs - Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAtMs]);

  useEffect(() => {
    navigation.setOptions({ headerShown: true, title: isExpired ? 'QR expired' : 'Redeem offer' });
  }, [isExpired, navigation]);

  const isDemo = activeRedemption?.isDemo ?? offerId.startsWith('demo-');
  const qrValue = useMemo(() => {
    const prefix = isDemo ? 'ELCANO-DEMO' : 'ELCANO-OFFER';
    const userSegment = isDemo ? '' : `-${currentUserId ?? 'unknown'}`;

    return `${prefix}-${offerId}${userSegment}`;
  }, [currentUserId, isDemo, offerId]);

  const qrUrl = useMemo(
    () => `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrValue)}`,
    [qrValue]
  );

  return (
    <ScreenContainer scrollable>
      <SurfaceCard style={styles.card}>
        <Text style={styles.partner}>{activeRedemption?.partnerName ?? partnerName}</Text>
        <Text style={styles.reward}>{activeRedemption?.reward ?? reward}</Text>

        <View style={styles.qrContainer}>
          <Image source={{ uri: qrUrl }} style={styles.qr} />
        </View>

        <View style={styles.countdownRow}>
          <Text style={styles.countdownLabel}>{isExpired ? 'Code expired' : 'Show this code at checkout'}</Text>
          <Text style={[styles.countdownValue, isExpired && styles.countdownExpired]}>{formatCountdown(remainingMs)}</Text>
        </View>

        {isExpired && (
          <Text style={styles.expiredMessage}>
            This QR code expired. Start a new redemption to generate a fresh code.
          </Text>
        )}
      </SurfaceCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  partner: { ...typography.title, textAlign: 'center' },
  reward: { ...typography.body, textAlign: 'center', color: palette.mutedText },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    backgroundColor: palette.primarySurface,
    borderRadius: radius.lg,
  },
  qr: { width: 260, height: 260, borderRadius: radius.md },
  countdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    padding: spacing.md,
    borderRadius: radius.md,
  },
  countdownLabel: { color: palette.mutedText, fontWeight: '600' },
  countdownValue: { ...typography.title, color: palette.primary },
  countdownExpired: { color: '#D12D2D' },
  expiredMessage: { color: '#D12D2D', textAlign: 'center' },
});
