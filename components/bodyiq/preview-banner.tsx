import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { palette as p } from "@/constants/design";
import { useDesignPreview } from "@/lib/preview-context";
export function PreviewBanner() {
  const { isPreview, setPreview } = useDesignPreview();
  return (
    <View style={b.bar}>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={b.title}>
          {isPreview
            ? "DESIGN PREVIEW · SAMPLE DATA"
            : "YOUR DATA · EMPTY STATE"}
        </Text>
        <Text style={b.description}>
          {isPreview
            ? "Illustrative only. Not your activity."
            : "No fitness records have been collected yet."}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isPreview ? "Hide sample data" : "Show sample data"}
        onPress={() => setPreview(!isPreview)}
        style={b.toggle}
      >
        <Feather
          name={isPreview ? "eye-off" : "eye"}
          color={p.green}
          size={16}
        />
      </Pressable>
    </View>
  );
}
const b = StyleSheet.create({
  bar: {
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
  title: { color: p.green, fontSize: 9, letterSpacing: 0.9, fontWeight: "700" },
  description: { color: "#A8B49E", fontSize: 10, lineHeight: 15 },
  toggle: {
    minHeight: 40,
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
