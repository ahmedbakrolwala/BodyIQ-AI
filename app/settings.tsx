import { Text, View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Body, Card, Logo, Screen, Section } from "@/components/bodyiq/ui";
import { BackHeader, SettingRow } from "@/components/bodyiq/premium";
import { useDesignPreview } from "@/lib/preview-context";
import { palette as p } from "@/constants/design";
export default function SettingsScreen() {
  const prefs = useDesignPreview();
  return (
    <Screen preview={false}>
      <BackHeader title="Settings" />
      <Body>Your space, your preferences.</Body>
      <Section title="Experience" />
      <Card style={{ paddingVertical: 3 }}>
        <SettingRow
          icon="eye"
          title="Design preview"
          subtitle="Show clearly labeled sample fitness data"
          value={prefs.isPreview}
          onToggle={prefs.setPreview}
        />
        <SettingRow
          icon="wind"
          title="Reduce motion"
          subtitle="Use gentler transitions in the app"
          value={prefs.reduceMotion}
          onToggle={prefs.setReduceMotion}
        />
        <SettingRow
          icon="moon"
          title="Appearance"
          subtitle="BodyIQ signature dark theme"
          onPress={() => router.push("/support?section=appearance")}
        />
      </Card>
      <Section title="Your account" />
      <Card style={{ paddingVertical: 3 }}>
        <SettingRow
          icon="user"
          title="Personal profile"
          subtitle="Edit your real cloud-saved profile"
          onPress={() => router.push("/profile")}
        />
        <SettingRow
          icon="sliders"
          title="Goals & preferred units"
          subtitle="Update your account preferences"
          onPress={() => router.push("/profile")}
        />
      </Card>
      <Section title="Account security" />
      <Card style={{ paddingVertical: 3 }}>
        <SettingRow
          icon="shield"
          title="Account access & sessions"
          subtitle="Sign-in methods, password recovery and sign-out"
          onPress={() => router.push("/account-security")}
        />
        <SettingRow
          icon="trash-2"
          title="Delete account"
          subtitle="Permanent deletion requires confirmation"
          onPress={() => router.push("/delete-account")}
        />
      </Card>
      <Section title="Support & information" />
      <Card style={{ paddingVertical: 3 }}>
        <SettingRow
          icon="help-circle"
          title="Help center"
          subtitle="Using the BodyIQ preview"
          onPress={() => router.push("/support?section=help")}
        />
        <SettingRow
          icon="shield"
          title="Privacy overview"
          subtitle="What is saved and what isn’t"
          onPress={() => router.push("/support?section=privacy")}
        />
        <SettingRow
          icon="info"
          title="About BodyIQ AI"
          subtitle="Your Body. Your Goals. Your AI Coach."
          onPress={() => router.push("/support?section=about")}
        />
        <SettingRow
          icon="compass"
          title="Replay welcome"
          subtitle="Return to the introduction"
          onPress={() => router.push("/welcome")}
        />
      </Card>
      <View style={v.footer}>
        <Logo size={25} />
        <Text style={v.version}>BODYIQ AI · INTERFACE PREVIEW</Text>
        <Text style={v.note}>
          Experience preferences are saved on this device.{"\n"}Your basic
          account profile uses secure cloud storage.
        </Text>
      </View>
    </Screen>
  );
}
const v = StyleSheet.create({
  footer: { alignItems: "center", gap: 12, paddingTop: 34, paddingBottom: 10 },
  version: { color: p.muted, fontSize: 8, letterSpacing: 1.3 },
  note: { color: p.muted, fontSize: 10, lineHeight: 17, textAlign: "center" },
});
