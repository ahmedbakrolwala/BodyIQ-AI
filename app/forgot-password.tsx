import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  AuthFrame,
  AuthField,
  AuthFeedback,
  AuthInfo,
  SecurityNote,
} from "@/components/bodyiq/auth-form";
import { Button, Card } from "@/components/bodyiq/ui";
import { forgotPassword, getAuthCapabilities } from "@/lib/account-auth";
import { validateEmail } from "@/lib/auth-validation";
export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const cap = useQuery({
    queryKey: ["auth", "capabilities"],
    queryFn: getAuthCapabilities,
    retry: false,
  });
  async function submit() {
    const issue = validateEmail(email);
    setError(issue ?? "");
    setMessage("");
    if (issue) return;
    setBusy(true);
    try {
      setMessage((await forgotPassword(email)).message);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "A reset email could not be requested. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthFrame
      title="Forgot password"
      heading={"A fresh start.\nSecurely."}
      description="Enter the email for your BodyIQ password account. Eligible accounts receive a time-limited reset link."
    >
      <Card>
        <AuthField
          label="Email address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoComplete="email"
          maxLength={320}
          editable={!busy}
        />
        {cap.data && !cap.data.emailDelivery && (
          <AuthInfo>
            Password-recovery email delivery is awaiting configuration. Your
            password will not be changed and no email is simulated.
          </AuthInfo>
        )}
        <AuthFeedback
          error={
            error ||
            (cap.isError
              ? "The recovery service could not be checked. Try again shortly."
              : "")
          }
          message={message}
          busy={busy}
        />
        <Button
          title={busy ? "Requesting reset link…" : "Send reset link"}
          onPress={submit}
          disabled={busy || !cap.data?.emailDelivery}
          icon="mail"
        />
        <View style={{ height: 14 }} />
        <Button
          title="Back to sign in"
          onPress={() => router.replace("/login")}
          secondary
        />
        <SecurityNote>
          For your privacy, this request does not confirm whether an email has a
          BodyIQ password account. Google and Manus passwords are managed by
          their providers.
        </SecurityNote>
      </Card>
    </AuthFrame>
  );
}
