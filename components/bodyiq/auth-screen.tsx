import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Body, Button, Card } from "./ui";
import {
  AuthFeedback,
  AuthField,
  AuthFrame,
  AuthInfo,
  SecurityNote,
  f,
} from "./auth-form";
import { signIn } from "@/lib/sign-in";
import {
  getAuthCapabilities,
  loginAccount,
  registerAccount,
  startGoogleLogin,
  type AuthCapabilities,
} from "@/lib/account-auth";
import {
  validateEmail,
  validateName,
  validatePassword,
  validatePasswordConfirmation,
} from "@/lib/auth-validation";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/lib/_core/api";
export function AuthScreen({ register = false }: { register?: boolean }) {
  const auth = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [capabilities, setCapabilities] = useState<AuthCapabilities | null>(
    null,
  );
  const [capError, setCapError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  useEffect(() => {
    let active = true;
    getAuthCapabilities()
      .then((value) => {
        if (active) setCapabilities(value);
      })
      .catch(() => {
        if (active)
          setCapError(
            "We could not check the authentication service. Try again shortly.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  async function submit() {
    setError("");
    const issue =
      (register ? validateName(name) : null) ||
      validateEmail(email) ||
      (register
        ? validatePassword(password)
        : password.length
          ? null
          : "Enter your password.") ||
      (register ? validatePasswordConfirmation(password, confirm) : null);
    if (issue) {
      setError(issue);
      return;
    }
    setBusy("email");
    try {
      if (register) {
        const result = await registerAccount(name, email, password);
        setPassword("");
        setConfirm("");
        router.push({
          pathname: "/verify-email",
          params: { email: result.email ?? email },
        });
      } else {
        await loginAccount(email, password);
        setPassword("");
        await auth.refresh();
        router.replace("/(tabs)");
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Your request could not be completed.",
      );
      if (e instanceof ApiError && e.code === "email_unverified")
        router.push({ pathname: "/verify-email", params: { email } });
    } finally {
      setBusy(null);
    }
  }
  async function provider(google: boolean) {
    setBusy(google ? "google" : "manus");
    setError("");
    try {
      await (google ? startGoogleLogin() : signIn());
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Secure sign-in could not be opened.",
      );
    } finally {
      setBusy(null);
    }
  }
  async function explore() {
    await AsyncStorage.setItem("bodyiq:entered", "true").catch(() => {});
    router.replace("/(tabs)");
  }
  return (
    <AuthFrame
      title={register ? "Create account" : "Sign in"}
      heading={register ? "A stronger you.\nStarts here." : "Welcome\nback."}
      description={
        register
          ? "One secure account for your goals, your progress, and your future AI coach."
          : "Your goals are waiting. Let’s pick up where you left off."
      }
    >
      {capabilities && !capabilities.emailDelivery && (
        <AuthInfo>
          Email registration, verification, and password recovery need email
          delivery to be configured. Existing email accounts can still sign in.
          Manus access and guest exploration remain available.
        </AuthInfo>
      )}
      <Card style={{ padding: 22 }}>
        {register && (
          <AuthField
            label="Your name"
            placeholder="What should we call you?"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
            maxLength={60}
            editable={!busy}
          />
        )}
        <AuthField
          label="Email address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          maxLength={320}
          editable={!busy}
        />
        <AuthField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder={
            register ? "At least 12 characters" : "Enter your password"
          }
          password
          autoComplete={register ? "new-password" : "current-password"}
          textContentType={register ? "newPassword" : "password"}
          maxLength={128}
          editable={!busy}
        />
        {register && (
          <AuthField
            label="Confirm password"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Enter your password again"
            password
            autoComplete="new-password"
            textContentType="newPassword"
            maxLength={128}
            editable={!busy}
          />
        )}
        {!register && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/forgot-password")}
            style={[
              f.linkButton,
              { alignSelf: "flex-end", marginTop: -12, marginBottom: 10 },
            ]}
          >
            <Text style={f.link}>Forgot password?</Text>
          </Pressable>
        )}
        <AuthFeedback busy={!!busy} error={error || capError} />
        <Button
          title={
            busy === "email"
              ? register
                ? "Creating your account…"
                : "Signing in…"
              : register
                ? "Create account"
                : "Sign in"
          }
          onPress={submit}
          disabled={
            !!busy ||
            (register && (!capabilities || !capabilities.emailDelivery))
          }
          icon={register ? "user-plus" : "arrow-right"}
        />
        <SecurityNote>
          {register
            ? "Verify your email before signing in. Passwords are salted and hashed, never stored as plain text."
            : "Persistent sessions are secured on the server and can be revoked when you sign out."}
        </SecurityNote>
      </Card>
      <View style={f.divider}>
        <View style={f.dividerLine} />
        <Text style={f.dividerText}>OR CONTINUE SECURELY</Text>
        <View style={f.dividerLine} />
      </View>
      <Button
        title={busy === "google" ? "Opening Google…" : "Continue with Google"}
        secondary
        icon="globe"
        disabled={!!busy || !capabilities?.google}
        onPress={() => provider(true)}
      />
      {capabilities && !capabilities.google && (
        <Body style={{ fontSize: 10, lineHeight: 17, marginTop: 9 }}>
          Google sign-in is awaiting OAuth configuration. It is not simulated.
        </Body>
      )}
      <View style={{ height: 12 }} />
      <Button
        title={busy === "manus" ? "Opening Manus…" : "Continue with Manus"}
        secondary
        icon="shield"
        disabled={!!busy}
        onPress={() => provider(false)}
      />
      <View style={f.alternate}>
        <Body style={{ fontSize: 12 }}>
          {register ? "Already have an account?" : "New to BodyIQ AI?"}
        </Body>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace(register ? "/login" : "/register")}
          style={f.linkButton}
        >
          <Text style={f.link}>{register ? "Sign in" : "Create account"}</Text>
        </Pressable>
      </View>
      <View style={{ height: 12 }} />
      <Button
        title="Explore the design preview"
        secondary
        icon="compass"
        disabled={!!busy}
        onPress={explore}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/support?section=privacy")}
        style={[f.linkButton, { alignSelf: "center", marginTop: 16 }]}
      >
        <Text style={f.link}>Privacy overview</Text>
      </Pressable>
    </AuthFrame>
  );
}
