import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import {
  AuthGate,
  TrackingQueryError,
} from "@/components/bodyiq/tracking-form";
import { BackHeader } from "@/components/bodyiq/premium";
import { Body, Card } from "@/components/bodyiq/ui";
import { palette as p } from "@/constants/design";
import { trpc } from "@/lib/trpc";
export default function GroceryListScreen() {
  const params = useLocalSearchParams<{ planId?: string }>();
  const planId = Number(params.planId);
  return (
    <AuthGate title="Grocery list" badge="NUTRITION">
      <BackHeader title="Grocery list" badge="NUTRITION" />
      <Grocery planId={planId} />
    </AuthGate>
  );
}
function Grocery({ planId }: { planId: number }) {
  const query = trpc.nutrition.getMealPlan.useQuery(
    { planId },
    { enabled: Number.isInteger(planId) && planId > 0, retry: false },
  );
  if (query.isLoading) return <ActivityIndicator color={p.green} />;
  if (query.isError)
    return <TrackingQueryError onRetry={() => void query.refetch()} />;
  if (!query.data) return <Body>This plan could not be found.</Body>;
  return (
    <>
      <Body style={{ marginBottom: 14 }}>
        Aggregated from the saved plan. Quantities and prices are estimates;
        verify packaging, availability, and allergies.
      </Body>
      <Card>
        {query.data.groceries.map((item) => (
          <View style={styles.line} key={`${item.ingredient}-${item.unit}`}>
            <Text style={styles.name}>{item.ingredient}</Text>
            <Text style={styles.qty}>
              {item.quantity}
              {item.unit}
            </Text>
          </View>
        ))}
      </Card>
    </>
  );
}
const styles = StyleSheet.create({
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: p.border,
    paddingVertical: 12,
  },
  name: { color: p.text, fontSize: 14 },
  qty: { color: p.green, fontWeight: "600" },
});
