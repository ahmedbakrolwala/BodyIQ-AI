import { Image, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { Icon, IconName, Badge } from "./ui";
import { palette as p } from "@/constants/design";

export { PreviewBanner } from "./preview-banner";
export function BackHeader({
  title,
  badge,
}: {
  title: string;
  badge?: string;
}) {
  return (
    <View style={a.backHeader}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)")
        }
        style={a.back}
      >
        <Icon name="arrow-left" color={p.text} />
      </Pressable>
      <Text accessibilityRole="header" style={a.backTitle}>
        {title}
      </Text>
      {badge && <Badge text={badge} />}
    </View>
  );
}
export function Meter({
  value,
  goal,
  color = p.green,
  height = 5,
}: {
  value: number;
  goal: number;
  color?: string;
  height?: number;
}) {
  const percent =
    goal > 0 ? Math.min(100, Math.max(0, (value / goal) * 100)) : 0;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: goal, now: value }}
      style={{
        height,
        borderRadius: height,
        backgroundColor: p.border,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          height,
          width: `${percent}%`,
          borderRadius: height,
          backgroundColor: color,
        }}
      />
    </View>
  );
}
export function SettingRow({
  icon,
  title,
  subtitle,
  onPress,
  value,
  onToggle,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  value?: boolean;
  onToggle?: (v: boolean) => void;
}) {
  const content = (
    <>
      <View style={a.settingIcon}>
        <Icon name={icon} size={19} color={p.green} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={a.settingTitle}>{title}</Text>
        {subtitle && <Text style={a.settingSub}>{subtitle}</Text>}
      </View>
      {onToggle ? (
        <Switch
          accessibilityLabel={title}
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: p.border, true: "#648D31" }}
          thumbColor={value ? p.green : "#A0AAA1"}
        />
      ) : (
        <Icon name="chevron-right" size={17} />
      )}
    </>
  );
  return onToggle ? (
    <View style={a.setting}>{content}</View>
  ) : (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [a.setting, { opacity: pressed ? 0.7 : 1 }]}
    >
      {content}
    </Pressable>
  );
}
export function FoodImage({ size = 64 }: { size?: number }) {
  return (
    <Image
      source={require("@/assets/images/sample-meal.jpg")}
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        backgroundColor: p.elevated,
      }}
      accessibilityLabel="Sample grilled chicken and rice bowl"
    />
  );
}
export function MiniStat({
  icon,
  value,
  unit,
  title,
  color = p.green,
}: {
  icon: IconName;
  value: string;
  unit: string;
  title: string;
  color?: string;
}) {
  return (
    <View style={a.stat}>
      <Icon name={icon} size={18} color={color} />
      <Text style={a.statValue}>
        {value}
        <Text style={a.statUnit}> {unit}</Text>
      </Text>
      <Text style={a.statTitle}>{title}</Text>
    </View>
  );
}
const a = StyleSheet.create({
  preview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginBottom: 22,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C3FF5C24",
    backgroundColor: "#192113",
  },
  previewTitle: {
    color: p.green,
    fontSize: 9,
    letterSpacing: 0.9,
    fontWeight: "700",
  },
  previewSub: { color: "#A8B49E", fontSize: 10, lineHeight: 15 },
  previewToggle: {
    minHeight: 40,
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    marginBottom: 23,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: p.surface,
    borderWidth: 1,
    borderColor: p.border,
    justifyContent: "center",
    alignItems: "center",
  },
  backTitle: {
    flex: 1,
    color: p.text,
    fontSize: 21,
    fontWeight: "600",
    letterSpacing: -0.5,
  },
  setting: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    minHeight: 75,
    paddingVertical: 14,
    borderBottomColor: p.border,
    borderBottomWidth: 1,
  },
  settingIcon: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: "#C3FF5C0A",
    alignItems: "center",
    justifyContent: "center",
  },
  settingTitle: { color: p.text, fontSize: 13, fontWeight: "500" },
  settingSub: { color: p.muted, fontSize: 10, lineHeight: 16, marginTop: 4 },
  stat: {
    flex: 1,
    backgroundColor: p.surface,
    borderColor: p.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
    gap: 10,
  },
  statValue: {
    color: p.text,
    fontSize: 23,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
  statUnit: { color: p.muted, fontSize: 10, fontWeight: "400" },
  statTitle: { color: p.muted, fontSize: 10 },
});
