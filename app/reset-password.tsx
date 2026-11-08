import { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  AuthFrame,
  AuthField,
  AuthFeedback,
  AuthInfo,
  SecurityNote,
} from "@/components/bodyiq/auth-form";
import { Button, Card } from "@/components/bodyiq/ui";
import { resetPassword } from "@/lib/account-auth";
import {
  validatePassword,
  validatePasswordConfirmation,
} from "@/lib/auth-validation";
import { useAuth } from "@/hooks/use-auth";
export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = Array.isArray(params.token)
    ? params.token[0]
    : (params.token ?? "");
  const auth = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);
  async function submit() {
    const issue =
      validatePassword(password) ||
      validatePasswordConfirmation(password, confirm);
    setError(issue ?? "");
    if (issue) return;
    setBusy(true);
    try {
      const result = await resetPassword(token, password);
      setPassword("");
      setConfirm("");
      setComplete(true);
      setMessage(result.message);
      await auth.clearLocalSession();
      router.setParams({ token: undefined });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Your password could not be reset. Please request a new link.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthFrame
      title="Reset password"
      heading={
        complete
          ? "Your fresh start\nis ready."
          : "Make it strong.\nMake it yours."
      }
      description={
        complete
          ? "Your password is updated. Sign in again with your new password."
          : "Choose a new password of 12–128 characters. Use a long, unique passphrase."
      }
    >
      <Card>
        {!token && !complete && (
          <AuthInfo>
            Open the reset link from your email to choose a new password. Links
            expire after 30 minutes and work only once.
          </AuthInfo>
        )}
        {!complete && (
          <>
            <AuthField
              label="New password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 12 characters"
              password
              autoComplete="new-password"
              textContentType="newPassword"
              maxLength={128}
              editable={!busy}
            />
            <AuthField
              label="Confirm new password"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Enter your new password again"
              password
              autoComplete="new-password"
              textContentType="newPassword"
              maxLength={128}
              editable={!busy}
            />
          </>
        )}
        <AuthFeedback busy={busy} error={error} message={message} />
        {complete ? (
          <Button
            title="Sign in with new password"
            onPress={() => router.replace("/login")}
          />
        ) : (
          <>
            <Button
              title={busy ? "Updating password…" : "Reset password"}
              onPress={submit}
              disabled={busy || !token}
              icon="lock"
            />
            <View style={{ height: 14 }} />
            <Button
              title="Request a new reset link"
              onPress={() => router.replace("/forgot-password")}
              secondary
              icon="mail"
            />
          </>
        )}
        <SecurityNote>
          Resetting your password signs out existing sessions. We never
          automatically log you in from a reset link.
        </SecurityNote>
      </Card>
    </AuthFrame>
  );
}
