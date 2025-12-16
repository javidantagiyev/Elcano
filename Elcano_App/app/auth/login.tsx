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
import { signInWithEmail } from "../../firebaseConfig";
import { AuthStackParamList, RootStackParamList } from "../../navigation/types";
import { palette, radius, shadow, spacing, typography } from "../../constants/ui";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const authNavigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  const trimmedEmail = useMemo(() => email.trim(), [email]);

  const handleLogin = async () => {
    setError("");

    if (!trimmedEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      // Firebase handles auth logic; we surface a friendlier error message below.
      await signInWithEmail(trimmedEmail, password);
      rootNavigation.reset({
        index: 0,
        routes: [{ name: "MainTabs" }],
      });
    } catch (err: any) {
      const message = err?.message ?? "Unable to log in. Please try again.";
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
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Log in to keep walking toward your goals.</Text>

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
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Log In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => authNavigation.navigate("Register")}>
          <Text style={styles.link}>Don’t have an account? Sign up</Text>
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
    marginBottom: 6,
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
