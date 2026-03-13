import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth";
import { fetchJson } from "../../services/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type Role = "ai" | "user";

type Message = {
  id: string;
  role: Role;
  text: string;
  isTyping?: boolean;
};

type GrantProgram = {
  id: string;
  name: string;
  code: string;
};

type TeamMember = {
  name: string;
  designation: string;
};

type BudgetLine = {
  item: string;
  amount: string;
  justification: string;
};

// ── Question flow definition ──────────────────────────────────────────────────

type QuestionKey =
  | "projectTitle"
  | "problemStatement"
  | "proposedSolution"
  | "expectedOutcomes"
  | "projectLocation"
  | "projectState"
  | "projectDistrict"
  | "projectDurationMonths"
  | "beneficiaryCount"
  | "beneficiaryDescription"
  | "teamMemberName"
  | "teamMemberDesignation"
  | "addMoreTeam"
  | "budgetItem"
  | "budgetAmount"
  | "budgetJustification"
  | "addMoreBudget"
  | "confirmSubmit";

// ── App state collected by the chatbot ───────────────────────────────────────

type AppState = {
  projectTitle: string;
  problemStatement: string;
  proposedSolution: string;
  expectedOutcomes: string;
  projectLocation: string;
  projectState: string;
  projectDistrict: string;
  projectDurationMonths: string;
  beneficiaryCount: string;
  beneficiaryDescription: string;
  teamMembers: TeamMember[];
  budgetLines: BudgetLine[];
  pendingTeamMember: Partial<TeamMember>;
  pendingBudgetLine: Partial<BudgetLine>;
};

const EMPTY_STATE: AppState = {
  projectTitle: "",
  problemStatement: "",
  proposedSolution: "",
  expectedOutcomes: "",
  projectLocation: "",
  projectState: "",
  projectDistrict: "",
  projectDurationMonths: "",
  beneficiaryCount: "",
  beneficiaryDescription: "",
  teamMembers: [],
  budgetLines: [],
  pendingTeamMember: {},
  pendingBudgetLine: {},
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function buildSummary(state: AppState): string {
  const budgetTotal = state.budgetLines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const lines = [
    `**Project:** ${state.projectTitle}`,
    `**Location:** ${state.projectLocation}, ${state.projectDistrict}, ${state.projectState}`,
    `**Duration:** ${state.projectDurationMonths} months`,
    `**Beneficiaries:** ${state.beneficiaryCount}`,
    `**Team Members:** ${state.teamMembers.map((m) => `${m.name} (${m.designation})`).join(", ")}`,
    `**Budget Lines:** ${state.budgetLines.map((l) => `${l.item} — ₹${l.amount}`).join("; ")}`,
    `**Total Budget:** ${formatINR(budgetTotal)}`,
  ];
  return lines.join("\n");
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ConversationalApplicationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();

  const grantIdParam = searchParams.get("grantId") ?? "";

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionKey>("projectTitle");
  const [appState, setAppState] = useState<AppState>(EMPTY_STATE);
  const [grantName, setGrantName] = useState<string>("this grant");
  const [isDone, setIsDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initError, setInitError] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Scroll to bottom on new messages ──────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAiTyping]);

  // ── Helper: push an AI message with simulated typing delay ────────────────

  const pushAi = useCallback((text: string, delay = 600) => {
    return new Promise<void>((resolve) => {
      setIsAiTyping(true);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: makeId(), role: "ai", text },
        ]);
        setIsAiTyping(false);
        resolve();
      }, delay);
    });
  }, []);

  // ── Helper: push a user message ───────────────────────────────────────────

  function pushUser(text: string) {
    setMessages((prev) => [...prev, { id: makeId(), role: "user", text }]);
  }

  // ── Init: create draft, load grant name, send welcome ─────────────────────

  useEffect(() => {
    if (!token) return;

    async function init() {
      try {
        // Fetch grant name
        if (grantIdParam) {
          try {
            const programs = await fetchJson<GrantProgram[]>("/grant-programs");
            const match = programs.find((p) => p.id === grantIdParam);
            if (match) setGrantName(match.name);
          } catch {
            // fine
          }
        }

        // Create draft
        const res = await fetchJson<{ id: string }>("/applications", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ grantProgramId: grantIdParam || undefined, applicationMode: "chatbot" }),
        });
        setApplicationId(res.id);
      } catch (err) {
        setInitError(err instanceof Error ? err.message : "Could not start application session.");
      }
    }

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ── Send welcome message after draft is created ───────────────────────────

  useEffect(() => {
    if (!applicationId) return;
    (async () => {
      await pushAi(
        `Hello! I'm here to help you apply for ${grantName}. Let's start with your project. What is the title of your project?`,
        800
      );
      inputRef.current?.focus();
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  // ── Auto-save to backend ───────────────────────────────────────────────────

  async function saveState(state: AppState) {
    if (!applicationId || !token) return;
    try {
      await fetchJson(`/applications/${applicationId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          projectTitle: state.projectTitle,
          problemStatement: state.problemStatement,
          proposedSolution: state.proposedSolution,
          expectedOutcomes: state.expectedOutcomes,
          projectLocation: state.projectLocation,
          projectState: state.projectState,
          projectDistrict: state.projectDistrict,
          projectDurationMonths: state.projectDurationMonths ? Number(state.projectDurationMonths) : undefined,
          beneficiaryCount: state.beneficiaryCount ? Number(state.beneficiaryCount) : undefined,
          beneficiaryDescription: state.beneficiaryDescription,
          teamMembers: state.teamMembers,
          budgetLines: state.budgetLines.map((l) => ({ ...l, amount: Number(l.amount) })),
        }),
      });
    } catch {
      // non-blocking
    }
  }

  // ── Question router ────────────────────────────────────────────────────────

  async function processAnswer(answer: string, state: AppState): Promise<{ nextState: AppState; nextQuestion: QuestionKey | null }> {
    const trimmed = answer.trim();
    let nextState = { ...state };
    let nextQuestion: QuestionKey | null = null;

    switch (currentQuestion) {
      case "projectTitle":
        if (!trimmed) { await pushAi("Please provide a project title to continue."); return { nextState, nextQuestion: "projectTitle" }; }
        nextState.projectTitle = trimmed;
        await pushAi("Tell me about the problem your project addresses. Please be specific (minimum 100 characters).");
        nextQuestion = "problemStatement";
        break;

      case "problemStatement":
        if (trimmed.length < 100) {
          await pushAi(`That's a bit short. Please elaborate on the problem — aim for at least 100 characters. You've written ${trimmed.length} so far.`);
          return { nextState, nextQuestion: "problemStatement" };
        }
        nextState.problemStatement = trimmed;
        await pushAi("What is your proposed solution to address this problem?");
        nextQuestion = "proposedSolution";
        break;

      case "proposedSolution":
        if (trimmed.length < 100) {
          await pushAi(`Please provide more detail on your solution (minimum 100 characters). You've written ${trimmed.length} so far.`);
          return { nextState, nextQuestion: "proposedSolution" };
        }
        nextState.proposedSolution = trimmed;
        await pushAi("What outcomes do you expect from this project? List at least 2–3 measurable outcomes.");
        nextQuestion = "expectedOutcomes";
        break;

      case "expectedOutcomes":
        if (!trimmed) { await pushAi("Please describe the expected outcomes before continuing."); return { nextState, nextQuestion: "expectedOutcomes" }; }
        nextState.expectedOutcomes = trimmed;
        await pushAi("Where will this project be implemented? (City/Location)");
        nextQuestion = "projectLocation";
        break;

      case "projectLocation":
        if (!trimmed) { await pushAi("Please enter the project location."); return { nextState, nextQuestion: "projectLocation" }; }
        nextState.projectLocation = trimmed;
        await pushAi("Which state is the project in?");
        nextQuestion = "projectState";
        break;

      case "projectState":
        if (!trimmed) { await pushAi("Please enter the state."); return { nextState, nextQuestion: "projectState" }; }
        nextState.projectState = trimmed;
        await pushAi("What is your project district?");
        nextQuestion = "projectDistrict";
        break;

      case "projectDistrict":
        if (!trimmed) { await pushAi("Please enter the district."); return { nextState, nextQuestion: "projectDistrict" }; }
        nextState.projectDistrict = trimmed;
        await pushAi("How long will the project run? (Enter number of months)");
        nextQuestion = "projectDurationMonths";
        break;

      case "projectDurationMonths": {
        const months = Number(trimmed);
        if (!trimmed || isNaN(months) || months < 1) {
          await pushAi("Please enter a valid number of months (e.g., 12).");
          return { nextState, nextQuestion: "projectDurationMonths" };
        }
        nextState.projectDurationMonths = String(months);
        await pushAi("How many beneficiaries do you expect to reach?");
        nextQuestion = "beneficiaryCount";
        break;
      }

      case "beneficiaryCount": {
        const count = Number(trimmed);
        if (!trimmed || isNaN(count) || count < 1) {
          await pushAi("Please enter a valid number of beneficiaries.");
          return { nextState, nextQuestion: "beneficiaryCount" };
        }
        nextState.beneficiaryCount = String(count);
        await pushAi("Describe your target beneficiaries.");
        nextQuestion = "beneficiaryDescription";
        break;
      }

      case "beneficiaryDescription":
        if (!trimmed) { await pushAi("Please describe your target beneficiaries."); return { nextState, nextQuestion: "beneficiaryDescription" }; }
        nextState.beneficiaryDescription = trimmed;
        await pushAi("Let's add your team. What is the name of your project lead?");
        nextQuestion = "teamMemberName";
        break;

      case "teamMemberName":
        if (!trimmed) { await pushAi("Please provide the team member's name."); return { nextState, nextQuestion: "teamMemberName" }; }
        nextState.pendingTeamMember = { name: trimmed };
        await pushAi("What is their designation/role?");
        nextQuestion = "teamMemberDesignation";
        break;

      case "teamMemberDesignation":
        if (!trimmed) { await pushAi("Please enter a designation."); return { nextState, nextQuestion: "teamMemberDesignation" }; }
        nextState.pendingTeamMember = { ...nextState.pendingTeamMember, designation: trimmed };
        nextState.teamMembers = [...nextState.teamMembers, nextState.pendingTeamMember as TeamMember];
        nextState.pendingTeamMember = {};
        await pushAi(`Great, ${nextState.teamMembers[nextState.teamMembers.length - 1].name} added! Do you want to add more team members? (yes/no)`);
        nextQuestion = "addMoreTeam";
        break;

      case "addMoreTeam": {
        const yes = /^(y|yes|yeah|yep|sure)/i.test(trimmed);
        if (yes) {
          await pushAi("What is the name of the next team member?");
          nextQuestion = "teamMemberName";
        } else {
          await pushAi("Let's add your budget. What is your first budget line item? (e.g., 'Staff salaries')");
          nextQuestion = "budgetItem";
        }
        break;
      }

      case "budgetItem":
        if (!trimmed) { await pushAi("Please enter a budget line item."); return { nextState, nextQuestion: "budgetItem" }; }
        nextState.pendingBudgetLine = { item: trimmed };
        await pushAi("How much do you budget for this item? (Enter amount in INR)");
        nextQuestion = "budgetAmount";
        break;

      case "budgetAmount": {
        const amt = Number(trimmed.replace(/[^\d.]/g, ""));
        if (isNaN(amt) || amt <= 0) {
          await pushAi("Please enter a valid amount in INR (numbers only, e.g. 50000).");
          return { nextState, nextQuestion: "budgetAmount" };
        }
        nextState.pendingBudgetLine = { ...nextState.pendingBudgetLine, amount: String(amt) };
        await pushAi("Briefly justify this budget item.");
        nextQuestion = "budgetJustification";
        break;
      }

      case "budgetJustification":
        if (!trimmed) { await pushAi("Please provide a justification."); return { nextState, nextQuestion: "budgetJustification" }; }
        nextState.pendingBudgetLine = { ...nextState.pendingBudgetLine, justification: trimmed };
        nextState.budgetLines = [...nextState.budgetLines, nextState.pendingBudgetLine as BudgetLine];
        nextState.pendingBudgetLine = {};
        await pushAi("Do you want to add another budget line? (yes/no)");
        nextQuestion = "addMoreBudget";
        break;

      case "addMoreBudget": {
        const yes = /^(y|yes|yeah|yep|sure)/i.test(trimmed);
        if (yes) {
          await pushAi("What is the next budget line item?");
          nextQuestion = "budgetItem";
        } else {
          // Show summary
          const summary = buildSummary(nextState);
          await pushAi(
            `Great! I have all the information needed. Here's a summary of your application:\n\n${summary}`,
            900
          );
          await pushAi("Do you confirm everything is accurate and wish to submit? (yes/no)", 800);
          nextQuestion = "confirmSubmit";
        }
        break;
      }

      case "confirmSubmit": {
        const yes = /^(y|yes|yeah|yep|sure|confirm)/i.test(trimmed);
        if (!yes) {
          await pushAi("No problem! Your draft has been saved. You can continue editing it in the portal anytime.");
          nextQuestion = null; // end
          setIsDone(true);
        } else {
          nextQuestion = null; // handled below
          await pushAi("Submitting your application now…", 400);
          setIsSubmitting(true);
          try {
            await saveState(nextState);
            if (applicationId && token) {
              await fetchJson(`/applications/${applicationId}/submit`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({}),
              });
            }
            setIsDone(true);
            await pushAi("Your application has been submitted successfully! Redirecting you to the application page…", 500);
            setTimeout(() => navigate(`/portal/applications/${applicationId}`, { state: { submitted: true } }), 2000);
          } catch (err) {
            await pushAi(`There was an error submitting your application: ${err instanceof Error ? err.message : "Unknown error"}. Please try again from the portal.`);
          } finally {
            setIsSubmitting(false);
          }
        }
        break;
      }
    }

    return { nextState, nextQuestion };
  }

  // ── Send handler ───────────────────────────────────────────────────────────

  async function handleSend() {
    const text = inputValue.trim();
    if (!text || isAiTyping || isDone || isSubmitting) return;

    setInputValue("");
    pushUser(text);

    // Handle "go back" attempts
    if (/\b(go back|previous|undo|redo)\b/i.test(text)) {
      await pushAi("I'm sorry, I can't go back in this interface. You can edit your application in the portal.");
      return;
    }

    const { nextState, nextQuestion } = await processAnswer(text, appState);
    setAppState(nextState);
    await saveState(nextState);

    if (nextQuestion) {
      setCurrentQuestion(nextQuestion);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .chat-page {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 0px);
          max-width: 780px;
          margin: 0 auto;
          font-family: 'DM Sans', 'Helvetica Neue', sans-serif;
        }
        .chat-header {
          padding: 1.5rem 1.75rem 1.1rem;
          border-bottom: 1px solid #e8e6df;
          background: #fff;
          flex-shrink: 0;
        }
        .chat-header__eyebrow {
          font-size: 0.72rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
          color: #9a8c6e; margin: 0 0 0.25rem;
        }
        .chat-header__title {
          font-size: 1.25rem; font-weight: 700; color: #1a3a5c; margin: 0 0 0.15rem;
        }
        .chat-header__subtitle {
          font-size: 0.85rem; color: #6b7280; margin: 0;
        }
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          background: #f8f7f3;
        }
        .chat-bubble-row {
          display: flex;
          align-items: flex-end;
          gap: 0.5rem;
        }
        .chat-bubble-row.ai { justify-content: flex-start; }
        .chat-bubble-row.user { justify-content: flex-end; }
        .chat-avatar {
          width: 28px; height: 28px; border-radius: 50%; background: #e8d9a5;
          display: flex; align-items: center; justify-content: center; font-size: 0.75rem;
          flex-shrink: 0; color: #9a6b0f; font-weight: 700;
        }
        .chat-bubble {
          max-width: 72%;
          padding: 0.75rem 1rem;
          border-radius: 16px;
          font-size: 0.9rem;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .chat-bubble.ai {
          background: #f0ebe0;
          color: #1a3a5c;
          border-bottom-left-radius: 4px;
        }
        .chat-bubble.user {
          background: rgba(196, 164, 90, 0.15);
          color: #1a3a5c;
          border-bottom-right-radius: 4px;
          border: 1px solid rgba(196, 164, 90, 0.2);
        }
        .typing-indicator {
          display: flex; gap: 4px; align-items: center; padding: 0.75rem 1rem;
          background: #f0ebe0; border-radius: 16px; border-bottom-left-radius: 4px; width: fit-content;
        }
        .typing-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #9a8c6e;
          animation: typingBounce 1s infinite;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.15s; }
        .typing-dot:nth-child(3) { animation-delay: 0.3s; }
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
        .chat-input-bar {
          border-top: 1px solid #e8e6df;
          background: #fff;
          padding: 1rem 1.25rem;
          display: flex;
          gap: 0.75rem;
          align-items: center;
          flex-shrink: 0;
        }
        .chat-input {
          flex: 1;
          padding: 0.75rem 1rem;
          border: 1px solid #e0ddd7;
          border-radius: 999px;
          background: #f8f7f3;
          color: #1a3a5c;
          font-size: 0.92rem;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s;
        }
        .chat-input:focus { border-color: #c4a45a; background: #fff; }
        .chat-input:disabled { opacity: 0.6; cursor: not-allowed; }
        .chat-send-btn {
          padding: 0.75rem 1.4rem;
          border-radius: 999px;
          border: none;
          cursor: pointer;
          font-size: 0.88rem;
          font-weight: 800;
          background: linear-gradient(135deg, #f1c96b, #d89b35);
          color: #14202c;
          white-space: nowrap;
          transition: transform 0.12s, box-shadow 0.12s;
          flex-shrink: 0;
        }
        .chat-send-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(196,164,90,0.35); }
        .chat-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .done-banner {
          text-align: center;
          padding: 0.75rem;
          background: #f0fdf4;
          border-top: 1px solid #bbf7d0;
          color: #166534;
          font-size: 0.88rem;
          font-weight: 500;
          flex-shrink: 0;
        }
        .init-error {
          margin: 2rem;
          padding: 1rem;
          background: #fff5f5;
          border: 1px solid #fecaca;
          border-radius: 12px;
          color: #991b1b;
          font-size: 0.9rem;
        }
      `}</style>

      <div className="chat-page">
        {/* Header */}
        <div className="chat-header">
          <p className="chat-header__eyebrow">Applicant Portal — AI Mode</p>
          <h1 className="chat-header__title">AI Application Assistant</h1>
          <p className="chat-header__subtitle">I'll guide you through your application step by step</p>
        </div>

        {/* Init error */}
        {initError && (
          <div className="init-error">
            <strong>Could not start session:</strong> {initError}
          </div>
        )}

        {/* Messages */}
        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-bubble-row ${msg.role}`}>
              {msg.role === "ai" && (
                <div className="chat-avatar" title="AI Assistant">AI</div>
              )}
              <div className={`chat-bubble ${msg.role}`}>{msg.text}</div>
            </div>
          ))}

          {/* Typing indicator */}
          {isAiTyping && (
            <div className="chat-bubble-row ai">
              <div className="chat-avatar">AI</div>
              <div className="typing-indicator">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Done banner */}
        {isDone && !isSubmitting && (
          <div className="done-banner">
            Session complete. View your applications in{" "}
            <button
              onClick={() => navigate("/portal/applications")}
              style={{ background: "none", border: "none", color: "#166534", fontWeight: 700, cursor: "pointer", textDecoration: "underline", fontSize: "inherit" }}
            >
              My Applications
            </button>.
          </div>
        )}

        {/* Input bar */}
        <div className="chat-input-bar">
          <input
            ref={inputRef}
            className="chat-input"
            type="text"
            placeholder={isDone ? "Session complete." : isAiTyping ? "AI is typing…" : "Type your answer…"}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isAiTyping || isDone || isSubmitting || !!initError}
            autoComplete="off"
          />
          <button
            className="chat-send-btn"
            onClick={handleSend}
            disabled={!inputValue.trim() || isAiTyping || isDone || isSubmitting || !!initError}
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
}
