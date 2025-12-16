import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Timestamp, doc, onSnapshot } from 'firebase/firestore';
import ScreenContainer from '../../components/ScreenContainer';
import SurfaceCard from '../../components/SurfaceCard';
import { palette, radius, shadow, spacing, typography } from '../../constants/ui';
import { auth, db, signOutUser } from '../../firebaseConfig';
import { RootStackParamList } from '../../navigation/types';
import { updateUserProfile } from '../../services/userProfile';
import PermissionRow from '../../components/PermissionRow';
import { usePermissions } from '../../context/PermissionsContext';

interface ProfileData {
  uid: string;
  name: string;
  email: string;
  age: number;
  totalSteps: number;
  coins: number;
  achievements: string[];
  createdAt?: Timestamp;
}

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [ageInput, setAgeInput] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const {
    motionStatus,
    notificationStatus,
    locationStatus,
    requestMotionPermission,
    requestNotificationPermission,
    requestLocationPermission,
    refreshPermissions,
  } = usePermissions();

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const profileRef = doc(db, 'users', currentUser.uid);

    const unsubscribe = onSnapshot(profileRef, (snapshot) => {
      const data = snapshot.data();

      if (!data) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setProfile({
        uid: data.uid ?? currentUser.uid,
        name: data.name ?? '',
        email: data.email ?? currentUser.email ?? '',
        age: data.age ?? 0,
        totalSteps: data.totalSteps ?? 0,
        coins: data.coins ?? 0,
        achievements: data.achievements ?? [],
        createdAt: data.createdAt,
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      void refreshPermissions();
    });

    return unsubscribe;
  }, [navigation, refreshPermissions]);

  const memberSince = useMemo(() => {
    if (!profile?.createdAt) return '';

    const createdDate = profile.createdAt.toDate();
    return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(createdDate);
  }, [profile]);

  const initials = useMemo(() => {
    if (profile?.name) {
      return profile.name
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase())
        .join('')
        .slice(0, 2);
    }

    if (profile?.email) {
      return profile.email[0]?.toUpperCase();
    }

    return 'U';
  }, [profile]);

  const startEditing = () => {
    if (!profile) return;

    setNameInput(profile.name);
    setAgeInput(profile.age ? String(profile.age) : '');
    setStatusMessage('');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!profile) return;

    const trimmedName = nameInput.trim();
    const numericAge = Number(ageInput);

    if (!trimmedName) {
      setStatusMessage('Please enter your name before saving.');
      return;
    }

    if (!Number.isFinite(numericAge) || numericAge <= 0) {
      setStatusMessage('Please enter a valid age.');
      return;
    }

    try {
      setSaving(true);
      setStatusMessage('');
      await updateUserProfile(profile.uid, { name: trimmedName, age: numericAge });
      setIsEditing(false);
      setStatusMessage('Profile updated successfully.');
    } catch (error) {
      console.error('Failed to update profile', error);
      setStatusMessage('Unable to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOutUser();
    navigation.reset({
      index: 0,
      routes: [{ name: 'AuthStack' }],
    });
  };

  const renderProfileInfo = () => {
    if (loading) {
      return (
        <View style={styles.loadingState}>
          <ActivityIndicator color={palette.primary} />
          <Text style={styles.loadingText}>Loading your profile…</Text>
        </View>
      );
    }

    if (!profile) {
      return (
        <View style={styles.loadingState}>
          <Text style={styles.loadingText}>We could not load your profile.</Text>
        </View>
      );
    }

    if (isEditing) {
      return (
        <SurfaceCard style={styles.formCard}>
          <Text style={styles.sectionTitle}>Edit profile</Text>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Your name"
              style={styles.input}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Age</Text>
            <TextInput
              value={ageInput}
              onChangeText={setAgeInput}
              placeholder="18"
              style={styles.input}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{profile.email || 'Not provided'}</Text>
            <Text style={styles.helperText}>Email changes require account support.</Text>
          </View>

          {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryButton, saving && styles.disabledButton]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Save changes</Text>}
          </TouchableOpacity>
        </SurfaceCard>
      );
    }

    return (
      <>
        <SurfaceCard style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Your progress</Text>
          <View style={styles.statRow}>
            <View style={styles.statBlock}>
              <Text style={styles.label}>Coins</Text>
              <Text style={styles.statValue}>{profile.coins}</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.label}>Total steps</Text>
              <Text style={styles.statValue}>{profile.totalSteps}</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.label}>Achievements</Text>
              <Text style={styles.statValue}>{profile.achievements.length}</Text>
            </View>
          </View>
        </SurfaceCard>

        <SurfaceCard style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Profile details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Full name</Text>
            <Text style={styles.value}>{profile.name || 'Not set'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{profile.email || 'Not set'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Age</Text>
            <Text style={styles.value}>{profile.age || '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Member since</Text>
            <Text style={styles.value}>{memberSince || '—'}</Text>
          </View>
        </SurfaceCard>
      </>
    );
  };

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.headerMeta}>
          <Text style={styles.name}>{profile?.name || 'Your profile'}</Text>
          <Text style={styles.email}>{profile?.email || ''}</Text>
        </View>
        <TouchableOpacity
          style={[styles.secondaryButton, isEditing && styles.secondaryButtonActive]}
          onPress={isEditing ? () => setIsEditing(false) : startEditing}
        >
          <Text style={styles.secondaryButtonText}>{isEditing ? 'Cancel' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>

      {renderProfileInfo()}

      <SurfaceCard style={styles.permissionsCard}>
        <Text style={styles.sectionTitle}>Privacy & Permissions</Text>
        <Text style={styles.sectionCaption}>
          Choose what Elcano can access. We only ask when you tap a button.
        </Text>

        <PermissionRow
          title="Motion / Activity Recognition"
          description="Needed to count your steps so we can award coins for your movement."
          status={motionStatus}
          onEnable={requestMotionPermission}
        />

        <PermissionRow
          title="Notifications"
          description="Stay on track with gentle reminders and goal celebrations."
          status={notificationStatus}
          onEnable={requestNotificationPermission}
        />

        <PermissionRow
          title="Location (optional)"
          description="Share location to unlock nearby partner rewards and challenges."
          status={locationStatus}
          optional
          onEnable={requestLocationPermission}
        />
      </SurfaceCard>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: palette.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: palette.primary,
  },
  headerMeta: {
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.text,
  },
  email: {
    color: palette.mutedText,
    marginTop: spacing.xs,
  },
  secondaryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: palette.border,
    ...shadow.surface,
  },
  secondaryButtonActive: {
    backgroundColor: palette.primarySurface,
    borderColor: palette.primary,
  },
  secondaryButtonText: {
    color: palette.text,
    fontWeight: '600',
  },
  sectionTitle: {
    ...typography.title,
    marginBottom: spacing.sm,
  },
  sectionCaption: {
    color: palette.mutedText,
    fontSize: 12,
    marginBottom: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  statBlock: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: '#fafafa',
    borderRadius: radius.md,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: spacing.xs,
    color: palette.text,
  },
  infoCard: {
    marginTop: spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  label: {
    ...typography.label,
  },
  value: {
    color: palette.text,
    fontWeight: '600',
  },
  loadingState: {
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    color: palette.mutedText,
  },
  statsCard: {
    marginBottom: spacing.xl,
  },
  formCard: {
    gap: spacing.md,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  helperText: {
    color: palette.mutedText,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  primaryButton: {
    backgroundColor: palette.primary,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: radius.md,
  },
  disabledButton: {
    opacity: 0.8,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  statusText: {
    color: palette.success,
    fontSize: 13,
  },
  permissionsCard: {
    marginTop: spacing.xl,
  },
  logoutBtn: {
    marginTop: spacing.lg,
    backgroundColor: palette.danger,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: radius.md,
  },
  logoutText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
