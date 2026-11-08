import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  Body,
  Button,
  Card,
  Icon,
  Screen,
  Section,
} from "@/components/bodyiq/ui";
import { BackHeader } from "@/components/bodyiq/premium";
import { palette as p } from "@/constants/design";
const pages = {
  help: {
    title: "Help center",
    icon: "help-circle",
    intro: "A simple guide to your BodyIQ experience.",
    sections: [
      [
        "Explore the interface",
        "The main navigation connects Home, Nutrition, Workouts, Progress and AI Coach. Food Scanner is available from Home and Nutrition. Profile opens from the header icon.",
      ],
      [
        "Sample data, clearly marked",
        "Design Preview shows illustrative meals, workouts and charts. Tap the eye button in the preview banner, or change the switch in Settings, to hide samples. No sample fitness records are saved to your account.",
      ],
      [
        "Save your real profile",
        "Use Sign in or Create account to continue through the existing Manus authentication provider. A signed-in user can save a name, goal, country code and preferred units to the cloud.",
      ],
      [
        "Scanner and coach demos",
        "The scanner uses a predefined meal sample, not a camera or recognition model. Coach conversations are scripted UI examples, not live AI or medical advice.",
      ],
    ],
  },
  privacy: {
    title: "Privacy overview",
    icon: "shield",
    intro:
      "Designed to keep preview data separate from your personal information.",
    sections: [
      [
        "What is stored",
        "The real account system stores authentication identity and your basic profile: name, broad fitness goal, country and preferred units. Native session tokens use secure device storage.",
      ],
      [
        "What is not collected",
        "This interface preview does not capture camera images, log meals, store health measurements, or send conversations to an AI service. Demo fitness and coach data are predefined and not saved to the cloud.",
      ],
      [
        "Device preferences",
        "Design Preview and Reduce Motion preferences are stored on this device. They do not contain health records.",
      ],
      [
        "Your secure access",
        "Passwords are handled by the existing authentication provider, not BodyIQ. Sign out from Profile to end your app session. This overview describes the current prototype; it is not a finalized production privacy policy.",
      ],
    ],
  },
  appearance: {
    title: "Appearance",
    icon: "moon",
    intro: "Less noise. More focus.",
    sections: [
      [
        "Signature dark",
        "BodyIQ uses black and charcoal surfaces with white typography and electric-green highlights. The dark design is intentional and consistent across the app.",
      ],
      [
        "A calmer experience",
        "Turn on Reduce Motion in Settings to use faster, gentler entrance transitions. System accessibility preferences are also respected.",
      ],
    ],
  },
  about: {
    title: "About BodyIQ AI",
    icon: "info",
    intro: "Your Body. Your Goals. Your AI Coach.",
    sections: [
      [
        "Built around you",
        "BodyIQ AI brings the future of nutrition, movement and progress into one premium mobile experience, designed globally and starting with India.",
      ],
      [
        "Current stage",
        "This release builds the app foundation and polished design preview. Secure accounts and a basic cloud profile are active; advanced fitness tracking, food recognition and live AI coaching are not active yet.",
      ],
      [
        "Not a medical service",
        "Sample content is not a diagnosis, treatment recommendation or personalized health plan. Seek qualified professional care for medical questions.",
      ],
    ],
  },
} as const;
export default function SupportScreen() {
  const params = useLocalSearchParams<{ section?: string }>();
  const page =
    pages[
      (params.section && params.section in pages
        ? params.section
        : "help") as keyof typeof pages
    ];
  return (
    <Screen preview={false}>
      <BackHeader title={page.title} />
      <Card style={{ backgroundColor: "#192113", borderColor: "#C3FF5C22" }}>
        <Icon name={page.icon} color={p.green} size={28} />
        <Text
          style={{
            color: p.text,
            fontSize: 23,
            fontWeight: "600",
            lineHeight: 30,
            letterSpacing: -0.5,
            marginTop: 22,
          }}
        >
          {page.intro}
        </Text>
      </Card>
      {page.sections.map(([title, description]) => (
        <View key={title}>
          <Section title={title} />
          <Body style={{ fontSize: 13 }}>{description}</Body>
        </View>
      ))}
      <View style={{ marginTop: 28 }}>
        <Button
          title="Back to settings"
          secondary
          onPress={() => router.replace("/settings")}
          icon="sliders"
        />
      </View>
    </Screen>
  );
}
