import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { createUserProfile } from "../../services/userProfile";
import { signUpWithEmail } from "../../firebaseConfig";
import { AuthStackParamList, RootStackParamList } from "../../navigation/types";
import { palette, radius, shadow, spacing, typography } from "../../constants/ui";

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const authNavigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  const trimmedEmail = useMemo(() => email.trim(), [email]);
  const trimmedName = useMemo(() => name.trim(), [name]);

  const handleSignup = async () => {
    setError("");

    if (!trimmedName || !age.trim() || !trimmedEmail || !password) {
      setError("Please fill in your name, age, email, and password.");
      return;
    }

    const numericAge = Number(age);
    if (!Number.isFinite(numericAge) || numericAge <= 0) {
      setError("Please enter a valid age.");
      return;
    }

    setLoading(true);
    try {
      // Create the auth user first, then persist profile metadata for display.
      const userCredential = await signUpWithEmail(trimmedEmail, password);

      await createUserProfile({
        uid: userCredential.user.uid,
        name: trimmedName,
        email: trimmedEmail,
        age: numericAge,
      });

      rootNavigation.reset({
        index: 0,
        routes: [{ name: "MainTabs" }],
      });
    } catch (err: any) {
      // Show a concise, user-friendly error instead of surfacing raw Firebase codes.
      const message = err?.message ?? "Unable to sign up. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>We just need a few details to get started.</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Full name</Text>
          <TextInput
            placeholder="Alex Walker"
            style={styles.input}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Age</Text>
          <TextInput
            placeholder="18"
            style={styles.input}
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            placeholder="you@example.com"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            placeholder="••••••••"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => authNavigation.goBack()}>
          <Text style={styles.link}>Already have an account? Log in</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
    justifyContent: "center",
    padding: spacing.xxl,
  },
  card: {
    backgroundColor: palette.surface,
    padding: spacing.xxl,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  title: {
    ...typography.headline,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.subtitle,
    marginBottom: spacing.xl,
  },
  fieldGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    backgroundColor: "#fafafa",
  },
  error: {
    color: palette.danger,
    marginBottom: spacing.md,
    fontSize: 13,
  },
  button: {
    backgroundColor: palette.primary,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  link: {
    textAlign: "center",
    color: palette.text,
    marginTop: spacing.lg,
    fontWeight: "500",
  },
});
