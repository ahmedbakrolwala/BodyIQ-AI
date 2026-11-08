import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { Body, Button, Card, Icon, Screen } from "@/components/bodyiq/ui";
import { AuthFrame } from "@/components/bodyiq/auth-form";
import {
  OnboardingError,
  OnboardingLoading,
  OnboardingWizard,
} from "@/components/bodyiq/onboarding-wizard";
import { BackHeader } from "@/components/bodyiq/premium";
import { palette as p } from "@/constants/design";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

export default function OnboardingScreen() {
  const auth = useAuth();
  const params = useLocalSearchParams<{ edit?: string }>();
  const isEditing = params.edit === "true";
  const fitness = trpc.fitness.get.useQuery(undefined, {
    enabled: auth.isAuthenticated,
    retry: false,
  });

  if (auth.loading) {
    return (
      <Screen preview={false}>
        <View style={{ paddingVertical: 70, alignItems: "center" }}>
          <ActivityIndicator color={p.green} />
          <Body style={{ marginTop: 14 }}>Checking your secure session…</Body>
        </View>
      </Screen>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <AuthFrame
        title="Fitness profile"
        heading="Make your plan personal."
        description="Sign in to BodyIQ to save your fitness profile privately. We never create guest health records."
      >
        <Card>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              backgroundColor: p.greenDark,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 18,
            }}
          >
            <Icon name="lock" color={p.green} size={25} />
          </View>
          <Body style={{ fontSize: 13, lineHeight: 21, marginBottom: 22 }}>
            Your answers stay in memory until you save them to an authenticated
            account.
          </Body>
          <Button
            title="Sign in securely"
            onPress={() => router.push("/login")}
            icon="lock"
          />
          <View style={{ height: 12 }} />
          <Button
            title="Create an account"
            secondary
            onPress={() => router.push("/register")}
            icon="user-plus"
          />
        </Card>
      </AuthFrame>
    );
  }

  if (fitness.isLoading) {
    return (
      <Screen preview={false}>
        <BackHeader title="Edit fitness profile" />
        <OnboardingLoading />
      </Screen>
    );
  }

  if (fitness.isError) {
    return (
      <Screen preview={false}>
        <BackHeader title="Edit fitness profile" />
        <OnboardingError onRetry={() => void fitness.refetch()} />
      </Screen>
    );
  }

  if (isEditing && !fitness.data?.profile) {
    return (
      <Screen preview={false}>
        <BackHeader title="Edit fitness profile" />
        <Card>
          <Body>Your account does not have a saved fitness profile yet.</Body>
          <View style={{ height: 16 }} />
          <Button
            title="Start your profile"
            onPress={() => router.replace("/onboarding")}
            icon="arrow-right"
          />
        </Card>
      </Screen>
    );
  }

  if (!isEditing && fitness.data?.profile) {
    return (
      <Screen preview={false}>
        <BackHeader title="Your fitness profile" />
        <Card>
          <Body>
            Your fitness profile is already saved. Review it or edit your
            answers without starting over.
          </Body>
          <View style={{ height: 18 }} />
          <Button
            title="View my fitness profile"
            onPress={() => router.replace("/fitness-profile")}
          />
          <View style={{ height: 12 }} />
          <Button
            title="Edit my answers"
            secondary
            onPress={() =>
              router.replace({
                pathname: "/onboarding",
                params: { edit: "true" },
              })
            }
          />
        </Card>
      </Screen>
    );
  }

  const profile = fitness.data?.profile;
  return (
    <Screen preview={false}>
      <OnboardingWizard
        key={`${auth.user?.id ?? "signed-out"}-${isEditing ? JSON.stringify(profile) : "new"}`}
        initialProfile={profile}
      />
    </Screen>
  );
}
