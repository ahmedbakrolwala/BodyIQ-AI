import { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  AuthFrame,
  AuthField,
  AuthFeedback,
  AuthInfo,
} from "@/components/bodyiq/auth-form";
import { Body, Button, Card, Icon } from "@/components/bodyiq/ui";
import { useAuth } from "@/hooks/use-auth";
import { deleteAccount, startGoogleLogin } from "@/lib/account-auth";
import { signIn } from "@/lib/sign-in";
import { palette as p } from "@/constants/design";
export default function DeleteAccountScreen() {
  const auth = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const passwordAccount = !!auth.user?.canDeleteWithPassword;
  const needsRecent =
    !passwordAccount && auth.user?.requiresReauthentication !== false;
  function review() {
    setError("");
    if (confirmation !== "DELETE MY ACCOUNT") {
      setError("Type DELETE MY ACCOUNT exactly to continue.");
      return;
    }
    if (passwordAccount && !password) {
      setError("Enter your current password to confirm it is you.");
      return;
    }
    if (needsRecent) {
      setError(
        "Please reauthenticate with your account provider, then return here.",
      );
      return;
    }
    Keyboard.dismiss();
    setOpen(true);
  }
  async function reauthenticate() {
    setBusy(true);
    setError("");
    try {
      await (auth.user?.authProvider === "google"
        ? startGoogleLogin()
        : signIn());
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Reauthentication could not be opened.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setError("");
    try {
      const result = await deleteAccount(
        passwordAccount ? password : undefined,
      );
      if (!result.success)
        throw new Error("Your account could not be deleted.");
      setPassword("");
      setOpen(false);
      await auth.clearLocalSession();
      router.replace("/welcome");
    } catch (e) {
      setOpen(false);
      setError(
        e instanceof Error
          ? e.message
          : "Your account could not be deleted. Please try again.",
      );
    } finally {
      setBusy(false);
      setPassword("");
    }
  }
  return (
    <AuthFrame
      title="Delete account"
      heading={"Your account.\nYour choice."}
      description="Permanently remove your BodyIQ account and its cloud-saved data."
    >
      {auth.loading ? (
        <Card>
          <ActivityIndicator color={p.green} />
          <Body style={{ textAlign: "center", marginTop: 14 }}>
            Checking your secure session…
          </Body>
        </Card>
      ) : auth.error ? (
        <Card>
          <AuthFeedback error="We could not verify your account. Nothing has been deleted." />
          <Button
            title="Retry connection"
            onPress={() => void auth.refresh()}
            secondary
          />
        </Card>
      ) : !auth.isAuthenticated ? (
        <Card>
          <Body style={{ marginBottom: 20 }}>
            Sign in before managing an account. Guest preview data is not a
            cloud account.
          </Body>
          <Button
            title="Sign in"
            onPress={() => router.replace("/login")}
            icon="lock"
          />
        </Card>
      ) : (
        <Card>
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              alignItems: "center",
              marginBottom: 18,
            }}
          >
            <Icon name="alert-triangle" color={p.error} size={25} />
            <Text
              style={{
                color: p.text,
                fontSize: 17,
                fontWeight: "600",
                flex: 1,
              }}
            >
              This cannot be undone.
            </Text>
          </View>
          <Body style={{ marginBottom: 18 }}>
            Account:{" "}
            {auth.user?.email ?? auth.user?.name ?? "Your BodyIQ account"}
          </Body>
          <Body style={{ marginBottom: 22 }}>
            Your profile, fitness records, password credentials, and active
            BodyIQ sessions will be removed. This does not delete your Google or
            Manus account. Recreating an account does not recover deleted
            records.
          </Body>
          {passwordAccount ? (
            <AuthField
              label="Current password"
              password
              value={password}
              onChangeText={setPassword}
              placeholder="Confirm your current password"
              autoComplete="current-password"
              maxLength={128}
              editable={!busy}
            />
          ) : needsRecent ? (
            <>
              <AuthInfo>
                For your security, reconnect with the original account provider.
                Return here after signing in and confirm the account email shown
                above.
              </AuthInfo>
              <Button
                title={
                  busy ? "Opening secure sign-in…" : "Reauthenticate securely"
                }
                onPress={reauthenticate}
                disabled={busy}
                secondary
                icon="shield"
              />
              <View style={{ height: 22 }} />
            </>
          ) : (
            <AuthInfo>
              Your recent provider sign-in is valid for this action.
            </AuthInfo>
          )}
          <AuthField
            label="Type DELETE MY ACCOUNT"
            value={confirmation}
            onChangeText={setConfirmation}
            placeholder="DELETE MY ACCOUNT"
            autoCapitalize="characters"
            maxLength={32}
            editable={!busy}
          />
          <AuthFeedback error={error} busy={busy} />
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            accessibilityState={{ disabled: busy }}
            onPress={review}
            style={[d.danger, { opacity: busy ? 0.5 : 1 }]}
          >
            <Text style={d.dangerText}>Review permanent deletion</Text>
            <Icon name="trash-2" color="#fff" size={18} />
          </Pressable>
          <View style={{ height: 14 }} />
          <Button
            title="Keep my account"
            onPress={() => router.replace("/settings")}
            secondary
            icon="arrow-left"
          />
        </Card>
      )}
      <Modal
        transparent
        animationType="fade"
        visible={open}
        onRequestClose={() => {
          if (!busy) setOpen(false);
        }}
      >
        <View style={d.overlay}>
          <Card style={{ width: "100%", maxWidth: 420, padding: 24 }}>
            <Text style={d.modalTitle}>Delete your BodyIQ account?</Text>
            <Body style={{ marginBottom: 22 }}>
              All BodyIQ data for {auth.user?.email ?? "this account"} will be
              permanently removed. No other user’s information will be affected.
            </Body>
            {busy ? (
              <View style={{ alignItems: "center", gap: 14, padding: 15 }}>
                <ActivityIndicator color={p.error} />
                <Body>Deleting your account securely…</Body>
              </View>
            ) : (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Confirm permanent account deletion"
                  onPress={remove}
                  style={d.danger}
                >
                  <Text style={d.dangerText}>Delete permanently</Text>
                  <Icon name="trash-2" color="#fff" size={18} />
                </Pressable>
                <View style={{ height: 12 }} />
                <Button
                  title="Cancel deletion"
                  secondary
                  onPress={() => {
                    setOpen(false);
                    setPassword("");
                  }}
                  icon="arrow-left"
                />
              </>
            )}
          </Card>
        </View>
      </Modal>
    </AuthFrame>
  );
}
const d = StyleSheet.create({
  danger: {
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: "#B93645",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 18,
  },
  dangerText: { color: "#fff", fontSize: 13, fontWeight: "700", flexShrink: 1 },
  overlay: {
    flex: 1,
    backgroundColor: "#000C",
    padding: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    color: p.text,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 29,
    marginBottom: 16,
  },
});
