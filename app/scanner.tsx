import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import {
  Badge,
  Body,
  Button,
  Card,
  Icon,
  Label,
  PreviewNotice,
  Screen,
  Segmented,
} from "@/components/bodyiq/ui";
import { BackHeader, FoodImage } from "@/components/bodyiq/premium";
import { palette as p } from "@/constants/design";
import { useDesignPreview } from "@/lib/preview-context";

export default function ScannerScreen() {
  const { isPreview, setPreview } = useDesignPreview();
  const [mode, setMode] = useState("Photo");
  const [result, setResult] = useState(false);
  const [flash, setFlash] = useState(false);
  const { width } = useWindowDimensions();
  // Adjust transient demo state before committing a changed preview mode.
  const [previousPreview, setPreviousPreview] = useState(isPreview);
  if (previousPreview !== isPreview) {
    setPreviousPreview(isPreview);
    if (!isPreview) {
      setResult(false);
    }
  }
  return (
    <Screen>
      <BackHeader title="Food scanner" badge="DESIGN DEMO" />
      <Body style={{ marginBottom: 22 }}>
        A smarter look at what’s on your plate.
      </Body>
      <Segmented
        options={["Photo", "Barcode"]}
        value={mode}
        onChange={(v) => {
          setMode(v);
          setResult(false);
        }}
      />
      {isPreview ? (
        <>
          <View style={s.camera}>
            <View style={s.cameraTop}>
              <Badge text="SAMPLE CAMERA VIEW" />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  flash ? "Turn demo flash off" : "Turn demo flash on"
                }
                onPress={() => setFlash(!flash)}
                style={s.iconButton}
              >
                <Icon
                  name={flash ? "zap" : "zap-off"}
                  color={flash ? p.green : p.muted}
                  size={19}
                />
              </Pressable>
            </View>
            <View style={s.target}>
              {mode === "Photo" ? (
                <FoodImage size={Math.min(224, width - 108)} />
              ) : (
                <View style={s.barcode}>
                  {Array.from({ length: 23 }, (_, i) => (
                    <View
                      key={i}
                      style={{
                        width: i % 3 === 0 ? 5 : 2,
                        height: i % 4 === 0 ? 105 : 96,
                        backgroundColor: "#E9EEE7",
                        marginRight: i % 3 === 0 ? 3 : 2,
                      }}
                    />
                  ))}
                </View>
              )}
              <View
                style={[
                  s.corner,
                  { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
                ]}
              />
              <View
                style={[
                  s.corner,
                  { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
                ]}
              />
              <View
                style={[
                  s.corner,
                  {
                    bottom: 0,
                    left: 0,
                    borderBottomWidth: 3,
                    borderLeftWidth: 3,
                  },
                ]}
              />
              <View
                style={[
                  s.corner,
                  {
                    bottom: 0,
                    right: 0,
                    borderBottomWidth: 3,
                    borderRightWidth: 3,
                  },
                ]}
              />
            </View>
            <Text style={s.cameraHint}>
              {mode === "Photo"
                ? "Keep the plate inside the frame"
                : "Align the sample barcode inside the frame"}
            </Text>
            <Text style={s.cameraSub}>
              DEMO ONLY · CAMERA IS NOT ACTIVE{flash ? " · DEMO FLASH ON" : ""}
            </Text>
          </View>
          <View style={{ marginTop: 20 }}>
            <Button
              title={result ? "Preview another scan" : "Preview sample scan"}
              onPress={() => setResult(!result)}
              icon="camera"
            />
          </View>
          {result && (
            <Card style={{ marginTop: 24 }}>
              <View style={s.row}>
                <Label>SAMPLE SCAN RESULT</Label>
                <Badge text="ILLUSTRATIVE" />
              </View>
              <View
                style={[s.row, { marginTop: 20, justifyContent: "flex-start" }]}
              >
                <FoodImage size={70} />
                <View style={{ flex: 1 }}>
                  <Text style={s.foodTitle}>
                    Grilled chicken{"\n"}& rice bowl
                  </Text>
                  <Body style={{ fontSize: 10 }}>Example serving · 1 bowl</Body>
                </View>
              </View>
              <Text style={s.calories}>
                560<Text style={s.unit}> kcal</Text>
              </Text>
              <View style={s.macros}>
                {[
                  { label: "Protein", value: "38 g", color: p.green },
                  { label: "Carbs", value: "68 g", color: p.lavender },
                  { label: "Fats", value: "15 g", color: p.orange },
                ].map((item) => (
                  <View key={item.label} style={{ flex: 1, gap: 8 }}>
                    <Text style={{ color: p.muted, fontSize: 10 }}>
                      {item.label}
                    </Text>
                    <Text
                      style={{
                        color: item.color,
                        fontSize: 18,
                        fontWeight: "600",
                      }}
                    >
                      {item.value}
                    </Text>
                  </View>
                ))}
              </View>
              <Body style={{ fontSize: 10, marginBottom: 20 }}>
                These sample nutrition values are predefined for the design, not
                measured from an image or barcode.
              </Body>
              <Button
                title="View nutrition preview"
                secondary
                onPress={() => router.push("/(tabs)/nutrition")}
                icon="arrow-right"
              />
            </Card>
          )}
        </>
      ) : (
        <Card>
          <View style={{ alignItems: "center", paddingVertical: 22, gap: 16 }}>
            <Icon name="camera" color={p.green} size={34} />
            <Text style={s.foodTitle}>Food recognition is coming next.</Text>
            <Body style={{ textAlign: "center" }}>
              No camera, barcode lookup, or image-analysis service is active.
              Try the labeled sample flow to explore the interface.
            </Body>
          </View>
          <Button
            title="Show sample scanner"
            onPress={() => setPreview(true)}
            icon="eye"
          />
        </Card>
      )}
      <View style={s.tip}>
        <Icon name="sun" color={p.green} size={18} />
        <View style={{ flex: 1 }}>
          <Text style={s.tipTitle}>A little light makes a difference.</Text>
          <Body style={{ fontSize: 11 }}>
            The future scan flow will work best with a clear view of your food
            in natural light.
          </Body>
        </View>
      </View>
      <PreviewNotice>
        The scanner preview does not capture photos, access your camera, or save
        food records. Real recognition and logging are not active yet.
      </PreviewNotice>
    </Screen>
  );
}
const s = StyleSheet.create({
  camera: {
    borderRadius: 24,
    backgroundColor: "#111511",
    borderWidth: 1,
    borderColor: p.border,
    padding: 18,
    alignItems: "center",
    minHeight: 348,
  },
  cameraTop: {
    alignSelf: "stretch",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: p.elevated,
  },
  target: {
    padding: 12,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 205,
    minWidth: 205,
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: p.green,
    borderRadius: 2,
  },
  cameraHint: {
    color: p.text,
    fontSize: 11,
    marginTop: 20,
    textAlign: "center",
  },
  cameraSub: {
    color: p.muted,
    fontSize: 8,
    letterSpacing: 0.8,
    marginTop: 8,
    textAlign: "center",
  },
  barcode: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  foodTitle: { color: p.text, fontSize: 18, lineHeight: 25, fontWeight: "600" },
  calories: {
    color: p.text,
    fontSize: 35,
    fontWeight: "600",
    letterSpacing: -1,
    marginTop: 24,
  },
  unit: { color: p.muted, fontSize: 12, fontWeight: "400" },
  macros: {
    flexDirection: "row",
    gap: 16,
    marginVertical: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: p.border,
  },
  tip: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    padding: 17,
    backgroundColor: "#192113",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#C3FF5C20",
    marginTop: 24,
  },
  tipTitle: { color: p.text, fontSize: 12, fontWeight: "500", marginBottom: 6 },
});
