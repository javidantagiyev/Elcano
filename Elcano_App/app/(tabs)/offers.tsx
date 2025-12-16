import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import {
  CollectionReference,
  Timestamp,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import ScreenContainer from '../../components/ScreenContainer';
import BalancePill from '../../components/BalancePill';
import SurfaceCard from '../../components/SurfaceCard';
import { palette, radius, shadow, spacing, typography } from '../../constants/ui';

interface Offer {
  id: string;
  partnerName: string;
  reward: string;
  coinCost: number;
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
    id: 'demo-coffee',
    partnerName: 'Bean Craft',
    reward: 'Free cold brew upgrade',
    coinCost: 25,
  },
  {
    id: 'demo-bike',
    partnerName: 'Spin Cycle',
    reward: '50% off first bike rental',
    coinCost: 30,
  },
  {
    id: 'demo-groceries',
    partnerName: 'Fresh Fields',
    reward: '$5 grocery coupon',
    coinCost: 20,
  },
  {
    id: 'demo-yoga',
    partnerName: 'Sunrise Yoga',
    reward: 'Complimentary drop-in class',
    coinCost: 15,
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
      if (offer.id.startsWith('demo-')) {
        setRedemptions((previous) => [
          {
            id: `demo-${Date.now()}`,
            offerId: offer.id,
            partnerName: offer.partnerName,
            reward: offer.reward,
            coinCost: offer.coinCost,
            redeemedAt: Timestamp.fromDate(new Date()),
          },
          ...previous,
        ]);
        Alert.alert('Saved as a demo reward', 'This sample offer was added locally. No coins were spent.');
        return;
      }

      // Transactions protect against race conditions when multiple redemptions occur at once.
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await transaction.get(userRef);

        if (!userSnap.exists()) {
          throw new Error('User profile not found.');
        }

        const userCoins = userSnap.data().coins ?? 0;

        if (userCoins < offer.coinCost) {
          throw new Error('INSUFFICIENT_COINS');
        }

        transaction.update(userRef, { coins: userCoins - offer.coinCost });

        const redemptionRef = doc(redemptionCollection(currentUser.uid));
        transaction.set(redemptionRef, {
          offerId: offer.id,
          partnerName: offer.partnerName,
          reward: offer.reward,
          coinCost: offer.coinCost,
          redeemedAt: serverTimestamp(),
        });
      });

      Alert.alert('Redeemed', `${offer.reward} from ${offer.partnerName} is now yours!`);
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
    <ScreenContainer>
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
        <FlatList
          data={offers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isRedeeming = redeemingOfferId === item.id;
            const isDemo = item.id.startsWith('demo-');
            const hasBalance = isDemo ? true : canRedeem(item);

            return (
              <SurfaceCard style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.partner}>{item.partnerName}</Text>
                  <View style={styles.costBadge}>
                    <Ionicons name="logo-bitcoin" size={16} color={palette.primary} />
                    <Text style={styles.costText}>{item.coinCost}</Text>
                  </View>
                </View>
                <Text style={styles.reward}>{item.reward}</Text>
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
          }}
        />
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
  listContent: { paddingBottom: spacing.xl },
  card: { marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  partner: { fontSize: 18, fontWeight: '700', color: palette.text },
  reward: { fontSize: 16, color: '#4A4A4A', marginBottom: spacing.md },
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
