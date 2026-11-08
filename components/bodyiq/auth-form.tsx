import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import type { PropsWithChildren } from "react";
import { Body, Card, Icon, Logo, Screen } from "./ui";
import { BackHeader } from "./premium";
import { palette as p } from "@/constants/design";
export function AuthFrame({
  title,
  heading,
  description,
  children,
}: PropsWithChildren<{ title: string; heading: string; description: string }>) {
  return (
    <Screen preview={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <BackHeader title={title} />
        <View style={f.brand}>
          <Logo size={34} />
          <Text style={f.eyebrow}>YOUR BODY. YOUR GOALS. YOUR AI COACH.</Text>
        </View>
        <Text accessibilityRole="header" style={f.heading}>
          {heading}
        </Text>
        <Body style={{ marginBottom: 24, fontSize: 14 }}>{description}</Body>
        {children}
      </KeyboardAvoidingView>
    </Screen>
  );
}
export function AuthField({
  label,
  password = false,
  editable = true,
  ...props
}: TextInputProps & { label: string; password?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={f.label}>{label}</Text>
      <View style={f.inputRow}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={p.muted}
          style={f.input}
          editable={editable}
          autoCapitalize="none"
          autoCorrect={false}
          {...props}
          secureTextEntry={password && !visible}
        />
        {password && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              visible
                ? `Hide ${label.toLowerCase()}`
                : `Show ${label.toLowerCase()}`
            }
            onPress={() => setVisible(!visible)}
            disabled={!editable}
            style={f.eye}
          >
            <Icon name={visible ? "eye-off" : "eye"} size={18} />
          </Pressable>
        )}
      </View>
    </View>
  );
}
export function AuthFeedback({
  error,
  message,
  busy = false,
}: {
  error?: string;
  message?: string;
  busy?: boolean;
}) {
  return (
    <View>
      {busy && (
        <View style={f.loading}>
          <ActivityIndicator color={p.green} size="small" />
          <Text style={{ color: p.muted, fontSize: 12 }}>
            Connecting securely…
          </Text>
        </View>
      )}
      {error ? (
        <Text
          accessibilityRole="alert"
          style={[f.feedback, { color: p.error }]}
        >
          {error}
        </Text>
      ) : null}
      {message ? (
        <Text
          accessibilityRole="alert"
          style={[f.feedback, { color: p.green }]}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}
export function SecurityNote({ children }: PropsWithChildren) {
  return (
    <View style={f.security}>
      <Icon name="shield" color={p.green} size={14} />
      <Body style={{ fontSize: 10, lineHeight: 17, flex: 1 }}>
        {children ??
          "Passwords are salted and hashed on the server. Your account is private by design."}
      </Body>
    </View>
  );
}
export function AuthInfo({ children }: PropsWithChildren) {
  return (
    <Card style={{ marginBottom: 18, backgroundColor: p.greenDark }}>
      <Body style={{ fontSize: 11, lineHeight: 18 }}>{children}</Body>
    </Card>
  );
}
export const f = StyleSheet.create({
  brand: { alignItems: "center", gap: 12, marginTop: 18, marginBottom: 28 },
  eyebrow: { color: p.muted, fontSize: 8, letterSpacing: 1.2 },
  heading: {
    color: p.text,
    fontSize: 38,
    lineHeight: 43,
    fontWeight: "700",
    letterSpacing: -1.3,
    marginBottom: 12,
  },
  label: {
    color: p.muted,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.2,
    marginBottom: 9,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: p.background,
    borderWidth: 1,
    borderColor: p.border,
    borderRadius: 12,
    overflow: "hidden",
    minHeight: 52,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    paddingHorizontal: 14,
    color: p.text,
    fontSize: 14,
  },
  eye: {
    width: 48,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  feedback: { fontSize: 12, lineHeight: 20, marginBottom: 16 },
  loading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  security: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 20,
  },
  link: { color: p.green, fontSize: 12, fontWeight: "600" },
  linkButton: { minHeight: 44, justifyContent: "center" },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: p.border },
  dividerText: { color: p.muted, fontSize: 10 },
  alternate: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 18,
  },
});
