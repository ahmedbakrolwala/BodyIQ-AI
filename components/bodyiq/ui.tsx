import React, { PropsWithChildren, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { palette as p } from "@/constants/design";

export type IconName = React.ComponentProps<typeof Feather>["name"];
export function Icon({
  name,
  color = p.muted,
  size = 20,
}: {
  name: IconName;
  color?: string;
  size?: number;
}) {
  return <Feather name={name} size={size} color={color} />;
}
export function Logo({
  compact = false,
  size = 32,
}: {
  compact?: boolean;
  size?: number;
}) {
  return (
    <View style={s.logo}>
      <View style={{ width: size, height: size }}>
        <Image
          source={require("@/assets/images/icon.png")}
          style={{ width: size, height: size }}
          accessibilityLabel="BodyIQ AI mark"
        />
      </View>
      {!compact && (
        <Text style={s.wordmark}>
          BODYIQ<Text style={{ color: p.green }}> AI</Text>
        </Text>
      )}
    </View>
  );
}
export function FadeIn({
  children,
  style,
}: PropsWithChildren<{ style?: ViewStyle }>) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (mounted)
        Animated.timing(opacity, {
          toValue: 1,
          duration: reduced ? 0 : 300,
          useNativeDriver: true,
        }).start();
    });
    return () => {
      mounted = false;
      opacity.stopAnimation();
    };
  }, [opacity]);
  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
}
export function Screen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={s.screen}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <FadeIn>{children}</FadeIn>
      </ScrollView>
    </SafeAreaView>
  );
}
export function Header({
  title,
  eyebrow,
  home = false,
}: {
  title: string;
  eyebrow: string;
  home?: boolean;
}) {
  return (
    <View style={s.header}>
      <View style={{ flex: 1 }}>
        {home ? <Logo size={28} /> : <Text style={s.eyebrow}>{eyebrow}</Text>}
        <Text
          accessibilityRole="header"
          style={[s.title, home && { marginTop: 24 }]}
        >
          {title}
        </Text>
        {home && <Text style={s.subtitle}>{eyebrow}</Text>}
      </View>
      <Pressable
        onPress={() => router.push("/profile")}
        accessibilityRole="button"
        accessibilityLabel="Open your profile"
        style={({ pressed }) => [s.avatar, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Icon name="user" color={p.text} size={20} />
      </Pressable>
    </View>
  );
}
export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function Label({
  children,
  color = p.muted,
}: PropsWithChildren<{ color?: string }>) {
  return <Text style={[s.eyebrow, { color }]}>{children}</Text>;
}
export function Body({
  children,
  color = p.muted,
  style,
}: PropsWithChildren<{
  color?: string;
  style?: React.ComponentProps<typeof Text>["style"];
}>) {
  return <Text style={[s.body, { color }, style]}>{children}</Text>;
}
export function Section({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={s.section}>
      <Text accessibilityRole="header" style={s.sectionTitle}>
        {title}
      </Text>
      {action && (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text style={{ color: p.green, fontSize: 12, fontWeight: "600" }}>
            {action}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  icon = "arrow-right",
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        {
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      <Text
        style={[s.buttonText, { color: secondary ? p.text : p.background }]}
      >
        {title}
      </Text>
      <Icon name={icon} color={secondary ? p.text : p.background} size={18} />
    </Pressable>
  );
}
export function Badge({
  text = "COMING NEXT",
  color = p.green,
}: {
  text?: string;
  color?: string;
}) {
  return (
    <View style={s.badge}>
      <View
        style={{ width: 5, height: 5, borderRadius: 5, backgroundColor: color }}
      />
      <Text style={{ color, fontSize: 9, letterSpacing: 1, fontWeight: "700" }}>
        {text}
      </Text>
    </View>
  );
}
export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: IconName;
  title: string;
  description: string;
}) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Icon name={icon} size={25} color={p.green} />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Body style={{ textAlign: "center", maxWidth: 340 }}>{description}</Body>
    </View>
  );
}
export function PreviewNotice({ children }: PropsWithChildren) {
  return (
    <View style={s.notice}>
      <Icon name="info" size={14} />
      <Body style={{ flex: 1, fontSize: 11, lineHeight: 17 }}>
        {children ??
          "Phase 1 preview. Tracking and personalized recommendations are not active yet."}
      </Body>
    </View>
  );
}
export function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[
        s.choice,
        selected && { borderColor: p.green, backgroundColor: p.greenDark },
      ]}
    >
      <Text
        style={{
          color: selected ? p.green : p.text,
          fontSize: 14,
          fontWeight: "500",
        }}
      >
        {label}
      </Text>
      <Icon
        name={selected ? "check-circle" : "circle"}
        color={selected ? p.green : p.muted}
        size={18}
      />
    </Pressable>
  );
}
export function Segmented({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={s.segmented}>
      {options.map((option) => (
        <Pressable
          key={option}
          accessibilityRole="button"
          accessibilityState={{ selected: value === option }}
          onPress={() => onChange(option)}
          style={[
            s.segment,
            value === option && { backgroundColor: p.elevated },
          ]}
        >
          <Text
            style={{
              color: value === option ? p.text : p.muted,
              fontSize: 12,
              fontWeight: "600",
            }}
          >
            {option}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: p.background },
  content: {
    padding: 22,
    paddingBottom: 30,
    width: "100%",
    maxWidth: 980,
    alignSelf: "center",
  },
  logo: { flexDirection: "row", alignItems: "center", gap: 7 },
  wordmark: {
    color: p.text,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 22,
  },
  title: {
    color: p.text,
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -1,
    marginTop: 8,
  },
  subtitle: { color: p.muted, fontSize: 13, marginTop: 7 },
  eyebrow: {
    color: p.muted,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: p.elevated,
    borderWidth: 1,
    borderColor: p.border,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: p.surface,
    borderWidth: 1,
    borderColor: p.border,
    borderRadius: 20,
    padding: 20,
  },
  body: { fontSize: 13, lineHeight: 21 },
  section: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 12,
    minHeight: 30,
  },
  sectionTitle: {
    color: p.text,
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  button: {
    minHeight: 54,
    backgroundColor: p.green,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    gap: 12,
  },
  secondary: {
    backgroundColor: p.surface,
    borderWidth: 1,
    borderColor: p.border,
  },
  buttonText: { fontSize: 14, fontWeight: "700", flexShrink: 1 },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF08",
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 6,
  },
  empty: { alignItems: "center", paddingVertical: 28, gap: 12 },
  emptyIcon: {
    width: 56,
    height: 56,
    backgroundColor: p.greenDark,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: { color: p.text, fontSize: 16, fontWeight: "600" },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 2,
  },
  choice: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: p.border,
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: "#101311",
    padding: 4,
    borderRadius: 12,
    marginBottom: 20,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
});
