import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";
import { Icon, IconName } from "@/components/bodyiq/ui";
import { palette as p } from "@/constants/design";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottom = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabs: { name: string; title: string; icon: IconName }[] = [
    { name: "index", title: "Home", icon: "grid" },
    { name: "nutrition", title: "Nutrition", icon: "pie-chart" },
    { name: "workouts", title: "Workouts", icon: "activity" },
    { name: "progress", title: "Progress", icon: "bar-chart-2" },
    { name: "coach", title: "AI Coach", icon: "zap" },
  ];
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: p.background },
        tabBarActiveTintColor: p.green,
        tabBarInactiveTintColor: p.muted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600", marginTop: 4 },
        tabBarStyle: {
          backgroundColor: "#101311",
          borderTopColor: p.border,
          borderTopWidth: 1,
          height: 66 + bottom,
          paddingTop: 10,
          paddingBottom: bottom,
        },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused }) => (
              <Icon
                name={tab.icon}
                size={21}
                color={focused ? p.green : p.muted}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
