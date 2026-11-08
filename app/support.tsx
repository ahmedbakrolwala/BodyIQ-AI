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
        "The main navigation connects Home, Nutrition, Workouts, Progress and AI Coach. Food Scanner is available from Home and Nutrition. Profile opens from the header icon. Home quick actions log meals, start/complete workout sessions and record weight; your dashboard updates after saves.",
      ],
      [
        "Sample data, clearly marked",
        "Design Preview shows illustrative meals, workouts and charts. Tap the eye button in the preview banner, or change the switch in Settings, to hide samples. No sample fitness records are saved to your account. Authenticated Home always shows real tracking rather than design-preview metrics.",
      ],
      [
        "Save your real profile",
        "Sign in to save your private fitness profile. Start the five-step onboarding from Home, Nutrition, Workouts or Profile; review and edit it through View my fitness profile. Existing Manus access remains available while Google/email delivery awaits configuration.",
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
        "BodyIQ stores authentication identity, your basic account profile, and fitness onboarding answers you choose to save, including age, height, weights, goals, activity, equipment, dietary preferences and allergies. Meals and their entered nutrition amounts, workout starts/completions and recorded weights are also stored when you use tracking. Native session tokens use secure device storage.",
      ],
      [
        "What is not collected",
        "Design previews do not capture camera images, log meals or send conversations to an AI service. Demo metrics are not saved to the cloud. Measurements you explicitly save through fitness onboarding are private account records, not demo data.",
      ],
      [
        "Device preferences",
        "Design Preview and Reduce Motion preferences are stored on this device. They do not contain health records.",
      ],
      [
        "Your secure access",
        "BodyIQ email passwords are stored only as salted memory-hard hashes; Google and Manus credentials remain with their providers. Sign out to revoke your current session. Account security includes confirmed account deletion. This overview is not a finalized production privacy policy.",
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
        "This release builds the app foundation and polished design preview. Private account and fitness profiles, estimated targets, real Home tracking and starter recommendations are implemented. Live Google/email activation needs provider setup; advanced tracking, food recognition and live AI coaching remain inactive.",
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
