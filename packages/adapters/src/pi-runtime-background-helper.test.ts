import { once } from "node:events";
import { createServer } from "node:http";
import type { AgentRuntimeEvent, AgentSteeringMessage } from "@rakazo/adapter-kit";
import { expect, it } from "vitest";
import { builtinAgentTools } from "./builtin-tools.js";
import { PiAgentRuntime } from "./pi-runtime.js";
import {
  backgroundHelperNamespace,
  isBackgroundHelperToolExecution,
  isSubagentToolExecution,
} from "./run-effects.js";

function chunk(delta: Record<string, unknown>, finishReason: string | null = null) {
  return `data: ${JSON.stringify({
    id: "fixture",
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  })}\n\n`;
}

const text = (content: string) => chunk({ role: "assistant", content }, "stop");

function helperCall(background: boolean) {
  return chunk(
    {
      role: "assistant",
      tool_calls: [
        {
          index: 0,
          id: "helper-1",
          type: "function",
          function: {
            name: "run_subagent",
            arguments: JSON.stringify({ name: "scout", task: "count the files", background }),
          },
        },
      ],
    },
    "tool_calls",
  );
}

/**
 * A parent bot hands work to a helper whose model answer waits for `releaseHelper`, while the
 * person sends one message mid-run. Records when that message reached the bot and what the
 * bot's model saw on each request.
 */
async function runWithSlowHelper(
  background: boolean,
  options: { stopAfterMs?: number; toolNames?: string[] } = {},
) {
  let releaseHelper!: () => void;
  const helperReleased = new Promise<void>((resolve) => {
    releaseHelper = resolve;
  });
  let helperStarted = false;
  let released = false;
  const parentBodies: string[] = [];
  const helperBodies: string[] = [];
  const server = createServer((request, response) => {
    let body = "";
    request.on("data", (part) => {
      body += part;
    });
    request.on("end", async () => {
      if (request.method !== "POST" || request.url !== "/v1/chat/completions") {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, { "content-type": "text/event-stream" });
      if (body.includes("Rakazo subagent")) {
        helperBodies.push(body);
        helperStarted = true;
        await helperReleased;
        response.end(`${text("There are 3 files.")}data: [DONE]\n\n`);
        return;
      }
      parentBodies.push(body);
      const reply =
        parentBodies.length === 1
          ? helperCall(background)
          : body.includes("There are 3 files.")
            ? text("The helper counted 3 files.")
            : body.includes("Are you still there?")
              ? text("Yes, the helper is still counting.")
              : text("I asked a helper to count them.");
      response.end(`${reply}data: [DONE]\n\n`);
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Fixture endpoint unavailable");

  let steeringDelivered = false;
  let steeringWhileHelperRan: boolean | undefined;
  const claimSteering = async (): Promise<AgentSteeringMessage[]> => {
    if (!helperStarted || steeringDelivered) return [];
    steeringDelivered = true;
    steeringWhileHelperRan = !released;
    return [
      { id: "steer-1", messageId: "message-2", text: "Are you still there?", origin: "user" },
    ];
  };
  // The helper answers only after the person's message has had time to arrive.
  const releaseTimer = setTimeout(
    () => {
      released = true;
      releaseHelper();
    },
    options.stopAfterMs ? 10_000 : 2_500,
  );
  const stop = new AbortController();
  const stopTimer = options.stopAfterMs
    ? setTimeout(() => stop.abort(), options.stopAfterMs)
    : undefined;
  const startedAt = Date.now();
  const toolNames = options.toolNames ?? ["run_subagent"];
  const events: AgentRuntimeEvent[] = [];
  try {
    for await (const event of new PiAgentRuntime().run(
      {
        botId: "fixture-bot",
        threadId: "fixture-thread",
        runId: "fixture-run",
        prompt: "How many files are there?",
        instructions: "Fixture",
        history: [],
        tools: builtinAgentTools.filter((tool) => toolNames.includes(tool.name)),
        claimSteering,
        model: {
          provider: "openai-compatible",
          id: "fixture",
          baseUrl: `http://127.0.0.1:${address.port}/v1`,
          allowPrivateEndpoint: true,
        },
      },
      { signal: AbortSignal.any([stop.signal, AbortSignal.timeout(20_000)]) },
    )) {
      events.push(event);
    }
  } finally {
    clearTimeout(releaseTimer);
    clearTimeout(stopTimer);
    releaseHelper();
    server.close();
  }
  return {
    events,
    parentBodies,
    helperBodies,
    steeringWhileHelperRan,
    elapsedMs: Date.now() - startedAt,
  };
}

it("holds the person's mid-run message until a foreground helper returns", async () => {
  const { steeringWhileHelperRan } = await runWithSlowHelper(false);
  expect(steeringWhileHelperRan).toBe(false);
}, 30_000);

it("answers the person while a background helper works, then reports its result", async () => {
  const { events, parentBodies, steeringWhileHelperRan } = await runWithSlowHelper(true);
  expect(steeringWhileHelperRan).toBe(true);
  const reply = events.flatMap((event) => (event.type === "text" ? [event.text] : [])).join("");
  expect(reply).toContain("Yes, the helper is still counting.");
  expect(reply.indexOf("Yes, the helper is still counting.")).toBeLessThan(
    reply.indexOf("The helper counted 3 files."),
  );
  // The result reaches the bot as an automated note from its helper, not as the person.
  const last = parentBodies.at(-1) ?? "";
  expect(last).toContain("There are 3 files.");
  expect(last).toContain('background helper \\"scout\\"');
  const cards = events.flatMap((event) =>
    event.type === "subagent" && event.agentId ? [event.status] : [],
  );
  expect(cards.at(-1)).toBe("completed");
}, 30_000);

it("gives a background helper no tool that would pause the run to ask the person", async () => {
  const { helperBodies } = await runWithSlowHelper(true, {
    toolNames: ["run_subagent", "ask_user", "web_search"],
  });
  const helperTools = JSON.parse(helperBodies[0] ?? "{}").tools as Array<{
    function: { name: string };
  }>;
  const names = helperTools.map((tool) => tool.function.name);
  expect(names).toContain("web_search");
  expect(names).not.toContain("ask_user");
}, 30_000);

it("stops a background helper with its run instead of waiting for it", async () => {
  const { events, elapsedMs } = await runWithSlowHelper(true, { stopAfterMs: 1_500 });
  expect(elapsedMs).toBeLessThan(8_000);
  const cards = events.flatMap((event) =>
    event.type === "subagent" && event.agentId ? [event.status] : [],
  );
  expect(cards.at(-1)).toBe("failed");
}, 30_000);

it("marks a background helper's calls apart from the bot's and a foreground helper's", () => {
  const call = (agent: string) => JSON.stringify(["pi-tool", agent, "call-1"]);
  const background = call(backgroundHelperNamespace("helper-1"));
  expect(isBackgroundHelperToolExecution(background)).toBe(true);
  expect(isSubagentToolExecution(background)).toBe(true);
  expect(isBackgroundHelperToolExecution(call("helper-1"))).toBe(false);
  expect(isBackgroundHelperToolExecution(call("main"))).toBe(false);
  expect(isBackgroundHelperToolExecution("opaque-id")).toBe(false);
});
