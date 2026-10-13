---
layout: blog
lang: en
translation_slug: agent-engineering
title: 'Agent Engineering: Retries, State, and Execution Control'
permalink: /en/blog/agent-engineering/
description: Engineering details of retries, tool execution, session state, context
  management, and task acceptance, grounded in the public implementations of Codex,
  OpenCode, Pi, and Claude.
---

{% raw %}
An agent's basic loop is simple: receive input, call a model, execute tools, and return the results to the model. Complexity often appears between those steps. A tool starts before its arguments have fully arrived; a request fails after a file has already changed; the user presses Stop while the old task is still committing results.

Each situation requires the runner to distinguish established facts, unfinished work, and the state the next step will use. Whether a request can be resent depends on how far the previous attempt progressed. Whether history can be trimmed depends on the protocol relationships between messages. Whether a task can end depends on whether its artifacts have the corresponding acceptance evidence.

<h2 id="目录">Contents</h2>

- [Look up a failure symptom](#symptoms)
- [I. Request Recovery](#requests)
  - [Retry Eligibility and Request Budgets](#r1)
  - [Exponential Backoff, Jitter, and Retry-After](#r2)
  - [Stream Failures and Continuation](#r3)
  - [Idempotency Keys, Atomic Commits, and Late Requests](#r4)
- [II. Tool Execution](#tools)
  - [The Completion Boundary for Tool Arguments](#t1)
  - [Parallel Execution and Ordered Commits](#t2)
  - [Cancellation and Terminal Settlement](#t3)
  - [Tool Results and Actionable Errors](#t4)
- [III. Session State](#state)
  - [Raw Logs and Model Projections](#s1)
  - [Branches, Rollback, and Recovery](#s2)
- [IV. Context Management](#context)
  - [Compaction Boundaries and the Tool Protocol](#c1)
  - [Context Budgets and Invalidated Measurements](#c2)
  - [Compaction Failures and Baseline Commits](#c3)
  - [Stable Prefixes and Cache Reuse](#c4)
  - [Context Offloading and Recoverable References](#c5)
- [V. Control and Interaction](#interaction)
  - [Steering, Follow-up, and Abort](#i1)
  - [Lost Wakeups and Finalization Scheduling](#i2)
  - [Bidirectional Control and Channel Lifetimes](#i3)
  - [Permission Denial and Corrective Feedback](#i4)
- [VI. Handoff and Acceptance](#acceptance)
  - [Cross-session Handoff and Regression Checks](#g1)
  - [Run Termination and Task Acceptance](#g2)
  - [Evaluating and Simplifying the Harness](#g3)
- [Invariants and Failure Tests](#invariants)
- [Implementation Versions and Scope](#versions)

<h2 id="symptoms">Look Up a Failure Symptom</h2>

| Symptom | Start here |
| --- | --- |
| A long wait after one failure, or many clients retrying together | [Retry eligibility and budgets](#r1), [Backoff and deadlines](#r2) |
| A stream breaks halfway through, and recovery repeats an operation | [Stream recovery](#r3), [Idempotent operations](#r4), [Logs and projections](#s1) |
| JSON validation passes, but the tool executes only part of the intended action | [Truncated arguments](#t1) |
| Parallel tools have confusing display, recording, and execution orders | [Three distinct orders](#t2) |
| A tool succeeds, but its result is overlooked or further data cannot be retrieved | [Tool results](#t4), [Recoverable references](#c5) |
| Writes continue after Stop, or old results appear after switching sessions | [Cancellation and finalization](#t3), [Late wakeups](#i2) |
| Settings do not roll back with messages, or recovery reads a different attempt | [Recovery paths](#s2) |
| Compaction causes an API protocol error, or repeated compaction still exceeds the limit | [Legal cut points](#c1), [Context budgets](#c2), [Compaction failures](#c3) |
| Token counts fall, but calls remain slow, or the original text cannot be recovered | [Cache reuse](#c4), [Recoverable references](#c5) |
| New input is ignored, or a permission callback suddenly reports Stream closed | [Input boundaries](#i1), [Late wakeups](#i2), [Bidirectional control](#i3) |
| After an operation is denied, the agent tries another tool to do the same thing | [Denial and correction](#i4) |
| The record says complete, but the application is unusable | [Handoff checks](#g1), [Completion evidence](#g2), [Retiring harness mechanisms](#g3) |

<h2 id="requests">I. Request Recovery</h2>

<h3 id="r1">Retry Eligibility and Request Budgets</h3>

Exponential backoff answers “How long before trying again?” An earlier question is “Can this failure be retried?” Temporary overload, an exhausted account quota, and context overflow may all surface as API errors, but they need different recovery actions. Resending the same request in the latter two cases will usually not improve matters after a few more seconds.

Pi's retry path first excludes context overflow. Its error classifier then excludes quota, billing, and subscription limits before recognizing temporary overload, rate limits, and network errors. Some classification still relies on text pattern matching, so its verdict is not an infallible server contract. Error samples belong in compatibility tests when integrating a new provider. [Source: Pi error classification](https://github.com/earendil-works/pi/blob/4ac0bd8c7b96d72cb6a73226edc7c9ecaae1d14e/packages/ai/src/utils/retry.ts#L7-L28), [Classification predicate](https://github.com/earendil-works/pi/blob/4ac0bd8c7b96d72cb6a73226edc7c9ecaae1d14e/packages/ai/src/utils/retry.ts#L243-L257), [Retry entry point](https://github.com/earendil-works/pi/blob/4ac0bd8c7b96d72cb6a73226edc7c9ecaae1d14e/packages/coding-agent/src/core/agent-session.ts#L3705-L3713)

The retry count must also state whether it includes the initial request. Codex's `run_with_retry` uses `0..=max_attempts`, making the maximum total number of requests one greater than the configured value. Pi's tests explicitly assert that `maxRetries=2` permits at most three requests. [Source: Codex request loop](https://github.com/openai/codex/blob/806d9732c974bc8a51b8317c1bd8985544fe627c/codex-rs/codex-client/src/retry.rs#L84-L118), [Pi count assertion](https://github.com/earendil-works/pi/blob/4ac0bd8c7b96d72cb6a73226edc7c9ecaae1d14e/packages/coding-agent/test/agent-session-retry.test.ts#L125-L168)

OpenCode treats timeouts separately: by default, timeouts allow up to three retries, while ordinary transient errors allow up to ten; plugins can override the decision. A timeout has already consumed an entire waiting period. Counting exceptions alone cannot make it equivalent in cost to an immediately returned 503. [Source: OpenCode retry policy](https://github.com/anomalyco/opencode/blob/7b3d4ce3a7dbd2a6d3637722a0d5f22a7d086937/packages/core/src/session/runner/retry.ts#L31-L90)

Retry configuration should separately define retryable errors, the maximum retry count, the timeout for each request, and the deadline for the entire operation. If two layers each allow two retries, they can generate nine underlying requests in the worst case. Budget ownership must be explicit, or an outer layer must enforce a shared ceiling. **Attempt limits constrain request volume; an overall deadline constrains how long the user actually waits.** Both limits should exist, and waiting itself must respond to cancellation.

Allowing at most two retries per task still cannot prevent a thousand tasks from failing together. Backoff changes when requests happen; an aggregate recovery budget limits the extra traffic placed on a dependency. A token bucket can allow a bounded burst and then admit retries at its refill rate. When tokens run out, recovery is delayed or ended, with any waiting still constrained by the task deadline. [Engineering practice: shared retry budgets](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)

For an agent service, the sharing scope can be a provider, an account, or a dependency. Creating a full bucket for every session amplifies the aggregate allowance again. An in-process bucket cannot constrain other processes either. A shared retry budget governs additional attempts only; initial requests still need their own admission and concurrency controls.

<h3 id="r2">Exponential Backoff, Jitter, and Retry-After</h3>

Local backoff can be written as `base × 2^(k−1)`, with a cap. Jitter spreads clients' next requests across different times, reducing synchronized failure and recovery. Codex's HTTP retry helper uses approximately ±10% multiplicative jitter and does not itself cap the wait. An outer layer must still constrain the wait and the overall operation deadline. [Source: Codex backoff](https://github.com/openai/codex/blob/806d9732c974bc8a51b8317c1bd8985544fe627c/codex-rs/codex-client/src/retry.rs#L43-L51)

The server's `Retry-After` imposes another constraint. Suppose the response says “try again in 10 seconds,” and notifying the UI and waiting for a lock consume 8 seconds. If an upper layer starts a fresh `sleep(10s)`, the same advice is waited out twice. Each additional recovery layer can add more delay.

Codex converts that advice to an `Instant` on a monotonic clock when it is received. Ordinary HTTP/Responses retries and transport fallback paths carry the same deadline forward and wait only for the remaining time. An HTTP-date is first converted using the wall clock; subsequent waiting uses the monotonic clock. The implementation preserves an important distinction: **valid advice that has already expired is different from the absence of valid advice.** The former has zero remaining wait; only the latter falls back to local backoff. [Source: RetryAfter](https://github.com/openai/codex/blob/806d9732c974bc8a51b8317c1bd8985544fe627c/codex-rs/http-client/src/retry_after.rs#L9-L48), [Waiting across layers](https://github.com/openai/codex/blob/806d9732c974bc8a51b8317c1bd8985544fe627c/codex-rs/core/src/responses_retry.rs#L122-L181)

![When retry advice passes through multiple layers, each waits only for the time remaining until the original deadline](/images/blog/en/agent-engineering/01-retry-deadline.png)

An interface can carry two deadlines: when retrying becomes permissible, and when the entire operation must end. If the first reaches or exceeds the second, return budget exhaustion immediately. Server advice also needs a sanity check. OpenCode's default policy caps it at fifteen minutes, with a plugin override available.

The following example gives valid server advice priority, combining capped local backoff and the overall budget in one control path:

```text
delay = min(cap, base * 2**(k - 1) * uniform(0.9, 1.1))
ready_at = server_deadline if server_deadline is not None \
           else monotonic_now() + delay
if ready_at >= operation_deadline:
    return BUDGET_EXHAUSTED
await sleep_until(ready_at, cancel_token)
return await request(deadline=operation_deadline)
```

`server_deadline is not None` preserves the difference between “already expired” and “no advice.” Both the wait and the request must actually support cancellation and deadlines to bound the total duration. Here, `cap` and `operation_deadline` are outer constraints in a design sketch, not a claim that Codex's HTTP helper supplies all this behavior. Another policy could take the larger of the server wait and local backoff. What matters is specifying the selection rule and waiting only once.

<h3 id="r3">Stream Failures and Continuation</h3>

A streaming call is dangerous because the execution environment may change before the request ends. The model emits a complete tool call, the tool writes a file, and the connection then breaks before the final completion. Resending the original prompt makes the model decide again from an outdated view of the environment.

Codex can start a tool when it receives `OutputItemDone`, without waiting for the entire response. Before the stream loop returns an error, it still collects results from tools already started and writes them to history. The next sample constructs its input from the updated session history. This ordering preserves the facts needed for recovery, but also means a slow tool can delay reconnection. [Source: starting tools early](https://github.com/openai/codex/blob/806d9732c974bc8a51b8317c1bd8985544fe627c/codex-rs/core/src/session/turn.rs#L2681-L2785), [Collecting results after an error](https://github.com/openai/codex/blob/806d9732c974bc8a51b8317c1bd8985544fe627c/codex-rs/core/src/session/turn.rs#L3158-L3193), [Rebuilding retry input](https://github.com/openai/codex/blob/806d9732c974bc8a51b8317c1bd8985544fe627c/codex-rs/core/src/session/turn.rs#L1636-L1662)

OpenCode separates recoverable failures into `Retry` and `Continue`. With no output yet, it retries transparently. Once text, reasoning, or tool input has started, it preserves the partial attempt and continues in a new iteration. The boundary is whether output has begun, not merely whether a tool has made an external write. Both paths share a budget; changing recovery mode does not reset the count. [Source: Retry and Continue](https://github.com/anomalyco/opencode/blob/7b3d4ce3a7dbd2a6d3637722a0d5f22a7d086937/packages/core/src/session/runner/step.ts#L193-L207), [Continuing after output](https://github.com/anomalyco/opencode/blob/7b3d4ce3a7dbd2a6d3637722a0d5f22a7d086937/packages/core/src/session/runner/step.ts#L266-L275), [The output-start boundary](https://github.com/anomalyco/opencode/blob/7b3d4ce3a7dbd2a6d3637722a0d5f22a7d086937/packages/core/src/session/runner/publish-llm-event.ts#L405-L464), [Shared-budget test](https://github.com/anomalyco/opencode/blob/7b3d4ce3a7dbd2a6d3637722a0d5f22a7d086937/packages/core/test/session-runner.test.ts#L5846-L5883)

A recovery controller can first settle all started tools, then choose retry or continuation from the output boundary. The following design sketch combines those responsibilities:

```text
await settle_started_tools()
decision = shared_retry_budget.decide(error)
if not decision.retry:
    return terminal_failure(error)
if not output_started:
    return Retry(decision)
await close_failed_attempt(error)
return Continue(decision)
```

`terminal_failure` records the failure and ends the recovery loop. `close_failed_attempt` preserves existing output and the fact of failure. `Continue` then samples again from the updated history.

![Stream recovery continues from the changed environment and the updated history](/images/blog/en/agent-engineering/02-stream-effects.png)

This still provides no exactly-once guarantee for external operations. A remote system may succeed and lose the connection before returning its result. The model may also propose a new call with the same meaning. Attempt IDs track physical requests; logical operation IDs identify the same business action. Costly remote writes need separate idempotency keys, status queries, or compensation. A continuation prompt can reduce repeated wording, but cannot take responsibility for deduplicating payments or sent messages.

<h3 id="r4">Idempotency Keys, Atomic Commits, and Late Requests</h3>

Identical parameters do not prove a duplicate request: the user may really want two identical objects. Retries of the same business operation reuse one idempotency key; a new operation gets a new key. The server binds the original parameters to the caller and key. The same key with different parameters should be rejected; the same key with the same parameters should recover the existing result. [AWS: the idempotent-operation contract](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/), [Stripe: retries and server state](https://stripe.com/blog/idempotency)

A tool-call ID generated after the model resamples is not inherently a business operation ID stable across attempts. The business layer must preserve the latter, rather than regenerate it on every network retry.

“Check for duplicates, then execute” leaves a race window. For changes that fit in one database transaction, the deduplication record, business mutation, and result can share a commit unit:

```text
sig = canonical_fingerprint(payload)
with db.transaction():
    row = lock_or_insert(caller, key, sig)
    require(row.sig == sig, PARAMETER_MISMATCH)
    if row.done:
        return row.result
    result = mutate_in_same_transaction(payload)
    row.complete(result)
return result
```

Here, `lock_or_insert` relies on a uniqueness constraint and locking to serialize competition for the same caller and key. When rollback is confirmed, none of the three takes effect. If the commit outcome is unknown, query or retry with the original key rather than assume rollback. If the transaction committed but the response was lost, the retry reads the existing result. [Atomic commit requirements](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)

Sending a remote email is outside that database transaction. External side effects need a downstream idempotency contract or operation state that can be queried and recovered. A local “called” record cannot prove the remote operation completed. [The uncertainty of remote calls](https://stripe.com/blog/idempotency)

Old requests can arrive after a resource has been deleted. Specify an independent retention window for deduplication records so that a late retry does not recreate the resource. [Late requests and retention windows](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/) Deduplication must also be distinguished from cancellation: if the server has never seen a key, a delayed initial request may execute after cancellation. Preventing that requires a revocation or execution deadline recognized by the server, checked close to the actual side effect.

<h2 id="tools">II. Tool Execution</h2>

<h3 id="t1">The Completion Boundary for Tool Arguments</h3>

A streaming JSON parser may fill in missing quotes or brackets so that partial output can still be parsed. If a parameter expects a string, an intended `hello` truncated to `hel` may still satisfy the schema. Correct syntax and types do not prove the model has finished specifying the action.

When `stopReason=length`, Pi skips tool execution, generates error results for every tool call in that assistant message, and allows a later turn to resend the calls in full. Even an apparently complete call is rejected with the batch. A test deliberately constructs `{value:"hel"}`, which passes the schema, and confirms that the tool does not execute. [Source: the length branch](https://github.com/earendil-works/pi/blob/4ac0bd8c7b96d72cb6a73226edc7c9ecaae1d14e/packages/agent/src/agent-loop.ts#L258-L277), [Rejecting the whole batch](https://github.com/earendil-works/pi/blob/4ac0bd8c7b96d72cb6a73226edc7c9ecaae1d14e/packages/agent/src/agent-loop.ts#L471-L503), [Test: valid arguments still do not execute](https://github.com/earendil-works/pi/blob/4ac0bd8c7b96d72cb6a73226edc7c9ecaae1d14e/packages/agent/test/agent-loop.test.ts#L456-L526)

This is a conservative tradeoff: it sacrifices some calls that could have run in exchange for a clear completeness boundary, and incurs another model request. It applies to this Pi path, not to every system. Codex's tool-item completion boundary differs from this batch policy; see [Stream Failures and Continuation](#r3).

The tool entry point must separately check generation completeness, arguments, authorization, and business preconditions. A parser repairs data shape; “parseable after repair” is not enough to authorize an action.

<h3 id="t2">Parallel Execution and Ordered Commits</h3>

Tools A and B are called in that order, but B finishes first. For timely feedback, the UI should be able to display B first. For stable replay, model history can still retain call order A, B. These requirements are compatible if completion events and result commits follow different rules.

Pi's parallel path emits `tool_execution_end` when each tool actually finishes. It then collects results in input order through `Promise.all` and writes toolResult entries in the original call order. Tests explicitly allow completion events in B, A order while the result records remain A, B. If any tool in the batch declares `executionMode=sequential`, the entire batch becomes sequential. [Source: parallel execution and collection](https://github.com/earendil-works/pi/blob/4ac0bd8c7b96d72cb6a73226edc7c9ecaae1d14e/packages/agent/src/agent-loop.ts#L508-L523), [Preserving result order](https://github.com/earendil-works/pi/blob/4ac0bd8c7b96d72cb6a73226edc7c9ecaae1d14e/packages/agent/src/agent-loop.ts#L586-L659), [Ordering test](https://github.com/earendil-works/pi/blob/4ac0bd8c7b96d72cb6a73226edc7c9ecaae1d14e/packages/agent/test/agent-loop.test.ts#L668-L760)

Codex uses a shared/exclusive gate to admit calls marked as parallelizable or non-parallelizable, and collects results in order with `FuturesOrdered`. The shared lock does not mean “read-only tools”: the tests allow parallel shell calls. Nor does the gate automatically analyze whether two shells write the same file. [Source: concurrency admission](https://github.com/openai/codex/blob/806d9732c974bc8a51b8317c1bd8985544fe627c/codex-rs/core/src/tools/parallel.rs#L141-L239), [Parallel shell test](https://github.com/openai/codex/blob/806d9732c974bc8a51b8317c1bd8985544fe627c/codex-rs/core/tests/suite/tool_parallelism.rs#L155-L186), [Ordered collection](https://github.com/openai/codex/blob/806d9732c974bc8a51b8317c1bd8985544fe627c/codex-rs/core/src/session/turn.rs#L2462-L2489)

Pi's batch control can be abbreviated as:

```text
serial = config.tool_execution == sequential \
         or any(call.requires_sequential)
mode = sequential if serial else parallel
jobs = launch(calls, mode, on_complete=emit_completion)
results = await collect_in_input_order(jobs)
for call, result in zip(calls, results):
    append_tool_result(call.id, result)
```

Individual jobs emit completion notifications; the batch commits history results. Call IDs connect the two. Whether the runner supports concurrency, whether resources have read/write dependencies, and how results enter context are three separate questions. Concurrency support answers only the first. Finer resource keys, read/write sets, or dependency graphs can increase concurrency, but also raise declaration and validation costs. With insufficient information, run sequentially. Committing in call order also creates head-of-line waiting: deterministic order cannot simultaneously promise that every result enters the model immediately.

<h3 id="t3">Cancellation and Terminal Settlement</h3>

Pressing Stop expresses a new control intent. It does not automatically undo file changes or rewrite a successful tool as never executed. A late cancellation is especially likely to produce false history when a tool has returned but an observer is still processing its completion event.

Codex's tool wrapper checks whether a terminal outcome has already been reached. If so, it preserves the real result instead of adding an aborted outcome. A repository test deliberately blocks the completion observer and then cancels, verifying that the final lifecycle still contains only Completed. [Source: completion/cancellation race](https://github.com/openai/codex/blob/806d9732c974bc8a51b8317c1bd8985544fe627c/codex-rs/core/src/tools/parallel.rs#L259-L317), [Race test](https://github.com/openai/codex/blob/806d9732c974bc8a51b8317c1bd8985544fe627c/codex-rs/core/src/tools/parallel.rs#L801-L879)

The session layer also needs a finalization order. Codex signals cancellation, gives tasks a short cooperative shutdown window, and performs the necessary cleanup. When interruption markers are enabled, it writes and flushes the marker before emitting `TurnAborted`. A client may read the log immediately after that notification, so the ordering affects whether recovery can see the interruption. If flushing fails, the implementation warns and continues. Receiving the notification therefore still does not prove that the marker is durable. [Source: cancellation and cleanup](https://github.com/openai/codex/blob/806d9732c974bc8a51b8317c1bd8985544fe627c/codex-rs/core/src/tasks/mod.rs#L925-L1029)

OpenCode places actual work in an interruptible region and terminal events and state settlement in a protected finalization region. When closing a subprocess, Claude Agent SDK also escalates from bounded waiting to terminate and then kill. Work can be cancelled while its terminal record still needs to be completed; cleanup waiting needs its own bound. [Source: OpenCode finalization region](https://github.com/anomalyco/opencode/blob/7b3d4ce3a7dbd2a6d3637722a0d5f22a7d086937/packages/core/src/session/runner/step.ts#L123-L158), [OpenCode terminal settlement](https://github.com/anomalyco/opencode/blob/7b3d4ce3a7dbd2a6d3637722a0d5f22a7d086937/packages/core/src/session/runner/step.ts#L211-L263), [Claude SDK process shutdown](https://github.com/anthropics/claude-agent-sdk-python/blob/b6e9d12fe1cc98dde988ab7b7713c1feeee50c6c/src/claude_agent_sdk/_internal/transport/subprocess_cli.py#L969-L1073)

The cancellation path should separate stopping work from committing terminal state. This design sketch protects finalization before the first wait, with separate deadlines for stopping and for the entire finalizer:

```text
request_cancel(work)
with bounded_finalizer(finalize_deadline, shield_cancellation=True):
    await stop_or_escalate(work, stop_deadline)
    for call in calls:
        call.settle_if_pending(observed_outcome_or_unknown(call))
    await persist_history()
    emit_turn_terminal()
```

`settle_if_pending` atomically preserves an existing terminal state: a completed result cannot be overwritten by late cancellation. Finalization timeouts or persistence failures must be reported explicitly. Cancellation shielding does not itself provide a durable transaction.

Cancellation acknowledged, execution stopped, and settlement completed mean three different things: the cancellation was received, execution has stopped, and finalization has finished. Wait for the last boundary before reusing the execution environment or replacing session state. If a remote call's outcome cannot be confirmed, retain “outcome unknown” and the information needed to query it. Labeling every unknown as a failure encourages the next turn to repeat actions that already succeeded.

<h3 id="t4">Tool Results and Actionable Errors</h3>

A successful tool return does not mean the model has enough information to act next. If search results contain only opaque IDs, the model lacks a basis for choosing. If all IDs are removed, later reads lose their precise target. Results need both the semantics required for judgment and the identifiers required for further calls. Large results should support filtering, pagination, or range reads. [Engineering practice: tool-result design](https://www.anthropic.com/engineering/writing-tools-for-agents)

For example, a search response with a result limit can explicitly distinguish “there are no more results” from “only part of the results was returned”:

```text
{
  "items": [{"id": "doc_7", "title": "Interface constraints"}],
  "truncated": true,
  "next_cursor": "c_2",
  "returned_scope": "One page under the current filter"
}
```

`truncated` marks incomplete information, and `next_cursor` provides a way to retrieve more. Without them, the model may confuse “not shown” with “does not exist.” Concise responses reduce noise, but must retain the fields required for the next step.

Errors can provide actionable information too: which argument violates a constraint, which values are allowed, or which range should be narrowed. This turns “the call failed” into “here is how to correct the next call.” [Engineering practice: truncation and error feedback](https://www.anthropic.com/engineering/writing-tools-for-agents) These are correctable errors. Permission denial and cancellation still need independent control paths; they must not be packaged as invitations for the model to keep trying.

<h2 id="state">III. Session State</h2>

<h3 id="s1">Raw Logs and Model Projections</h3>

A failed partial answer should not be fed to the model repeatedly. Deleting it outright, however, loses evidence for debugging and checking costs. Session storage serves both audit and inference input, and the two uses need different views. For example, the raw log can retain `e1, e2, edit(e2, null)` while the model projection omits `e2`; the act of omission is itself recorded.

On retry, Pi's `_omitRecoveryAttempt` appends `context_edit(targetId, null)`, omitting the failed attempt from the model projection while retaining its original entry. The edit is itself a new entry. It applies only to the active branch, and the last edit of a target wins. If the target is still in context but its source entry cannot be found, the code raises an error instead of silently losing provenance. [Source: omitting a failed attempt](https://github.com/earendil-works/pi/blob/4ac0bd8c7b96d72cb6a73226edc7c9ecaae1d14e/packages/coding-agent/src/core/agent-session.ts#L1237-L1253), [Projection rules](https://github.com/earendil-works/pi/blob/4ac0bd8c7b96d72cb6a73226edc7c9ecaae1d14e/packages/coding-agent/src/core/session-manager.ts#L519-L574), [Appending edits](https://github.com/earendil-works/pi/blob/4ac0bd8c7b96d72cb6a73226edc7c9ecaae1d14e/packages/coding-agent/src/core/session-manager.ts#L1360-L1398)

![An appended edit changes the model view while the failed attempt remains in the raw log](/images/blog/en/agent-engineering/03-log-projection.png)

This structure explains both “what happened” and “what the model should see next.” Its cost is that every reader must understand the projection. If token estimation, compaction, replay, and debugging each read a different record set, the UI may show an omission while the budget still counts the old text. The raw log also still occupies disk; privacy deletion needs a separate policy.

Content entering context should retain a source ID, with omission, replacement, and compaction recorded as traceable transformations. The audit view shows the original facts, while the model view shows effective input and can be traced back to those facts. **Explainable recovery depends on explainable context provenance.**

Whether failure information belongs in the next turn also depends on whether it can change a decision. Repeated drafts left by a broken stream can be omitted. Failed tests, nonexistent paths, and unmet business preconditions should remain as observations so the same failing path is not repeated. Preserving failure observations is an important lesson from Manus. [Engineering practice: preserving failure observations](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)

A log projection can retain a short conclusion, its scope, and the location of the original evidence while omitting repeated stack traces. A transient failure must not become a permanent prohibition, and an unknown outcome must remain unknown. Selection should depend on the information a failure provides, rather than deleting or retaining everything by `isError` alone.

<h3 id="s2">Branches, Rollback, and Recovery</h3>

One session file may contain failed paths, rollback events, and new branches. Reading every message in file order does not necessarily reconstruct the current context. Finding the most recent summary does not necessarily identify a usable recovery point either.

Pi entries carry `id` and `parentId`; the active leaf determines the current path. Switching branches only moves the leaf. Subsequent appends create a new branch while old nodes remain. Context construction follows parents to the root and then restores the effective order. Storage order describes the sequence of writes; the causal path describes what the current decision inherits. [Source: reconstructing from the leaf](https://github.com/earendil-works/pi/blob/4ac0bd8c7b96d72cb6a73226edc7c9ecaae1d14e/packages/coding-agent/src/core/session-manager.ts#L390-L416), [Switching branches](https://github.com/earendil-works/pi/blob/4ac0bd8c7b96d72cb6a73226edc7c9ecaae1d14e/packages/coding-agent/src/core/session-manager.ts#L1573-L1593)

Codex's rollout reconstruction also handles rollback, context baselines, model settings, and other metadata. It first scans backward to identify valid segments and checkpoints, then reconstructs history forward. Tests check the restored messages, previous settings, reference context, and attribution together, avoiding a mixed state in which “the messages went back, but internal settings stayed in the future.” [Source: backward identification](https://github.com/openai/codex/blob/806d9732c974bc8a51b8317c1bd8985544fe627c/codex-rs/core/src/session/rollout_reconstruction.rs#L231-L335), [Synchronized rollback test](https://github.com/openai/codex/blob/806d9732c974bc8a51b8317c1bd8985544fe627c/codex-rs/core/src/session/rollout_reconstruction_tests.rs#L582-L730)

OpenCode paginates messages by an explicit session-local `seq`. Its tests deliberately scramble string IDs and timestamps. Timestamps serve display, `seq` reconstructs order, and string IDs need not carry a sorting responsibility. [Test: scrambled IDs and times](https://github.com/anomalyco/opencode/blob/7b3d4ce3a7dbd2a6d3637722a0d5f22a7d086937/packages/core/test/session-store.test.ts#L103-L188), [Source: message order](https://github.com/anomalyco/opencode/blob/7b3d4ce3a7dbd2a6d3637722a0d5f22a7d086937/packages/core/src/session/store.ts#L140-L176)

A recovery contract should include the current branch, valid checkpoint, configuration, and projection version, verified together by the same cases. It should separately state that **conversation rollback does not automatically roll back the working directory or remote systems.** Recheck the environment after recovery. Full environment rollback requires Git, snapshots, or business compensation of its own.

<h2 id="context">IV. Context Management</h2>

<h3 id="c1">Compaction Boundaries and the Tool Protocol</h3>

“Keep the last N messages” sounds simple, but can start in the middle of tool results and leave results without preceding calls. Trimming context changes more than length: it can break the model API's message protocol.

Pi's legal cut points cannot start at a toolResult. Budget selection uses the current effective projection and, when necessary, preserves the prefix of the same turn for summarization. OpenCode moves the recent boundary back to a user message so calls and results from the same exchange are handled together. Their granularities differ; it would be inaccurate to say every implementation splits only at complete user turns. [Source: Pi legal cut points](https://github.com/earendil-works/pi/blob/4ac0bd8c7b96d72cb6a73226edc7c9ecaae1d14e/packages/coding-agent/src/core/compaction/compaction.ts#L351-L364), [Boundaries in the projection](https://github.com/earendil-works/pi/blob/4ac0bd8c7b96d72cb6a73226edc7c9ecaae1d14e/packages/coding-agent/src/core/compaction/compaction.ts#L802-L935), [OpenCode exchange boundaries](https://github.com/anomalyco/opencode/blob/7b3d4ce3a7dbd2a6d3637722a0d5f22a7d086937/packages/core/src/session/compaction.ts#L700-L737)

![Trimming must preserve call/result relationships; length targets remain subordinate to protocol boundaries](/images/blog/en/agent-engineering/04-compaction-boundary.png)

Interruption can also leave a call with no result. Pi's message adaptation layer fills missing results with an `isError=true` placeholder saying `No result provided`. This repairs structure, but does not prove that the tool never ran. If the remote outcome is unknown, the placeholder can only mean “no result was observed.” [Source: repairing missing results](https://github.com/earendil-works/pi/blob/4ac0bd8c7b96d72cb6a73226edc7c9ecaae1d14e/packages/ai/src/api/transform-messages.ts#L158-L235)

Trimming should first identify indivisible relationships, then find a boundary that meets the budget, and finally explain which content was summarized, converted to text, or discarded. OpenCode serializes the recent exchange as text alongside the summary; it does not preserve the original protocol messages losslessly. If one set of tool results is itself very large, even a legal boundary may exceed the target budget. Reduce tool output or adjust the next task instead of silently breaking the pairing.

<h3 id="c2">Context Budgets and Invalidated Measurements</h3>

The previous API usage measures only what the model saw on that request. A local tool may then read a large file, making the next request larger while the old usage still suggests ample room. Watching only the last token count underestimates context after tool output.

OpenCode's `estimatePrompt` takes the latest trusted provider-measured usage and adds an estimate for content not yet measured, particularly local tool results. After switching providers, a count from the previous provider is not automatically trustworthy. Window calculations prefer the input limit, then the context limit. A default buffer is reserved, with an explicit configuration override. [Source: estimatePrompt and ceiling](https://github.com/anomalyco/opencode/blob/7b3d4ce3a7dbd2a6d3637722a0d5f22a7d086937/packages/core/src/session/compaction.ts#L873-L923), [Tool-growth and input-window tests](https://github.com/anomalyco/opencode/blob/7b3d4ce3a7dbd2a6d3637722a0d5f22a7d086937/packages/core/test/session-compaction.test.ts#L170-L250)

The budget can be understood as `trusted measured baseline + estimated additions + reserve for the next step`. The reserve must account for next-request growth and the model interface. Providers differ in how input, output, and total window limits relate, so the same maximum output allowance cannot be mechanically subtracted from every window.

Measurement invalidation is easier to overlook. Reusing pre-compaction usage after compaction can trigger compaction again immediately. Pi checks the response model to avoid applying an old model's overflow error to a new model's recovery. It also checks the compaction boundary so old usage does not drive the next threshold decision. All-zero usage falls back to estimation rather than being interpreted as no context. [Source: checking the response model](https://github.com/earendil-works/pi/blob/4ac0bd8c7b96d72cb6a73226edc7c9ecaae1d14e/packages/coding-agent/src/core/agent-session.ts#L2958-L3009), [Measurement provenance and compaction decisions](https://github.com/earendil-works/pi/blob/4ac0bd8c7b96d72cb6a73226edc7c9ecaae1d14e/packages/coding-agent/src/core/agent-session.ts#L3032-L3084)

Store a token count together with what it measured, the model, and the corresponding log boundary. A number with no source boundary is hard to reuse safely. The budget remains an estimate: protocol pairing, images, and very long tool results can introduce errors. An overflow recovery exit is still needed; see [Compaction Failures and Baseline Commits](#c3).

<h3 id="c3">Compaction Failures and Baseline Commits</h3>

A compaction request must itself send input to a model. If it also exceeds the window, retrying it unchanged does not shorten the input. Replacing old history immediately with a partial summary can also destroy the last usable baseline when the request fails.

After a compaction overflow, OpenCode progressively reduces input. Using the request estimate from its first entry into the shrinking branch as a fixed baseline, it lowers the target ratios to 0.7, 0.5, and 0.35. When it cannot shrink further while preserving the latest exchange and checkpoint, it fails explicitly. Smaller input is observable recovery progress, and a fixed attempt count gives the recovery path its own exit. [Source: shrinking input](https://github.com/anomalyco/opencode/blob/7b3d4ce3a7dbd2a6d3637722a0d5f22a7d086937/packages/core/src/session/compaction.ts#L398-L442), [Ratios and boundaries](https://github.com/anomalyco/opencode/blob/7b3d4ce3a7dbd2a6d3637722a0d5f22a7d086937/packages/core/src/session/compaction.ts#L94-L100), [Failure-exit test](https://github.com/anomalyco/opencode/blob/7b3d4ce3a7dbd2a6d3637722a0d5f22a7d086937/packages/core/test/session-runner.test.ts#L2818-L2851)

Codex's PostTurn compaction path stages summary output and constructs replacement history only after `response.completed`, preventing a failed partial summary from contaminating the current baseline. Replacing after completion is the commit semantics of this particular path. [Source: staging the summary](https://github.com/openai/codex/blob/806d9732c974bc8a51b8317c1bd8985544fe627c/codex-rs/core/src/compact.rs#L801-L855), [Replacement after completion](https://github.com/openai/codex/blob/806d9732c974bc8a51b8317c1bd8985544fe627c/codex-rs/core/src/compact.rs#L370-L416)

“Summary generation succeeded” still does not mean “important facts are complete.” One lightweight OpenCode check requires only that the output contain at least one heading from the template. Passing that predicate can still leave out other sections, key decisions, or unfinished work. [Source: heading-existence check](https://github.com/anomalyco/opencode/blob/7b3d4ce3a7dbd2a6d3637722a0d5f22a7d086937/packages/core/src/session/compaction.ts#L281-L305)

The candidate summary and current baseline can be stored separately, with publication after the completion marker and agreed checks:

```text
old = current_baseline
candidate = await summarize(history)
if not candidate.response_completed:
    return FAILED_KEEP(old)
if not validate(candidate):
    return FAILED_KEEP(old)
await save(candidate)
current_baseline = candidate.id
```

This is a baseline-commit design sketch; `validate` needs a specific definition of what it checks. Crash recovery between saving and switching the reference requires guarantees from the persistence layer. Each overflow recovery should reduce input or change another quantity relevant to the failure, with an explicit exit. Repeating the same failed input unchanged makes no progress.

<h3 id="c4">Stable Prefixes and Cache Reuse</h3>

A backend with prefix caching can reuse common input across adjacent requests. An early timestamp, changing tool definitions, or nondeterministic serialization order shortens the reusable prefix. Place stable instructions and tool definitions early where possible, then append new observations. Actual hits still depend on backend cache granularity, retention, and routing. [Engineering practice: designing around prefix caching](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)

```text
request_1 = stable_prefix + history_1
request_2 = stable_prefix + history_1 + new_observation
```

An append-only log does not imply append-only model input. A `context_edit` can change an earlier model projection, and compaction can replace a large span of history. Audit retention and request caching therefore need separate checks. When comparing compaction benefits, measure cumulative latency and cost in subsequent requests too. Necessary fact corrections, permission changes, and budget constraints still take priority over cache hits.

<h3 id="c5">Context Offloading and Recoverable References</h3>

A summary preserves the current judgment; an external reference preserves a way to retrieve the evidence again. Large files, pages, and query results can remain outside the window and be read on demand through file paths, links, and saved query conditions. Temporarily not loading the full text and permanently losing information then become different choices. [Engineering practice: retrieving context on demand](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

A recoverable reference must do more than remember an address. Paths can be overwritten, URLs can change, and permissions can lapse between sessions. To reproduce past evidence, preserve a snapshot or version, a content hash, and location information. A hash can check retrieved content, but cannot make lost content reappear.

On-demand reads also incur round trips. Constraints needed for the immediate decision are good candidates for preloading; bulk evidence can be retrieved through tools. If a document is reread every turn, repeatedly offloading it may be slower than retaining a summary and key excerpts. An offloading policy must specify where content is saved, how it can be read again, and when to read it.

<h2 id="interaction">V. Control and Interaction</h2>

<h3 id="i1">Steering, Follow-up, and Abort</h3>

When a user adds “look in another directory first” during execution, they may want to change the next step without losing the results of a tool already finishing. Input injection must be timely and respect the tool protocol. It cannot be placed arbitrarily between a toolCall and toolResult.

Pi keeps steering and follow-up in separate queues. In this version, it reads steering after the entire tool batch finishes and the current turn is finalized. It processes follow-up when the inner loop ends naturally. Steering does not interrupt the rest of a batch immediately after each tool finishes. If `prepareNextTurn`, including compaction, takes time and no input was found beforehand, Pi checks again afterward to catch messages that arrived during preparation. [Source: polling again after preparation](https://github.com/earendil-works/pi/blob/4ac0bd8c7b96d72cb6a73226edc7c9ecaae1d14e/packages/agent/src/agent-loop.ts#L175-L217), [Scheduling after a tool batch](https://github.com/earendil-works/pi/blob/4ac0bd8c7b96d72cb6a73226edc7c9ecaae1d14e/packages/agent/src/agent-loop.ts#L280-L318)

The second check has a subtle condition: it runs only if pending input was previously empty, preventing a one-at-a-time queue from consuming an extra message in the same iteration. This improves responsiveness while preserving queue-consumption semantics.

The input interface needs to distinguish three intents: change direction at the next safe boundary, add work after the current work ends naturally, or request cancellation immediately. The first two enter scheduling queues; the third enters the cancellation path. With only an ambiguous Send action, the runner must guess what the user means. Safe boundaries create waiting, so long-running tools also need a clear indication that a new instruction is queued and when it will take effect.

<h3 id="i2">Lost Wakeups and Finalization Scheduling</h3>

A seemingly reasonable rule is to avoid starting a second runner while one is busy, then mark the runner idle after it drains the queue. This can lose a wakeup during exit. The old runner makes its final empty-queue check and decides to end. New input then arrives, sees the runner still busy, and skips starting another. The old runner changes to idle and exits. Work remains queued with no executor.

OpenCode's coordinator uses `pendingWake` as a doorbell. If it finds the doorbell after draining, it checks for work again; a wakeup during finalization can also start a successor. It separately models immediate acknowledgement of `interrupt`, `awaitSettlement` for the current execution, and `awaitIdle`, which includes successor runs. [Source: drain and doorbell](https://github.com/anomalyco/opencode/blob/7b3d4ce3a7dbd2a6d3637722a0d5f22a7d086937/packages/core/src/session/run-coordinator.ts#L31-L88), [Interface waiting semantics](https://github.com/anomalyco/opencode/blob/7b3d4ce3a7dbd2a6d3637722a0d5f22a7d086937/packages/core/src/session/run-coordinator.ts#L6-L29), [Finalization window and waiting semantics](https://github.com/anomalyco/opencode/blob/7b3d4ce3a7dbd2a6d3637722a0d5f22a7d086937/packages/core/src/session/run-coordinator.ts#L116-L176)

The key finalization sequence is to finish potentially waiting cleanup first, then synchronously check the doorbell and transfer execution ownership:

```text
wake(key, scope):
    if e := active.get(key):
        e.pending_wake = merge_scope(e.pending_wake, scope)
    else:
        active[key] = start(key, scope)

finish(e):
    await cleanup(e)
    without_await:
        if e.pending_wake:
            active[e.key] = start(e.key, e.pending_wake)
        else:
            del active[e.key]
```

This abbreviates the late-wakeup path. Normal draining also consumes the doorbell and rechecks work; when scopes merge, INPUT overrides STEER. `start` only schedules asynchronous draining and returns an execution record. The synchronous region registers it in `active`, so a new wake cannot slip between checking the doorbell and changing state.

The doorbell means “check once more.” It can merge multiple wakeups, but does not store task content. Executions here live in an in-process Map, and `without_await` is only a cooperative scheduling boundary within that process. Cross-process exclusion, durable tasks, and power-loss recovery require separate implementation.

Race tests should cover the period before the final drain, after draining but before idle, and during cancellation cleanup. Old wakeups accumulated before cancellation may be cleared, but new user intent submitted after cancellation must still run. Happy-path tests rarely exercise this window. Barriers provide precise timing control; OpenCode tests late wakeups by deliberately blocking finalization. [Test: new input during finalization](https://github.com/anomalyco/opencode/blob/7b3d4ce3a7dbd2a6d3637722a0d5f22a7d086937/packages/core/test/session-run-coordinator.test.ts#L263-L281), [Wakeups after cancellation](https://github.com/anomalyco/opencode/blob/7b3d4ce3a7dbd2a6d3637722a0d5f22a7d086937/packages/core/test/session-run-coordinator.test.ts#L317-L353)

<h3 id="i3">Bidirectional Control and Channel Lifetimes</h3>

When wrapping a CLI in an SDK, it is tempting to close stdin after writing the prompt and then read only stdout. But if the parent process handles tool permissions, hooks, or an SDK-hosted MCP server, the CLI must send control requests over stdout and receive corresponding replies over stdin. The input channel carries more than user prompts.

Claude Agent SDK's `_has_bidirectional_needs` checks these configurations and defers closing stdin. A result frame ends only one turn. Background work may still wake the parent agent, and subsequent turns may send more permission or tool-control requests. Closing too early makes those requests fail with `Stream closed`. [Source: bidirectional needs and run completion](https://github.com/anthropics/claude-agent-sdk-python/blob/b6e9d12fe1cc98dde988ab7b7713c1feeee50c6c/src/claude_agent_sdk/_internal/query.py#L1041-L1091)

Transport has another independent boundary: one pipe read is not one JSON message. The SDK reconstructs stdout NDJSON by line and checks the lengths of complete lines and unfinished buffers. At EOF it can accept a valid final frame without a newline, but cannot treat truncated JSON as a complete message. [Source: message framing](https://github.com/anthropics/claude-agent-sdk-python/blob/b6e9d12fe1cc98dde988ab7b7713c1feeee50c6c/src/claude_agent_sdk/_internal/transport/subprocess_cli.py#L1101-L1167)

Prompt input completion, control-channel closure, end of a turn's result, and end of the entire run need separate models. Control requests need IDs, timeouts, and a mechanism to wake waiters on failure. When the reader terminates, all pending requests should not be left to time out individually. For older CLIs that do not report session state and have multiple asynchronous prompts queued, some closure cases remain uncovered; the current SDK records that limitation in adjacent comments.

<h3 id="i4">Permission Denial and Corrective Feedback</h3>

Denying a tool can mean “stop this operation,” or come with a correction such as “use the test directory.” Returning every denial as an ordinary tool error may lead the model to try another tool for the same intent. Terminating on every denial, however, discards valuable corrective feedback.

OpenCode represents denial without feedback as `DeclinedError` and denial with feedback as `CorrectedError`. The former propagates along the path that stops the current turn, avoiding generic error handling at the tool leaf. The latter can become model-visible feedback so the next turn can continue under the new constraint. Denial also propagates to other pending permission requests in the same session, bringing the parallel batch under control. [Source: two control semantics](https://github.com/anomalyco/opencode/blob/7b3d4ce3a7dbd2a6d3637722a0d5f22a7d086937/packages/core/src/permission.ts#L245-L298), [Stop and correction tests](https://github.com/anomalyco/opencode/blob/7b3d4ce3a7dbd2a6d3637722a0d5f22a7d086937/packages/core/test/session-runner.test.ts#L4906-L4985)

Reply handling runs in a cancellation-protected region, and waiting requests in the same session receive a consistent control signal:

```text
reject(request, feedback):
    signal = CorrectedError(feedback) if feedback else DeclinedError()
    for pending in same_session_requests(request):
        publish_replied(pending, REJECT)
        fail_waiter(pending, signal)
        remove_pending(pending)
```

Always Allow should not automatically release every old request either. OpenCode reevaluates waiting requests; a changed deny rule can still block them. Authorization is a judgment under current constraints, not simply reuse of a queue position from seconds earlier. [Source: reevaluating waiting requests](https://github.com/anomalyco/opencode/blob/7b3d4ce3a7dbd2a6d3637722a0d5f22a7d086937/packages/core/src/permission.ts#L310-L322)

User stops, directional corrections, and policy denials need different propagation paths. Recoverable business failures can become model feedback. The runner must preserve the control force of permission denial and cancellation, rather than let a later model turn reinterpret them as permission to execute.

<h2 id="acceptance">VI. Handoff and Acceptance</h2>

<h3 id="g1">Cross-session Handoff and Regression Checks</h3>

Cross-session handoff needs an objective, progress records, and a recoverable version, but these records describe only past observations. Dependencies may have changed, services may not be running, and previous tests may have missed regressions. Reading handoff files must be followed by rebuilding trust in the current environment.

Anthropic's long-running harness separates initialization from subsequent incremental work. A feature list, startup script, progress record, and Git support handoff. Its coding prompt specifies the takeover order: start the environment, retest one or two core features that passed earlier, fix regressions first, then begin new features. [Official article: long-running harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents), [Official example: handoff and regression checks](https://github.com/anthropics/claude-quickstarts/blob/9ec32b91df50b0d4906cae64b13c6298055ff40d/autonomous-coding/prompts/coding_prompt.md#L5-L66)

Baseline checks need not rerun every expensive test each turn, but must cover the critical paths on which further work depends. After authentication changes, merely checking that the home page opens is inadequate. Retest scope depends on the impact, cost, and risk of the change.

Protecting the feature list is another boundary. The prompt allows only `passes` updates and forbids deleting or changing acceptance requirements. That is a prompt constraint; it does not automatically give the example ACLs or deterministic validation. Enforcement can freeze the acceptance specification or compare immutable fields, with the runner validating allowed state changes. External requirements should determine tests; a failed test must not be casually rewritten into an easier one. [Official example: feature-list constraints](https://github.com/anthropics/claude-quickstarts/blob/9ec32b91df50b0d4906cae64b13c6298055ff40d/autonomous-coding/prompts/initializer_prompt.md#L1-L106)

Handoff records should also distinguish verified facts, unverified hypotheses, and suggested next steps, attaching the version or artifact to which verification applies. The next agent can then take over quickly and identify which conclusions need rechecking.

<h3 id="g2">Run Termination and Task Acceptance</h3>

“Complete” must specify which layer has completed. A protocol completion marker such as `response.completed` establishes that its response ended fully; a closed connection or EOF alone does not. A stopped turn means its control flow reached a terminal state. Task acceptance requires the artifacts to satisfy the objective. These three boundaries cannot be inferred from one another's event names.

Codex's `TurnComplete.error` can carry the turn's terminal error, so consumers must inspect it. Claude Agent SDK preserves a structured error result returned by the CLI before a later nonzero exit flattens the real cause into “exit code 1.” It also wakes pending control requests so they receive the same terminal reason. [Source: the TurnComplete error field](https://github.com/openai/codex/blob/806d9732c974bc8a51b8317c1bd8985544fe627c/codex-rs/core/src/tasks/mod.rs#L813-L856), [Claude SDK error preservation](https://github.com/anthropics/claude-agent-sdk-python/blob/b6e9d12fe1cc98dde988ab7b7713c1feeee50c6c/src/claude_agent_sdk/_internal/query.py#L512-L550)

![Protocol completion, terminal turn state, and task acceptance each require their own evidence](/images/blog/en/agent-engineering/05-completion-layers.png)

Claude Code's official Ralph plugin illustrates another distinction. Its stop hook checks whether `<promise>` in the output matches an agreed string and ends the loop if it does. That is a stop signal, not independent test evidence. Likewise, the long-running harness example's outer loop starts new sessions automatically, but its code does not make “all features pass” a deterministic exit gate. Printing progress and verifying completion are different responsibilities. [Source: Ralph completion promise](https://github.com/anthropics/claude-code/blob/2301018b1f61073c501a8e7a4813ef48c239163b/plugins/ralph-wiggum/hooks/stop-hook.sh#L114-L174), [Official example: the outer loop](https://github.com/anthropics/claude-quickstarts/blob/9ec32b91df50b0d4906cae64b13c6298055ff40d/autonomous-coding/agent.py#L146-L193)

The state model should record run status and acceptance status separately. A run can end normally without acceptance, or stop at its budget with partial results. Acceptance evidence binds a specific artifact version, checks, and results. After an artifact changes, affected evidence must be invalidated or regenerated. Another LLM saying “looks good” can provide an opinion, but cannot replace executable checks and observations of the real environment.

```text
run_status: completed | failed | cancelled | budget_exhausted
acceptance: pending | passed | failed
evidence:   artifact_version + checks + results
```

Acceptance primarily checks the final artifacts and environment state, together with any process constraints explicitly required by the task. If two tool paths both satisfy the requirements, a difference in call order should not disqualify either. Traces diagnose failures and check authorization and cost. A fixed tool sequence belongs to acceptance only when the task actually requires that sequence. [Engineering practice: graders and valid alternative paths](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

<h3 id="g3">Evaluating and Simplifying the Harness</h3>

An engineering patch often addresses a particular model weakness: stopping too early, reducing work near the context limit, or attempting too many features at once. After a model upgrade, such mechanisms may still help, or they may add restart, summarization, and coordination costs.

A later Anthropic harness-design article records such adjustments: changes in model capabilities led to simpler context-reset and sprint boundaries, with evaluation changing accordingly. [Official article: harness iteration](https://www.anthropic.com/engineering/harness-design-long-running-apps)

Each mechanism can have a short contract: which failure it addresses, which metric shows that it helps, how much time and call cost it adds, and when it should be removed. After model or tool upgrades, compare enabled and disabled versions on the same tasks and budgets, observing final acceptance rates, recovery failures, and total cost. More turns do not necessarily mean greater capability; the system may simply be repairing problems it created itself.

Fix the acceptance specification before implementation where possible. If requirements change, explicitly version the specification. With separate generators and evaluators, also guard against shared false assumptions. Did the browser really interact with the page? Do tests cover the requirements? Did the evaluator read the latest artifact? Each needs checkable evidence. A harness should sustain progress and remain open to correction by evidence.

Reliability comparisons also need to distinguish `pass@k`, which asks whether at least one of k attempts succeeds, from `pass^k`, which asks whether all k succeed. The former suits tasks where candidates can be selected; the latter reflects reliability across repeated runs. [Engineering practice: repeated-trial metrics](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

If each independent attempt at the same task succeeds with probability 0.8, the probability of at least one success in three attempts is 99.2%, while the probability that all three succeed is only 51.2%. This example assumes independent, identically distributed trials. More opportunities raise the chance of finding a usable result without changing the success rate of a single run.

```text
hits, consistent = [], []
for task in held_out_tasks:
    ok = [grade(run(task, fresh_env(task), budget_limit))
          for _ in range(k)]
    hits.append(any(ok))
    consistent.append(all(ok))
report(mean(hits), mean(consistent))
```

These repeated trials each start from the same initial environment. They are not HTTP retries in one evolving execution environment. Fix the per-run budget, isolate artifacts from earlier runs, and record sample size, model version, and harness version to distinguish improved reliability from merely allowing more attempts.

<h2 id="invariants">Invariants and Failure Tests</h2>

Interface promises need corresponding failure tests. The following conditions can become regression cases directly:

| Invariant | Failures worth deliberately introducing |
| --- | --- |
| The same wait advice never restarts its timer across layers | Notification delay, lock waiting, switching transports |
| Recovery input reflects actions that have already occurred | A tool executes before the model stream breaks |
| An idempotency key cannot silently change business intent | Concurrent same-key submissions, changed parameters, late retries after resource deletion |
| A call has only one real terminal outcome | Cancellation while the completion observer is blocked |
| Projection and replay use the same provenance and boundaries | Branch switching, rollback, successive compactions |
| New work cannot fall into the busy→idle gap | Input after drain, during finalization, or after cancellation |
| Completion has independent evidence for the current artifact | Normal termination without meeting requirements, old tests attached to new files |
| Offloaded evidence can be retrieved again and its version checked | Overwritten paths, expired references, updated content returned after recovery |

For races, barriers and controllable clocks are more informative than repeatedly running a test in the hope of hitting the problem. For recovery, make recovery itself fail at least once. For completion, test a normal process exit that fails acceptance at least once. These negative cases show exactly how far the system's promises extend.

<h2 id="versions">Implementation Versions and Scope</h2>

The implementation evidence comes from the public source of Codex, OpenCode, and Pi, alongside official Claude Code plugins, Claude Agent SDK, and Anthropic's long-running harness example. Claude Code's core runtime is not fully public in the official repository, so related conclusions are limited to the public layers listed here. Adjacent engineering articles supply additional mechanisms and design rationale, not a claim that every project implements them. Pseudocode extracts control relationships while omitting concrete types and some branches. Sections labeled design sketches present interfaces that could be adopted.

Pinned source versions: [Codex 806d9732](https://github.com/openai/codex/commit/806d9732c974bc8a51b8317c1bd8985544fe627c), [OpenCode 7b3d4ce3](https://github.com/anomalyco/opencode/commit/7b3d4ce3a7dbd2a6d3637722a0d5f22a7d086937), [Pi 4ac0bd8c](https://github.com/earendil-works/pi/commit/4ac0bd8c7b96d72cb6a73226edc7c9ecaae1d14e), [Claude Code plugins 2301018b](https://github.com/anthropics/claude-code/commit/2301018b1f61073c501a8e7a4813ef48c239163b), [Claude Agent SDK b6e9d12f](https://github.com/anthropics/claude-agent-sdk-python/commit/b6e9d12fe1cc98dde988ab7b7713c1feeee50c6c), [Harness example 9ec32b91](https://github.com/anthropics/claude-quickstarts/commit/9ec32b91df50b0d4906cae64b13c6298055ff40d). OpenCode uses the `packages/core` structure at that revision. Pi's old repository redirects to `earendil-works/pi`.

The linked tests were checked statically for their scenarios and assertions. The full upstream suites were not run locally. Implementation behavior refers to the pinned commits in the adjacent links.
{% endraw %}
