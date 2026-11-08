import { ActivityIndicator, View } from "react-native";
import DemoHomeScreen from "@/components/bodyiq/demo-home";
import RealHomeScreen from "@/components/bodyiq/real-home";
import { useAuth } from "@/hooks/use-auth";
import { Body, Button, Card, Header, Screen } from "@/components/bodyiq/ui";
import { palette as p } from "@/constants/design";
export default function HomeScreen() {
  const auth = useAuth();
  if (auth.loading)
    return (
      <Screen preview={false}>
        <ActivityIndicator color={p.green} />
        <Body>Loading your secure dashboard…</Body>
      </Screen>
    );
  if (auth.error)
    return (
      <Screen preview={false}>
        <Header title="Your dashboard" eyebrow="BodyIQ Cloud" />
        <Card>
          <Body>
            Your account connection could not be verified. We won’t substitute
            sample data.
          </Body>
          <View style={{ height: 18 }} />
          <Button
            title="Retry secure connection"
            onPress={() => void auth.refresh()}
          />
        </Card>
      </Screen>
    );
  return auth.isAuthenticated ? <RealHomeScreen /> : <DemoHomeScreen />;
}
