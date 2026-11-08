import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
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
const prompts = [
  {
    question: "Help me build a routine",
    reply:
      "Example coach response: Start with a routine you can repeat. The future coach will help connect your schedule, goals, and training preferences. This is scripted preview content, not a personalized plan.",
  },
  {
    question: "Ideas for balanced meals",
    reply:
      "Example coach response: Everyday meals can be part of your fitness journey. The future experience will let you explore food preferences and nutrition questions. This is scripted content, not dietary advice.",
  },
  {
    question: "How is my progress?",
    reply:
      "Example coach response: In this sample week, your workout cards and activity trends show how a progress recap could look. These are illustrative values, not your actual activity.",
  },
];
export default function CoachScreen() {
  const { isPreview } = useDesignPreview();
  const [messages, setMessages] = useState<
    { question: string; reply: string }[]
  >([]);
  const [draft, setDraft] = useState("");
  // Adjust transient demo state before committing a changed preview mode.
  const [previousPreview, setPreviousPreview] = useState(isPreview);
  if (previousPreview !== isPreview) {
    setPreviousPreview(isPreview);
    if (!isPreview) {
      setMessages([]);
      setDraft("");
    }
  }
  function add(question: string, reply?: string) {
    if (!question.trim() || !isPreview) return;
    setMessages((old) =>
      [
        ...old,
        {
          question: question.trim().slice(0, 240),
          reply:
            reply ??
            "Example coach response: Your message is shown locally to preview the conversation layout. A live AI model is not connected, and no message is sent or saved to your account.",
        },
      ].slice(-5),
    );
    setDraft("");
  }
  return (
    <Screen>
      <Header title="Your coach. Your corner." eyebrow="BODYIQ INTELLIGENCE" />
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
                {isPreview
                  ? "SCRIPTED DESIGN DEMO"
                  : "LIVE COACHING COMING NEXT"}
              </Text>
            </View>
          </View>
          <Badge text={isPreview ? "PREVIEW" : "SOON"} />
        </View>
        <Text style={c.headline}>
          A little guidance.{"\n"}A lot of{" "}
          <Text style={{ color: p.green }}>possibility.</Text>
        </Text>
        <Body style={{ fontSize: 12 }}>
          Designed to understand your goals, your routine, and your real life.
        </Body>
      </Card>
      {isPreview ? (
        <>
          <Section title="Start a sample conversation" />
          <View style={{ gap: 10 }}>
            {prompts.map((prompt) => (
              <Pressable
                key={prompt.question}
                accessibilityRole="button"
                onPress={() => add(prompt.question, prompt.reply)}
                style={({ pressed }) => [
                  c.prompt,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Icon name="message-circle" color={p.green} size={17} />
                <Text style={c.promptText}>{prompt.question}</Text>
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
                Hey Alex! Ready to make a little progress today? This sample
                conversation shows what your future coaching space could feel
                like.
              </Text>
            </View>
            {messages.map((message, index) => (
              <View key={index} style={{ gap: 12, marginTop: 18 }}>
                <View style={c.userBubble}>
                  <Text style={c.userText}>{message.question}</Text>
                </View>
                <View style={c.coachBubble}>
                  <Text style={c.messageText}>{message.reply}</Text>
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
              accessibilityState={{ disabled: !draft.trim() }}
              disabled={!draft.trim()}
              onPress={() => add(draft)}
              style={[c.send, { opacity: draft.trim() ? 1 : 0.4 }]}
            >
              <Icon name="arrow-up" color={p.background} size={18} />
            </Pressable>
          </View>
          <Text style={c.caption}>DEMO ONLY · NOT LIVE AI · NOT SAVED</Text>
          {messages.length > 0 && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setMessages([])}
              style={c.clear}
            >
              <Text style={{ color: p.muted, fontSize: 11 }}>
                Clear sample conversation
              </Text>
            </Pressable>
          )}
        </>
      ) : (
        <Card style={{ marginTop: 24 }}>
          <View style={{ alignItems: "center", gap: 15, paddingVertical: 18 }}>
            <Icon name="lock" color={p.green} size={29} />
            <Text style={c.coachName}>Live coaching is not connected yet.</Text>
            <Body style={{ textAlign: "center" }}>
              No model or chat service is active. Show Design Preview to explore
              scripted examples.
            </Body>
          </View>
        </Card>
      )}
      <View style={{ marginTop: 24 }}>
        <Button
          title="Set your real fitness goal"
          secondary
          onPress={() => router.push("/profile")}
          icon="target"
        />
      </View>
      <PreviewNotice>
        This is a scripted UI preview, not AI-generated coaching. Messages stay
        in memory, are not saved to the cloud, and are not medical or
        personalized health advice.
      </PreviewNotice>
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
  conversation: { marginTop: 28 },
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
    maxHeight: 95,
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
  clear: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },
});
