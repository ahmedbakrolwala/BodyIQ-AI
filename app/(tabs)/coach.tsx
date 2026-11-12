import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  Badge,
  Body,
  Button,
  Card,
  Header,
  Icon,
  PreviewNotice,
  Screen,
  Section,
} from "@/components/bodyiq/ui";
import { palette as p } from "@/constants/design";
import { useDesignPreview } from "@/lib/preview-context";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

const prompts = [
  "How should I structure my next workout?",
  "What can I do to improve recovery?",
  "Review my recent progress",
];
const demoReply =
  "This is scripted Design Preview content. Turn off Design Preview and sign in to connect BodyIQ Coach to your saved profile and approved history.";
export default function CoachScreen() {
  const { isPreview } = useDesignPreview();
  const { isAuthenticated } = useAuth();
  return isPreview || !isAuthenticated ? <PreviewCoach /> : <LiveCoach />;
}
function Intro({ live }: { live: boolean }) {
  return (
    <Card style={c.intro}>
      <View style={c.top}>
        <View style={c.aiIcon}>
          <Icon name="zap" color={p.green} size={28} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={c.coachName}>BodyIQ Coach</Text>
          <View style={c.status}>
            <View style={c.dot} />
            <Text style={c.statusText}>
              {live ? "GROUNDED IN YOUR PROFILE" : "SCRIPTED DESIGN DEMO"}
            </Text>
          </View>
        </View>
        <Badge text={live ? "LIVE" : "PREVIEW"} />
      </View>
      <Text style={c.headline}>
        A little guidance.{"\n"}A lot of{" "}
        <Text style={{ color: p.green }}>possibility.</Text>
      </Text>
      <Body style={{ fontSize: 12 }}>
        Practical support for your goals, routine and real life.
      </Body>
    </Card>
  );
}
function PreviewCoach() {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<{ q: string; r: string }[]>([]);
  const add = (q: string, r = demoReply) => {
    if (!q.trim()) return;
    setMessages((old) => [...old, { q: q.trim(), r }].slice(-5));
    setDraft("");
  };
  return (
    <Screen>
      <Header title="Your coach. Your corner." eyebrow="BODYIQ INTELLIGENCE" />
      <Intro live={false} />
      <Section title="Start a sample conversation" />
      <View style={{ gap: 10 }}>
        {prompts.map((q) => (
          <Pressable
            key={q}
            accessibilityRole="button"
            onPress={() => add(q)}
            style={c.prompt}
          >
            <Icon name="message-circle" color={p.green} size={17} />
            <Text style={c.promptText}>{q}</Text>
            <Icon name="arrow-up-right" size={15} />
          </Pressable>
        ))}
      </View>
      <View style={c.conversation}>
        <View style={c.messageTop}>
          <Icon name="zap" color={p.green} size={17} />
          <Text style={c.messageLabel}>SAMPLE COACH MESSAGE</Text>
        </View>
        <View style={c.coachBubble}>
          <Text style={c.messageText}>
            Hey there. This sample shows what your future coaching space could
            feel like.
          </Text>
        </View>
        {messages.map((m, i) => (
          <View key={`${m.q}-${i}`} style={{ gap: 12, marginTop: 18 }}>
            <View style={c.userBubble}>
              <Text style={c.userText}>{m.q}</Text>
            </View>
            <View style={c.coachBubble}>
              <Text style={c.messageText}>{m.r}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={c.composer}>
        <TextInput
          accessibilityLabel="Sample coach message"
          placeholder="Try a sample message…"
          placeholderTextColor={p.muted}
          value={draft}
          onChangeText={setDraft}
          maxLength={240}
          style={c.input}
          multiline
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send sample message"
          disabled={!draft.trim()}
          onPress={() => add(draft)}
          style={[c.send, { opacity: draft.trim() ? 1 : 0.4 }]}
        >
          <Icon name="arrow-up" color={p.background} size={18} />
        </Pressable>
      </View>
      <Text style={c.caption}>DEMO ONLY · NOT LIVE AI · NOT SAVED</Text>
      <PreviewNotice>
        This is a scripted UI preview. Messages stay in memory and are not
        personalized health advice.
      </PreviewNotice>
    </Screen>
  );
}
function LiveCoach() {
  const utils = trpc.useUtils();
  const query = trpc.coach.history.useQuery({ limit: 50 });
  const send = trpc.coach.send.useMutation({
    onSuccess: () => {
      setDraft("");
      setFailed("");
      void utils.coach.history.invalidate();
    },
  });
  const [draft, setDraft] = useState("");
  const [failed, setFailed] = useState("");
  const submit = () => {
    const text = draft.trim();
    if (!text || send.isPending) return;
    setFailed("");
    send.mutate({ message: text });
  };
  const messages = query.data ?? [];
  return (
    <Screen>
      <Header title="Your coach. Your corner." eyebrow="BODYIQ INTELLIGENCE" />
      <Intro live />
      <Card style={c.safety}>
        <Icon name="shield" color={p.green} size={16} />
        <Text style={c.safetyText}>
          General fitness education only — not diagnosis or medication advice.
          For injuries or medical concerns, contact a qualified clinician.
        </Text>
      </Card>
      <Section
        title={messages.length ? "Your conversation" : "Ask your Coach"}
      />
      {query.isLoading ? (
        <ActivityIndicator color={p.green} style={{ margin: 30 }} />
      ) : query.isError ? (
        <Card>
          <Text style={c.messageText}>We couldn’t load your conversation.</Text>
          <Button title="Retry" secondary onPress={() => query.refetch()} />
        </Card>
      ) : messages.length === 0 ? (
        <View style={{ gap: 10 }}>
          {prompts.map((q) => (
            <Pressable
              key={q}
              accessibilityRole="button"
              onPress={() => setDraft(q)}
              style={c.prompt}
            >
              <Icon name="message-circle" color={p.green} size={17} />
              <Text style={c.promptText}>{q}</Text>
              <Icon name="arrow-up-right" size={15} />
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={c.conversation}>
          {messages.map((m) => (
            <View
              key={m.id}
              style={m.role === "user" ? c.userBubble : c.coachBubble}
            >
              <Text style={m.role === "user" ? c.userText : c.messageText}>
                {m.content}
              </Text>
            </View>
          ))}
        </View>
      )}
      {failed ? (
        <Card style={c.error}>
          <Text style={c.messageText}>
            Coach is unavailable right now. Your message is still here.
          </Text>
          <Button
            title="Retry"
            onPress={() => {
              setDraft(failed);
              setFailed("");
            }}
            secondary
          />
        </Card>
      ) : null}
      <View style={c.composer}>
        <TextInput
          accessibilityLabel="Message BodyIQ Coach"
          placeholder="Ask about training, nutrition or recovery…"
          placeholderTextColor={p.muted}
          value={draft}
          onChangeText={setDraft}
          maxLength={2000}
          style={c.input}
          multiline
          editable={!send.isPending}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send Coach message"
          disabled={!draft.trim() || send.isPending}
          onPress={submit}
          style={[
            c.send,
            { opacity: draft.trim() && !send.isPending ? 1 : 0.4 },
          ]}
        >
          {send.isPending ? (
            <ActivityIndicator color={p.background} />
          ) : (
            <Icon name="arrow-up" color={p.background} size={18} />
          )}
        </Pressable>
      </View>
      <Text style={c.caption}>YOUR CHAT IS SAVED SECURELY TO YOUR ACCOUNT</Text>
    </Screen>
  );
}
const c = StyleSheet.create({
  intro: { backgroundColor: "#161E11", borderColor: "#C3FF5C25", padding: 22 },
  top: { flexDirection: "row", alignItems: "center", gap: 12 },
  aiIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#C3FF5C40",
    backgroundColor: "#C3FF5C0D",
    alignItems: "center",
    justifyContent: "center",
  },
  coachName: { color: p.text, fontSize: 15, fontWeight: "600" },
  status: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 7 },
  dot: { width: 4, height: 4, borderRadius: 4, backgroundColor: p.green },
  statusText: { color: p.muted, fontSize: 7, letterSpacing: 0.6 },
  headline: {
    color: p.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "600",
    letterSpacing: -0.8,
    marginTop: 24,
    marginBottom: 14,
  },
  prompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    minHeight: 55,
    borderWidth: 1,
    borderColor: p.border,
    borderRadius: 14,
    backgroundColor: p.surface,
    padding: 15,
  },
  promptText: { color: p.text, fontSize: 12, flex: 1 },
  conversation: { marginTop: 18, gap: 12 },
  messageTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 11,
  },
  messageLabel: { color: p.muted, fontSize: 8, letterSpacing: 1 },
  coachBubble: {
    backgroundColor: p.surface,
    borderWidth: 1,
    borderColor: p.border,
    borderRadius: 17,
    borderTopLeftRadius: 4,
    padding: 17,
    marginRight: 22,
  },
  messageText: { color: "#CED6CA", fontSize: 12, lineHeight: 20 },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: p.greenDark,
    borderWidth: 1,
    borderColor: "#C3FF5C30",
    borderRadius: 17,
    borderBottomRightRadius: 4,
    padding: 15,
    maxWidth: "85%",
  },
  userText: { color: p.green, fontSize: 12, lineHeight: 19 },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: p.surface,
    borderWidth: 1,
    borderColor: p.border,
    borderRadius: 17,
    padding: 12,
    marginTop: 22,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    color: p.text,
    fontSize: 12,
    paddingHorizontal: 5,
  },
  send: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: p.green,
    alignItems: "center",
    justifyContent: "center",
  },
  caption: {
    color: p.muted,
    fontSize: 8,
    letterSpacing: 1,
    textAlign: "center",
    marginTop: 12,
  },
  safety: {
    marginTop: 18,
    flexDirection: "row",
    gap: 9,
    padding: 13,
    alignItems: "flex-start",
  },
  safetyText: { color: p.muted, fontSize: 10, lineHeight: 15, flex: 1 },
  error: { marginTop: 14, borderColor: "#FF887755" },
});
