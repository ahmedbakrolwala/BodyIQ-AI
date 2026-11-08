import { View, Text, StyleSheet } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Line,
  Path,
  Text as SvgText,
} from "react-native-svg";
import { palette as p } from "@/constants/design";
import { chartPoints, boundedProgress } from "@/lib/chart-math";

export function ActivityRing({
  size = 134,
  value,
  goal = 0,
  label = "No activity yet",
  unit,
  color = p.green,
  dataKind = "sample",
}: {
  size?: number;
  value?: number;
  goal?: number;
  label?: string;
  unit?: string;
  color?: string;
  dataKind?: "sample" | "real";
}) {
  const radius = 59;
  const circumference = 2 * Math.PI * radius;
  const progress = value === undefined ? 0 : boundedProgress(value, goal);
  return (
    <View
      accessible
      accessibilityLabel={
        value === undefined
          ? "No activity recorded"
          : `${dataKind === "real" ? "Recorded" : "Sample"}: ${value} ${unit ?? ""}, ${goal > 0 ? `goal ${goal}` : "no target set"}`
      }
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
          r={radius}
          stroke={p.border}
          strokeWidth="8"
          fill="none"
        />
        <Circle
          cx="70"
          cy="70"
          r={radius}
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - progress)}
          transform="rotate(-90 70 70)"
        />
        <Circle
          cx="70"
          cy="70"
          r="46"
          stroke="#B6A1EF20"
          strokeWidth="3"
          fill="none"
        />
      </Svg>
      <Text
        style={{
          color: p.text,
          fontSize: value && value > 999 ? 26 : 30,
          fontWeight: "600",
          letterSpacing: -1,
        }}
      >
        {value === undefined ? "—" : value.toLocaleString("en-IN")}
      </Text>
      {unit && (
        <Text style={{ color: p.muted, fontSize: 10, marginTop: 1 }}>
          {unit}
        </Text>
      )}
      <Text
        style={{
          color: p.muted,
          fontSize: 9,
          marginTop: 4,
          textAlign: "center",
          maxWidth: size - 36,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
export function SampleTrend({
  values,
  labels,
  min,
  max,
  color = p.green,
  unit = "kg",
}: {
  values: number[];
  labels: string[];
  min: number;
  max: number;
  color?: string;
  unit?: string;
}) {
  const points = chartPoints(values, min, max);
  const path = points
    .map((point, i) => `${i === 0 ? "M" : "L"} ${point.x + 34} ${point.y + 14}`)
    .join(" ");
  const area = points.length ? `${path} L334 144 L34 144 Z` : "";
  return (
    <View
      accessible
      accessibilityLabel={`Sample ${unit} chart. Values ${values.join(", ")}. Not user data.`}
    >
      <Svg
        width="100%"
        height={180}
        viewBox="0 0 344 180"
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id="sampleFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.2" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {[0, 1, 2, 3].map((i) => {
          const y = 14 + (i / 3) * 130;
          const number = max - (i / 3) * (max - min);
          return <ViewGrid key={i} y={y} number={number} />;
        })}
        <Path d={area} fill="url(#sampleFill)" />
        <Path d={path} stroke={color} strokeWidth="2.5" fill="none" />
        {points.map((point, i) => (
          <Circle
            key={i}
            cx={point.x + 34}
            cy={point.y + 14}
            r={i === points.length - 1 ? 4 : 2}
            fill={color}
          />
        ))}
        {labels.map((label, i) => (
          <SvgText
            key={i}
            x={34 + (i / Math.max(1, labels.length - 1)) * 300}
            y="170"
            fill={p.muted}
            fontSize="10"
            textAnchor={
              i === 0 ? "start" : i === labels.length - 1 ? "end" : "middle"
            }
          >
            {label}
          </SvgText>
        ))}
      </Svg>
      <Text style={{ color: p.muted, fontSize: 9, marginTop: 6 }}>
        SAMPLE TREND · {unit}
      </Text>
    </View>
  );
}
function ViewGrid({ y, number }: { y: number; number: number }) {
  return (
    <>
      <Line
        x1="34"
        x2="334"
        y1={y}
        y2={y}
        stroke={p.border}
        strokeDasharray="3 5"
      />
      <SvgText x="0" y={y + 3} fill={p.muted} fontSize="9">
        {number.toFixed(1)}
      </SvgText>
    </>
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
