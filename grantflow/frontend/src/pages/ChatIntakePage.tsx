import { FormEvent, useMemo, useState } from "react";
import { fetchAiRuntimeJson } from "../services/aiRuntime";

type GrantType = "cdg" | "eig" | "ecag";

type ChatIntent = "greeting" | "out_of_scope" | "qna" | "application";

type IntakeChatResponse = {
  session_id: string;
  intent: ChatIntent;
  grant_type: GrantType | null;
  reply: string;
  collected_fields: Record<string, unknown>;
  current_field_key: string | null;
  next_question: string | null;
  validation_error: string | null;
  is_complete: boolean;
  is_submitted: boolean;
  application_id: string | null;
  screening_result: {
    result?: {
      overall_recommendation?: string;
      summary?: string;
      hard_checks?: Array<{ check_name: string; passed: boolean }>;
      soft_flags?: Array<{ title: string; severity: string }>;
    };
  } | null;
};

type Message = {
  id: string;
  role: "assistant" | "user";
  text: string;
  intent?: ChatIntent;
};

function buildSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}`;
}

function ChatIntakePage() {
  const [sessionId] = useState<string>(buildSessionId);
  const [grantType, setGrantType] = useState<GrantType>("cdg");
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [currentFieldKey, setCurrentFieldKey] = useState<string | null>(null);
  const [collectedFields, setCollectedFields] = useState<Record<string, unknown>>({});
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [screeningResult, setScreeningResult] = useState<IntakeChatResponse["screening_result"]>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m0",
      role: "assistant",
      intent: "greeting",
      text:
        "Welcome to GrantFlow AI Intake. I can answer grant questions or collect your full application in chat. Type 'start application' to begin.",
    },
  ]);
  const [error, setError] = useState("");

  const recommendation = useMemo(
    () => screeningResult?.result?.overall_recommendation?.replaceAll("_", " ") ?? null,
    [screeningResult]
  );

  async function sendMessage(message: string) {
    setIsSending(true);
    setError("");
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text: message }]);

    try {
      const response = await fetchAiRuntimeJson<IntakeChatResponse>("/api/v1/intake/chat", {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId,
          message,
          grant_type: grantType,
          collected_fields: collectedFields,
          current_field_key: currentFieldKey,
        }),
      });

      setCollectedFields(response.collected_fields ?? {});
      setCurrentFieldKey(response.current_field_key ?? null);
      if (response.application_id) {
        setApplicationId(response.application_id);
      }
      if (response.screening_result) {
        setScreeningResult(response.screening_result);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          intent: response.intent,
          text: response.reply,
        },
      ]);
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "Unable to reach AI runtime.";
      setError(messageText);
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          intent: "out_of_scope",
          text: "I could not process that right now. Please try again.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) {
      return;
    }
    setInput("");
    await sendMessage(trimmed);
  }

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/12 bg-[#08111a]/70 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(226,183,76,0.18),transparent_30%),radial-gradient(circle_at_85%_80%,rgba(72,124,96,0.22),transparent_30%),linear-gradient(110deg,rgba(11,20,30,0.65),rgba(10,26,40,0.72))]" />

      <div className="relative z-10 grid gap-4 lg:grid-cols-[1.8fr_1fr]">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-4 sm:p-5">
          <p className="text-xs font-semibold tracking-[0.24em] text-[#f1c96b]">AI CHAT INTAKE</p>
          <h1 className="mt-2 text-3xl leading-tight text-[#f8f4ea] sm:text-5xl">
            Apply through conversation.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#e7e0cf]/80 sm:text-base">
            This chat supports greeting, grant Q&A, and full application submission. Once the form
            is complete, eligibility screening runs automatically.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => sendMessage("start application")}
              className="rounded-full bg-[#e4b44a] px-5 py-3 text-sm font-bold text-[#111d29] transition hover:brightness-105 disabled:opacity-70"
              disabled={isSending}
            >
              Start Application
            </button>
            <button
              type="button"
              onClick={() => sendMessage("What is the funding range for this grant?")}
              className="rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-[#f3ecda] transition hover:bg-white/10 disabled:opacity-70"
              disabled={isSending}
            >
              Ask Grant Q&A
            </button>
            <select
              value={grantType}
              onChange={(event) => setGrantType(event.target.value as GrantType)}
              className="rounded-full border border-white/20 bg-[#0b1622] px-4 py-3 text-sm font-semibold text-[#f3ecda] outline-none ring-0"
            >
              <option value="cdg">CDG</option>
              <option value="eig">EIG</option>
              <option value="ecag">ECAG</option>
            </select>
          </div>

          <div className="mt-6 h-[52vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#050d14]/70 p-4 sm:h-[56vh]">
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    message.role === "user"
                      ? "ml-auto bg-[#d8a83c] text-[#13212e]"
                      : "bg-[#112132] text-[#f3ecda]"
                  }`}
                >
                  <p>{message.text}</p>
                  {message.intent ? (
                    <p className="mt-1 text-[10px] uppercase tracking-[0.18em] opacity-75">
                      {message.intent}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <form className="mt-4 flex gap-2" onSubmit={onSubmit}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={currentFieldKey ? `Answer for ${currentFieldKey}` : "Type your message..."}
              className="w-full rounded-full border border-white/20 bg-white/5 px-4 py-3 text-sm text-[#f3ecda] placeholder:text-[#f3ecda]/45 outline-none focus:border-[#f1c96b]/70"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="rounded-full bg-[#f1c96b] px-5 py-3 text-sm font-bold text-[#162432] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSending ? "..." : "Send"}
            </button>
          </form>

          {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
        </div>

        <aside className="rounded-3xl border border-white/10 bg-black/25 p-4 sm:p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#f1c96b]">
            Session State
          </h2>
          <div className="mt-3 space-y-2 text-sm text-[#efe7d4]/85">
            <p>
              <span className="text-[#c9b891]">Session:</span> {sessionId}
            </p>
            <p>
              <span className="text-[#c9b891]">Grant:</span> {grantType.toUpperCase()}
            </p>
            <p>
              <span className="text-[#c9b891]">Current Field:</span>{" "}
              {currentFieldKey ?? "none"}
            </p>
            <p>
              <span className="text-[#c9b891]">Captured Fields:</span>{" "}
              {Object.keys(collectedFields).length}
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-[#0c1825]/65 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d2c19a]">
              Screening Outcome
            </p>
            {applicationId ? (
              <div className="mt-2 space-y-2 text-sm text-[#f3ecda]">
                <p>Application ID: {applicationId}</p>
                <p>
                  Recommendation:{" "}
                  <span className="font-semibold capitalize">{recommendation ?? "n/a"}</span>
                </p>
                <p className="text-[#d7ccb2]/80">
                  {screeningResult?.result?.summary ?? "No summary available yet."}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-[#d7ccb2]/80">
                Complete the chat application to trigger screening and view output here.
              </p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

export default ChatIntakePage;
