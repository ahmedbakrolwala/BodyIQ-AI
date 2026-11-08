import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { BackHeader } from "@/components/bodyiq/premium";
import {
  Body,
  Button,
  Card,
  Icon,
  Label,
  Screen,
} from "@/components/bodyiq/ui";
import { palette as p } from "@/constants/design";
import { useAuth } from "@/hooks/use-auth";
import type { PropsWithChildren } from "react";

export { parseMeasurement } from "@/lib/measurement-input";

export function formatMeasurement(value: number, digits = 1): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(digits).replace(/\.0+$/, "");
}

export function TrackingField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "decimal-pad",
  autoCapitalize = "sentences",
  editable = true,
  maxLength,
  multiline = false,
  accessibilityLabel,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "decimal-pad" | "numeric";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  editable?: boolean;
  maxLength?: number;
  multiline?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <View style={styles.field}>
      <Label>{label}</Label>
      <TextInput
        accessibilityLabel={accessibilityLabel ?? label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={p.muted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={editable}
        maxLength={maxLength}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={[
          styles.input,
          multiline && styles.multilineInput,
          !editable && styles.disabledInput,
        ]}
      />
    </View>
  );
}

export function FieldError({ children }: PropsWithChildren) {
  return (
    <Text accessibilityRole="alert" style={styles.error}>
      {children}
    </Text>
  );
}

export function AuthGate({
  title,
  badge,
  children,
}: PropsWithChildren<{ title: string; badge?: string }>) {
  const auth = useAuth();

  return (
    <Screen preview={false}>
      <BackHeader title={title} badge={badge} />
      {auth.loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={p.green} />
          <Body style={{ marginTop: 14 }}>Checking your secure session…</Body>
        </View>
      ) : auth.error ? (
        <Card>
          <Icon name="wifi-off" color={p.green} size={26} />
          <Text style={styles.stateTitle}>We couldn’t check your sign-in.</Text>
          <Body style={{ marginTop: 8, marginBottom: 18 }}>
            Your saved account has not been changed. Check your connection and
            try again.
          </Body>
          <Button
            title="Retry secure connection"
            onPress={() => void auth.refresh()}
            icon="refresh-cw"
          />
        </Card>
      ) : !auth.isAuthenticated ? (
        <Card>
          <Icon name="lock" color={p.green} size={26} />
          <Text style={styles.stateTitle}>Sign in to use tracking.</Text>
          <Body style={{ marginTop: 8, marginBottom: 20 }}>
            Your meals, measurements, and workout sessions belong to your
            private BodyIQ account. Nothing is saved for a guest.
          </Body>
          <Button
            title="Sign in securely"
            onPress={() => router.push("/login")}
            icon="lock"
          />
        </Card>
      ) : (
        children
      )}
    </Screen>
  );
}

export function TrackingLoading({ label }: { label: string }) {
  return (
    <View style={styles.centerState}>
      <ActivityIndicator color={p.green} />
      <Body style={{ marginTop: 14 }}>{label}</Body>
    </View>
  );
}

export function TrackingQueryError({
  onRetry,
  message = "We couldn’t load your tracking data.",
}: {
  onRetry: () => void;
  message?: string;
}) {
  return (
    <Card>
      <Icon name="alert-circle" color={p.error} size={25} />
      <Text style={styles.stateTitle}>{message}</Text>
      <Body style={{ marginTop: 8, marginBottom: 18 }}>
        Your saved data has not been changed. Check your connection and try
        again.
      </Body>
      <Button title="Retry loading" onPress={onRetry} icon="refresh-cw" />
    </Card>
  );
}

export function SubmissionError({
  message = "We couldn’t confirm that save.",
  onRetry,
  onNew,
  retryTitle = "Retry same submission",
  newTitle = "Start a new entry",
}: {
  message?: string;
  onRetry: () => void;
  onNew: () => void;
  retryTitle?: string;
  newTitle?: string;
}) {
  return (
    <Card style={{ borderColor: `${p.error}66`, marginTop: 16 }}>
      <Text style={styles.errorTitle}>{message}</Text>
      <Body style={{ marginTop: 8, marginBottom: 16 }}>
        Keep the fields unchanged and retry with the same request ID. Check your
        dashboard before starting a new entry: an earlier request may already
        have been saved.
      </Body>
      <Button title={retryTitle} onPress={onRetry} icon="refresh-cw" />
      <View style={{ height: 10 }} />
      <Button title={newTitle} onPress={onNew} secondary icon="plus" />
    </Card>
  );
}

export const styles = StyleSheet.create({
  field: { marginBottom: 18 },
  input: {
    backgroundColor: p.background,
    borderWidth: 1,
    borderColor: p.border,
    color: p.text,
    borderRadius: 12,
    minHeight: 50,
    paddingHorizontal: 15,
    fontSize: 14,
    marginTop: 10,
  },
  multilineInput: { minHeight: 92, paddingTop: 14 },
  disabledInput: { opacity: 0.55 },
  centerState: { alignItems: "center", paddingVertical: 60 },
  stateTitle: { color: p.text, fontSize: 20, fontWeight: "700", marginTop: 14 },
  errorTitle: { color: p.error, fontSize: 15, fontWeight: "700" },
  error: {
    color: p.error,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 4,
    marginBottom: 4,
  },
  reviewValue: { color: p.text, fontSize: 16, fontWeight: "700", marginTop: 5 },
  reviewUnit: { color: p.muted, fontSize: 11, fontWeight: "500" },
});
