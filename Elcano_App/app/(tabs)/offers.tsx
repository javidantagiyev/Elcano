import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { auth, db } from '../../firebaseConfig';
import { CollectionReference, Timestamp, collection, doc, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import ScreenContainer from '../../components/ScreenContainer';
import BalancePill from '../../components/BalancePill';
import SurfaceCard from '../../components/SurfaceCard';
import { palette, radius, shadow, spacing, typography } from '../../constants/ui';
import { redeemOffer } from '../../services/redemptions';
import { RootStackParamList } from '../../navigation/types';

interface Offer {
  id: string;
  partnerName: string;
  reward: string;
  coinCost: number;
  logoIcon?: keyof typeof Ionicons.glyphMap;
}

interface RedemptionEntry {
  id: string;
  offerId: string;
  partnerName: string;
  reward: string;
  coinCost: number;
  redeemedAt?: Timestamp;
}

const shuffle = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);

const DEMO_OFFERS: Offer[] = [
  {
    id: 'demo-cinnabon',
    partnerName: 'Cinnabon',
    reward: '10% off any roll',
    coinCost: 20,
    logoIcon: 'ice-cream-outline',
  },
  {
    id: 'demo-divan',
    partnerName: 'Divan Restaurant',
    reward: 'Free dessert',
    coinCost: 25,
    logoIcon: 'restaurant-outline',
  },
  {
    id: 'demo-paul',
    partnerName: 'Paul Café',
    reward: 'Free coffee with breakfast',
    coinCost: 18,
    logoIcon: 'cafe-outline',
  },
];

const useOffers = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [demoSelection] = useState<Offer[]>(() => shuffle(DEMO_OFFERS).slice(0, 3));

  useEffect(() => {
    const offersRef = collection(db, 'offers');
    const unsubscribe = onSnapshot(offersRef, (snapshot) => {
      const results = snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();

        return {
          id: docSnapshot.id,
          partnerName: data.partnerName ?? data.company ?? 'Partner',
          reward: data.reward ?? data.discount ?? 'Reward',
          coinCost: data.coinCost ?? data.cost ?? 0,
          logoIcon: data.logoIcon,
        } as Offer;
      });

      setOffers(results.length ? results : demoSelection);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [demoSelection]);

  return { offers, isLoading };
};

const useUserBalance = () => {
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return;
    }

    const profileRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(profileRef, (snapshot) => {
      const data = snapshot.data();
      setBalance(data?.coins ?? 0);
    });

    return unsubscribe;
  }, []);

  return balance;
};

const redemptionCollection = (uid: string): CollectionReference =>
  collection(doc(db, 'users', uid), 'redemptions');

export default function OffersScreen() {
  const { offers, isLoading } = useOffers();
  const balance = useUserBalance();
  const [redeemingOfferId, setRedeemingOfferId] = useState<string | null>(null);
  const [redemptions, setRedemptions] = useState<RedemptionEntry[]>([]);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return;
    }

    const redemptionQuery = query(
      redemptionCollection(currentUser.uid),
      orderBy('redeemedAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(redemptionQuery, (snapshot) => {
      const results = snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();

        return {
          id: docSnapshot.id,
          offerId: data.offerId,
          partnerName: data.partnerName,
          reward: data.reward,
          coinCost: data.coinCost ?? data.cost,
          redeemedAt: data.redeemedAt,
        } as RedemptionEntry;
      });

      setRedemptions(results);
    });

    return unsubscribe;
  }, []);

  const handleRedeem = async (offer: Offer) => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      Alert.alert('Please sign in', 'You need to be signed in to redeem offers.');
      return;
    }

    setRedeemingOfferId(offer.id);

    try {
      const redemption = await redeemOffer(currentUser.uid, offer.id, offer.coinCost, offer.id.startsWith('demo-'), {
        partnerName: offer.partnerName,
        reward: offer.reward,
      });

      navigation.navigate('OfferQR', {
        offerId: offer.id,
        partnerName: offer.partnerName,
        reward: offer.reward,
        redemptionId: redemption.id,
        expiresAt: redemption.expiresAt.toMillis(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to redeem offer right now.';

      if (message === 'INSUFFICIENT_COINS') {
        Alert.alert('Not enough coins', 'Earn more coins to redeem this offer.');
      } else {
        Alert.alert('Redemption failed', message);
      }
    } finally {
      setRedeemingOfferId(null);
    }
  };

  const canRedeem = useMemo(() => {
    return (offer: Offer) => balance >= offer.coinCost;
  }, [balance]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={styles.loadingText}>Loading offers...</Text>
      </View>
    );
  }

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Partner Offers</Text>
          <Text style={styles.subtitle}>Spend your coins on exclusive rewards.</Text>
        </View>
        <BalancePill amount={balance} />
      </View>

      {offers.length === 0 ? (
        <Text style={styles.placeholder}>New partner rewards will appear here soon.</Text>
      ) : (
        <View style={styles.cardList}>
          {offers.map((item) => {
            const isRedeeming = redeemingOfferId === item.id;
            const isDemo = item.id.startsWith('demo-');
            const hasBalance = canRedeem(item);

            return (
              <SurfaceCard key={item.id} style={styles.card}>
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <View style={styles.partnerMeta}>
                      <View style={styles.logoBadge}>
                        <Ionicons
                          name={item.logoIcon ?? 'gift-outline'}
                          size={18}
                          color={palette.primary}
                        />
                      </View>
                      <Text style={styles.partner} numberOfLines={1} ellipsizeMode="tail">
                        {item.partnerName}
                      </Text>
                    </View>
                    <View style={styles.costBadge}>
                      <Ionicons name="gift-outline" size={16} color={palette.primary} />
                      <Text style={styles.costText}>{item.coinCost}</Text>
                    </View>
                  </View>
                  <Text style={styles.reward} numberOfLines={2} ellipsizeMode="tail">
                    {item.reward}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.redeemButton, !hasBalance && styles.redeemButtonDisabled]}
                  onPress={() => handleRedeem(item)}
                  disabled={!hasBalance || isRedeeming}
                >
                  {isRedeeming ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.redeemText}>
                      {isDemo ? 'Try demo' : hasBalance ? 'Redeem' : 'Need more coins'}
                    </Text>
                  )}
                </TouchableOpacity>
              </SurfaceCard>
            );
          })}
        </View>
      )}

      <SurfaceCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent redemptions</Text>
          <Text style={styles.sectionCaption}>Last 10 rewards</Text>
        </View>

        {redemptions.length === 0 ? (
          <Text style={styles.placeholder}>Redeem an offer to see it tracked here.</Text>
        ) : (
          <View style={styles.historyList}>
            {redemptions.map((entry) => (
              <View key={entry.id} style={styles.historyRow}>
                <View style={styles.historyMeta}>
                  <Ionicons name="pricetag-outline" size={16} color={palette.mutedText} />
                  <View>
                    <Text style={styles.historyTitle}>{entry.reward}</Text>
                    <Text style={styles.historySubtitle}>{entry.partnerName}</Text>
                  </View>
                </View>
                <Text style={styles.historyCost}>-{entry.coinCost ?? 0}c</Text>
              </View>
            ))}
          </View>
        )}
      </SurfaceCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  title: { ...typography.headline },
  subtitle: { color: palette.mutedText, marginTop: spacing.xs },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: spacing.md, color: palette.mutedText },
  cardList: { gap: spacing.md, marginBottom: spacing.xl },
  card: { height: 168, justifyContent: 'space-between' },
  cardContent: { gap: spacing.sm, flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  partnerMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, marginRight: spacing.md },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: palette.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partner: { fontSize: 18, fontWeight: '700', color: palette.text },
  reward: { fontSize: 16, color: '#4A4A4A' },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.primarySurface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  costText: { marginLeft: spacing.xs, color: palette.primary, fontWeight: '700' },
  redeemButton: {
    backgroundColor: palette.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  redeemButtonDisabled: { backgroundColor: '#FFD7A3' },
  redeemText: { color: '#fff', fontWeight: '700' },
  placeholder: { color: palette.mutedText, textAlign: 'center', paddingVertical: spacing.md },
  section: { ...shadow.surface },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { ...typography.title },
  sectionCaption: { color: palette.mutedText, fontSize: 12 },
  historyList: { gap: spacing.md },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  historyMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  historyTitle: { color: palette.text, fontWeight: '600' },
  historySubtitle: { color: palette.mutedText, fontSize: 12 },
  historyCost: { color: palette.primary, fontWeight: '700' },
});
