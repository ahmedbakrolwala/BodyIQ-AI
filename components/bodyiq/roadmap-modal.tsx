import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Badge, Body, Button, Icon } from "./ui";
import { palette as p } from "@/constants/design";

export function RoadmapModal({
  visible,
  title,
  description,
  onClose,
}: {
  visible: boolean;
  title: string;
  description: string;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={m.backdrop}>
        <View style={m.sheet} accessibilityViewIsModal>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Badge text="FUTURE PHASE" />
            <Pressable
              accessibilityLabel="Close preview"
              accessibilityRole="button"
              onPress={onClose}
              style={{
                width: 44,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="x" />
            </Pressable>
          </View>
          <Text accessibilityRole="header" style={m.title}>
            {title}
          </Text>
          <Body style={{ marginBottom: 20 }}>{description}</Body>
          <Body style={{ fontSize: 11, marginBottom: 26 }}>
            This is a concept preview, not an active feature. Phase 1
            establishes the app’s foundation without generating workouts,
            nutrition plans, or coaching advice.
          </Body>
          <Button title="Got it" onPress={onClose} icon="check" />
        </View>
      </View>
    </Modal>
  );
}
const m = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#000000B3",
    padding: 24,
  },
  sheet: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 440,
    borderRadius: 24,
    padding: 24,
    backgroundColor: p.surface,
    borderWidth: 1,
    borderColor: p.border,
  },
  title: {
    color: p.text,
    fontSize: 26,
    fontWeight: "600",
    marginTop: 18,
    marginBottom: 14,
    letterSpacing: -0.6,
  },
});
