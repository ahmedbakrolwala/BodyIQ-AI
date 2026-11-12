import { useState } from "react";
import { Image, StyleSheet, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  AuthGate,
  FieldError,
  TrackingField,
} from "@/components/bodyiq/tracking-form";
import {
  Body,
  Button,
  Card,
  Header,
  Screen,
  Section,
} from "@/components/bodyiq/ui";
import { palette as p } from "@/constants/design";
import { trpc } from "@/lib/trpc";

const fields = [
  { key: "weightKg", label: "WEIGHT · KG", placeholder: "Optional" },
  { key: "waistCm", label: "WAIST · CM", placeholder: "Optional" },
  { key: "chestCm", label: "CHEST · CM", placeholder: "Optional" },
  { key: "armCm", label: "ARM · CM", placeholder: "Optional" },
  { key: "thighCm", label: "THIGH · CM", placeholder: "Optional" },
] as const;
type Key = (typeof fields)[number]["key"];
export default function LogProgress() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ? Number(params.id) : null;
  const query = trpc.progress.summary.useQuery({ period: "all", limit: 100 });
  const create = trpc.progress.create.useMutation({
    onSuccess: () => {
      void query.refetch();
      router.back();
    },
  });
  const update = trpc.progress.update.useMutation({
    onSuccess: () => {
      void query.refetch();
      router.back();
    },
  });
  const [values, setValues] = useState<Record<Key, string>>({
    weightKg: "",
    waistCm: "",
    chestCm: "",
    armCm: "",
    thighCm: "",
  });
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<
    | {
        mimeType: "image/jpeg" | "image/png" | "image/webp";
        imageBase64: string;
      }
    | undefined
  >();
  const [error, setError] = useState("");
  const existing = id
    ? query.data?.records.find((r) => r.id === id)
    : undefined;
  const loadExisting = () => {
    if (existing) {
      setValues({
        weightKg: existing.weightKg?.toString() ?? "",
        waistCm: existing.waistCm?.toString() ?? "",
        chestCm: existing.chestCm?.toString() ?? "",
        armCm: existing.armCm?.toString() ?? "",
        thighCm: existing.thighCm?.toString() ?? "",
      });
      setNote(existing.note);
    }
  };
  if (
    existing &&
    values.weightKg === "" &&
    values.waistCm === "" &&
    values.chestCm === "" &&
    values.armCm === "" &&
    values.thighCm === ""
  )
    loadExisting();
  async function choosePhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.82,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      const mime = result.assets[0].mimeType ?? "image/jpeg";
      if (
        mime === "image/jpeg" ||
        mime === "image/png" ||
        mime === "image/webp"
      )
        setPhoto({ mimeType: mime, imageBase64: result.assets[0].base64 });
    }
  }
  async function save() {
    setError("");
    const input: any = {
      weightKg: null,
      waistCm: null,
      chestCm: null,
      armCm: null,
      thighCm: null,
      note,
    };
    for (const f of fields) {
      const raw = values[f.key].trim();
      if (raw) {
        const n = Number(raw.replace(",", "."));
        if (!Number.isFinite(n) || n <= 0) {
          setError(`Enter a valid ${f.label.toLowerCase()} value.`);
          return;
        }
        input[f.key] = n;
      }
    }
    if (photo) input.photo = photo;
    if (Object.values(input).every((v) => v === null || v === "")) {
      setError("Add at least one measurement or a photo.");
      return;
    }
    try {
      if (id) await update.mutateAsync({ id, ...input });
      else await create.mutateAsync(input);
    } catch {
      setError("We couldn’t save this progress record. Please try again.");
    }
  }
  return (
    <AuthGate title={id ? "Edit progress" : "Record progress"} badge="PROGRESS">
      <Screen>
        <Header
          title={id ? "Refine your record" : "A measurement, not a judgment."}
          eyebrow="PRIVATE PROGRESS"
        />
        <Body>
          Track what you choose. Your records are private, and no future body
          transformation is promised.
        </Body>
        <Section title="Measurements" />
        <Card>
          {fields.map((f) => (
            <TrackingField
              key={f.key}
              label={f.label}
              value={values[f.key]}
              onChangeText={(v) => setValues((old) => ({ ...old, [f.key]: v }))}
              placeholder={f.placeholder}
              accessibilityLabel={f.label}
            />
          ))}
        </Card>
        <Section title="Optional progress photo" />
        <Card>
          <Button
            title={photo ? "Photo selected" : "Choose from gallery"}
            secondary
            onPress={() => void choosePhoto()}
            icon="image"
          />
          {photo ? (
            <Text style={styles.selected}>Private photo ready to upload</Text>
          ) : existing?.photoUrl ? (
            <Image source={{ uri: existing.photoUrl }} style={styles.preview} />
          ) : (
            <Body style={{ marginTop: 10 }}>
              Photos are stored privately and are only returned to your account.
            </Body>
          )}
        </Card>
        <Section title="Note" />
        <Card>
          <TrackingField
            label="OPTIONAL NOTE"
            value={note}
            onChangeText={setNote}
            placeholder="How are you feeling?"
            accessibilityLabel="Progress note"
          />
        </Card>
        {error ? <FieldError>{error}</FieldError> : null}
        <Button
          title={
            create.isPending || update.isPending
              ? "Saving securely…"
              : id
                ? "Save changes"
                : "Save progress"
          }
          onPress={() => void save()}
          disabled={create.isPending || update.isPending}
          icon="check"
        />
      </Screen>
    </AuthGate>
  );
}
const styles = StyleSheet.create({
  selected: { color: p.green, fontSize: 11, marginTop: 10 },
  preview: {
    height: 180,
    borderRadius: 14,
    marginTop: 12,
    backgroundColor: p.surface,
  },
});
