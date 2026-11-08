import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { palette as p } from "@/constants/design";

export function ActivityRing({ size = 134 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg
        width={size}
        height={size}
        viewBox="0 0 140 140"
        style={{ position: "absolute" }}
      >
        <Circle
          cx="70"
          cy="70"
          r="59"
          stroke={p.border}
          strokeWidth="8"
          fill="none"
        />
        <Circle
          cx="70"
          cy="70"
          r="46"
          stroke="#B6A1EF20"
          strokeWidth="5"
          fill="none"
        />
        <Circle cx="70" cy="11" r="4" fill={p.green} />
      </Svg>
      <Text
        style={{
          color: p.text,
          fontSize: 30,
          fontWeight: "600",
          letterSpacing: -1,
        }}
      >
        —
      </Text>
      <Text style={{ color: p.muted, fontSize: 10, marginTop: 3 }}>
        No activity yet
      </Text>
    </View>
  );
}
export function EmptyChart({
  metric = "Weight",
  units = "kg",
  period = "Week",
}: {
  metric?: string;
  units?: string;
  period?: string;
}) {
  const labels =
    period === "Month"
      ? ["W1", "W2", "W3", "W4"]
      : period === "Year"
        ? ["Jan", "Mar", "May", "Jul", "Sep", "Nov"]
        : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <View
      accessible
      accessibilityLabel={`${metric} chart, no measurements recorded. Units ${units}.`}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          gap: 6,
          marginBottom: 14,
        }}
      >
        <Text style={c.value}>—</Text>
        <Text style={{ color: p.muted, fontSize: 13 }}>{units}</Text>
      </View>
      <View style={{ height: 150 }}>
        <Svg
          width="100%"
          height={150}
          viewBox="0 0 340 150"
          preserveAspectRatio="none"
        >
          {[10, 50, 90, 130].map((y) => (
            <Line
              key={y}
              x1="0"
              y1={y}
              x2="340"
              y2={y}
              stroke={p.border}
              strokeDasharray="4 6"
            />
          ))}
          <Path
            d="M0 100 L340 100"
            stroke="#C3FF5C30"
            strokeWidth="1.5"
            strokeDasharray="5 5"
          />
        </Svg>
        <View style={c.overlay}>
          <Text style={c.note}>Your first measurement starts the story.</Text>
        </View>
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 10,
        }}
      >
        {labels.map((label) => (
          <Text key={label} style={{ color: p.muted, fontSize: 10 }}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}
const c = StyleSheet.create({
  value: { color: p.text, fontSize: 34, fontWeight: "600" },
  overlay: {
    position: "absolute",
    top: 57,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  note: {
    color: p.muted,
    backgroundColor: p.surface,
    padding: 10,
    fontSize: 11,
  },
});
