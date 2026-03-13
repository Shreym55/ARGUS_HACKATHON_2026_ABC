import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

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

type PendingSocketResponse = {
  resolve: (value: IntakeChatResponse) => void;
  reject: (reason?: unknown) => void;
  timeoutId: number;
};

function buildSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}`;
}

function buildSocketUrl(sessionId: string) {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/ai/api/v1/intake/ws/${sessionId}`;
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
  const socketRef = useRef<WebSocket | null>(null);
  const connectPromiseRef = useRef<Promise<WebSocket> | null>(null);
  const pendingResponseRef = useRef<PendingSocketResponse | null>(null);

  const recommendation = useMemo(
    () => screeningResult?.result?.overall_recommendation?.replace(/_/g, " ") ?? null,
    [screeningResult]
  );

  const connectSocket = useCallback(async (): Promise<WebSocket> => {
    const existingSocket = socketRef.current;
    if (existingSocket && existingSocket.readyState === WebSocket.OPEN) {
      return existingSocket;
    }
    if (connectPromiseRef.current) {
      return connectPromiseRef.current;
    }

    connectPromiseRef.current = new Promise<WebSocket>((resolve, reject) => {
      const socket = new WebSocket(buildSocketUrl(sessionId));
      let resolved = false;

      socket.onopen = () => {
        resolved = true;
        socketRef.current = socket;
        connectPromiseRef.current = null;
        resolve(socket);
      };

      socket.onmessage = (event) => {
        let payload: unknown;
        try {
          payload = JSON.parse(typeof event.data === "string" ? event.data : "");
        } catch {
          const pending = pendingResponseRef.current;
          if (!pending) {
            return;
          }
          clearTimeout(pending.timeoutId);
          pendingResponseRef.current = null;
          pending.reject(new Error("Invalid response received from socket."));
          return;
        }

        const pending = pendingResponseRef.current;
        if (!pending) {
          return;
        }

        clearTimeout(pending.timeoutId);
        pendingResponseRef.current = null;

        if (payload && typeof payload === "object" && "error" in payload) {
          pending.reject(new Error(String((payload as { error?: unknown }).error ?? "Socket error")));
          return;
        }

        pending.resolve(payload as IntakeChatResponse);
      };

      socket.onerror = () => {
        if (resolved) {
          return;
        }
        connectPromiseRef.current = null;
        reject(new Error("Unable to connect to AI chat socket."));
      };

      socket.onclose = (event) => {
        if (socketRef.current === socket) {
          socketRef.current = null;
        }
        connectPromiseRef.current = null;

        const pending = pendingResponseRef.current;
        if (!pending) {
          return;
        }
        clearTimeout(pending.timeoutId);
        pendingResponseRef.current = null;
        pending.reject(
          new Error(event.reason || "Socket connection closed before receiving a response.")
        );
      };
    });

    return connectPromiseRef.current;
  }, [sessionId]);

  const sendSocketMessage = useCallback(
    async (message: string, selectedGrantType: GrantType): Promise<IntakeChatResponse> => {
      const socket = await connectSocket();

      if (pendingResponseRef.current) {
        throw new Error("Previous message is still being processed.");
      }

      return new Promise<IntakeChatResponse>((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
          const pending = pendingResponseRef.current;
          if (!pending) {
            return;
          }
          pendingResponseRef.current = null;
          pending.reject(new Error("Timed out waiting for chat response."));
        }, 60000);

        pendingResponseRef.current = { resolve, reject, timeoutId };

        try {
          socket.send(JSON.stringify({ message, grant_type: selectedGrantType }));
        } catch (sendError) {
          clearTimeout(timeoutId);
          pendingResponseRef.current = null;
          reject(sendError instanceof Error ? sendError : new Error("Failed to send socket message."));
        }
      });
    },
    [connectSocket]
  );

  useEffect(() => {
    return () => {
      const pending = pendingResponseRef.current;
      if (pending) {
        clearTimeout(pending.timeoutId);
        pendingResponseRef.current = null;
        pending.reject(new Error("Chat socket closed."));
      }

      const socket = socketRef.current;
      if (socket && socket.readyState <= WebSocket.OPEN) {
        socket.close(1000, "Chat page closed");
      }
      socketRef.current = null;
      connectPromiseRef.current = null;
    };
  }, []);

  async function sendMessage(message: string) {
    setIsSending(true);
    setError("");
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text: message }]);

    try {
      const response = await sendSocketMessage(message, grantType);

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
