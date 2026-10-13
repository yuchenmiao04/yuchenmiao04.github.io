---
layout: blog
title: 'Harness Engineering: Closing the Agent Execution Loop'
permalink: /en/blog/harness-engineering/
description: How a harness organizes context, tools, state, acceptance, and recovery
  so multi-step tasks advance from actual results.
lang: en
translation_slug: harness-engineering
---

{% raw %}
<h2 id="长任务为什么需要-harness">Why long tasks need a harness</h2>

Tasks require sustained execution → each step produces new results and state → later decisions depend on those results → the system must check, record, and correct the process as a whole.

A language model can generate an answer from its current input and propose the next tool call. Whether a task reaches completion also depends on whether tools execute successfully, whether their results are trustworthy, whether intermediate state is retained, and whether the final result has clear acceptance criteria.

Consider this example:

> Ask an agent to build a dashboard that imports CSV files. After a user uploads a file, the page should preview the data, filter it by date, and export the filtered results as CSV.

The model may produce the interface quickly, yet problems can remain when the application runs: the upload button is not connected to its handler; the page shows a filter, but the export contains every record; a refresh loses the user's recent state.

These failures occur at different points in the execution chain. A system that only checks whether the final reply says “done” cannot distinguish a generated interface from a verified feature.

A harness organizes the runtime around the model, giving the task state, feedback, and explicit completion conditions.

<h2 id="promptcontext-与-harness">Prompt, context, and harness</h2>

Prompt engineering concerns how a task is expressed. Roles, goals, constraints, examples, and output formats all belong here.

For the dashboard, a prompt might add: “Use YYYY-MM-DD for dates; show a message for an empty file; the exported content must match the current filter.” These instructions clarify the goal, but the system still needs to supply the actual CSV fields, existing code structure, and project dependencies.

Context engineering concerns what the model can see at the current step. Context includes task instructions, retrieved material, tool results, conversation history, current state, and intermediate artifacts. Its purpose is to organize the information needed for the present decision.

Harness engineering extends to the entire runtime: how tools are called, when execution continues, how state is saved, how results are accepted, and how execution recovers from failure.

![Figure 1: The scopes of prompt, context, and harness engineering.](/images/blog/en/harness-engineering/01-scopes.png)

Figure 1 separates these concerns by scope: a prompt sits within context, and organizing context is part of the harness. This distinction helps analyze a system; responsibilities may overlap in an implementation.

An agent's [system composition](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness) can be summarized as `Agent = Model + Harness`. The plus sign illustrates composition, rather than a performance formula. Model capabilities, the execution environment, and task difficulty jointly affect the outcome.

<h2 id="整体运行流程">The execution loop</h2>

A task can be organized as follows: read the goal and existing state → assemble the current context → decide the next action → execute a tool → check the actual result → update state, then begin the next iteration.

![Figure 2: An execution loop with acceptance checks, state updates, and exit conditions.](/images/blog/en/harness-engineering/02-execution-loop.png)

Successful tool execution and task acceptance are separate things. Writing a file successfully means the artifact is on disk; opening a browser page means the application can start. Whether the export satisfies the requirements still requires inspecting its contents.

When a check fails, the system should feed evidence of the failure into the next context. For example, it can record the triggering input, expected output, actual output, and error log, then ask the agent to repair the problem.

If attempts, time, or cost reach the budget, the system needs to stop and preserve the working state. Otherwise, even a generate → check → repair loop can turn into endless repetition.

The following sketches the mechanism, rather than the API of a particular framework:

```text
Read the goal, acceptance criteria, and saved state.
Loop within the budget:
    Assemble the context needed for the current step.
    Ask the model to propose an action; check constraints, then execute.
    Check the result, save evidence, and update task state.
    Finish if all acceptance checks pass; otherwise continue from the failure.
If the budget is exhausted or execution is blocked:
    Save the working state and report unfinished items.
```

<h2 id="harness-的构成">The components of a harness</h2>

A harness can be examined through six concerns: context, tools, orchestration, memory and state, evaluation and observability, and constraints and recovery.

<h3 id="context选择当前需要的信息">Context: select the information needed now</h3>

First establish the goal and success criteria, then select the evidence needed for the current step. Stable rules, the current task, execution state, and external material should have a clear organization.

When implementing date filtering, for example, the model needs the date-field definition, relevant components, and acceptance cases. Dozens of unrelated pages from an earlier search do not need to keep occupying the context.

RAG is one way to supply additional information. Documents are chunked and indexed; retrieved results are then filtered and ranked before relevant content enters the context. Context engineering also covers when to summarize conversation history, how much tool output to retain, and whether subtasks return source text or structured conclusions.

[Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) use progressive disclosure to control loading: expose a name and brief description first, read the specific `SKILL.md` when a task matches, and load references or execute scripts when needed. This brings instructions into context on demand.

The goal is to make information needed for the current decision easy to find and use. What to retain, when to load it, and how to update it deserve more attention than context length alone.

<h3 id="tools连接动作与真实环境">Tools: connect actions to the real environment</h3>

The tool layer turns model-proposed actions into actual operations, such as reading files, querying data, running code, or opening a browser.

Select a sufficient toolset for the task, then define when to use it: verify missing facts, run tests to check functionality, and open the browser to inspect interactions.

Tool boundaries, input parameters, and results need to be designed together. If a date-filter test fails, the tool should return the specific assertion and actual value so the next iteration can locate the problem.

Tool output also needs a controlled scope. Full logs can remain in external files while the current context loads relevant errors, necessary context, and the original file location. This supports further analysis while preserving the evidence needed to investigate.

<h3 id="orchestration组织步骤与分支">Orchestration: organize steps and branches</h3>

Orchestration determines how steps connect. Gather material when information is missing; execute once prerequisites are met; enter a repair or exit branch when the result fails a requirement.

For the dashboard, implement data loading first, filtering next, and export verification last. Decorating the page before CSV parsing passes would accumulate more unverified work.

Orchestration does not mean forcing every task into the same fixed flowchart. Conditions a program can reliably evaluate can become explicit branches; analysis and selection can be left to the model. If one model already handles a task segment reliably, further decomposition may add handoff overhead.

<h3 id="memory-and-state记录做到哪一步">Memory and state: record progress</h3>

Current task state, intermediate results within a session, and long-term preferences should be stored separately.

Task state answers “Which features have passed, and which still fail?” Intermediate results retain file locations, established conclusions, and unresolved questions. Long-term preferences record requirements that remain relevant across tasks, such as a user's preferred writing style.

For example:

```text
Confirmed: CSV loading and data preview pass their tests.
Failing: The export still contains records outside the filter range.
Evidence: Locations of the test output and actual exported file.
Next: Check whether the export function reads the current filter state.
```

If this information exists only in a long conversation, it can be lost when the session changes. External progress records let a new session continue from verified state.

<h3 id="evaluation-and-observability建立验收依据">Evaluation and observability: establish evidence for acceptance</h3>

Evaluation determines whether a result meets the requirements; observability supplies evidence for locating problems.

Dashboard acceptance might check filtering against a known input, click the export button, and read the resulting CSV. Test results, screenshots, execution logs, and key metrics together provide the basis for judgment.

For interface quality or product completeness, a separate evaluator can inspect the result against explicit criteria. Independent evaluation helps reduce self-assessment bias, but evaluators can still miss defects. Criteria need calibration and should be combined with reproducible checks where possible.

Observability also distinguishes failure causes: missing material, tool timeouts, model misunderstanding, and stale state each require different repairs.

A task's check → repair loop fixes the current artifact. The harness itself also needs an improvement loop: retain execution traces → locate failures → turn failures into evaluation tasks → change the system → compare results again. The point of [improving a harness through execution traces](https://www.langchain.com/blog/improving-deep-agents-with-harness-engineering) is to connect each change to a reproducible problem.

For attribution, first inspect what the model actually received, what the tools returned, the environment's prerequisites, and the acceptance rules. Missing field definitions, tool timeouts, incorrect decisions, and evaluator errors can all appear as task failure while requiring different fixes. Traces should retain these inspectable inputs, actions, and results, rather than only the final answer.

When comparing changes, keep the model version, task set, initial environment, and budget fixed where possible, and record the harness version. Repeat stochastic tasks and compare completion rate, time, and cost. After fixing export, also check whether upload and filtering have regressed. [Agent evaluations](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) should focus primarily on actual outcomes; unless action order is itself a business constraint, the agent need not follow a single prescribed tool-call path.

<h3 id="constraints-and-recovery限制影响并恢复执行">Constraints and recovery: limit effects and resume execution</h3>

Constraints must be enforced at execution boundaries: accessible files, callable tools, and execution budgets. A prompt saying “avoid mistakes” cannot replace actual permission and parameter checks.

Recovery paths depend on the failure. A temporary timeout may warrant a bounded retry; an invalid input format needs correction; an implementation that breaks existing functionality may require returning to a saved stable version.

Before retrying an action that may repeat side effects, determine whether the previous attempt already succeeded. Otherwise, a network timeout can be mistaken for evidence that the operation never happened.

<h2 id="长任务的上下文交接">Context handoffs in long tasks</h2>

State records serve another concrete purpose: context handoffs. A context reset ends the current context and transfers work to a new session.

This requires saving sufficient handoff material first. The new session needs the goal, completed work, acceptance evidence, unresolved issues, and the point from which it should continue.

![Figure 3: Handoffs between session context and external persistent state.](/images/blog/en/harness-engineering/03-session-handoff.png)

Anthropic's [long-running task approach](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) connects sessions with a feature list, progress logs, and Git records. Later sessions read the records, complete a feature, verify it, and update the records.

Compaction and reset need to be distinguished. Compaction compresses existing history while retaining a shorter continuous context. Reset starts a fresh context and relies on external handoff material to reconstruct the task.

The choice needs validation against the model and task. In Anthropic's [application development experiments](https://www.anthropic.com/engineering/harness-design-long-running-apps), the Sonnet 4.5 approach needed resets; after switching to Opus 4.5, it used a continuous session and automatic compaction instead. The need for resets changes with model capabilities and tasks.

A handoff preserves established task state while controlling what the next iteration must load. If the handoff omits a failure condition, even a clean new context can repeat the same mistake.

Progress records should point to concrete artifacts and evidence: commits, test commands, and failing inputs. “Passed” is conditional: after code, dependencies, or service state change, an earlier conclusion may no longer hold. A new session should read the records, check the current files and environment, run necessary basic verification, and then continue unfinished work. Summaries help locate the working state; results from the current environment support the judgment.

<h2 id="业界实践">Industry practice</h2>

<h3 id="anthropic将实现与验收分开">Anthropic: separate implementation from acceptance</h3>

Anthropic's [application development experiments](https://www.anthropic.com/engineering/harness-design-long-running-apps) used a planner, generator, and evaluator. The planner expanded requirements into specifications, the generator implemented features, and the evaluator checked interactions and results in the real environment.

Examples included a 2D game creation tool and a browser-based digital audio workstation (DAW). Evaluation required operating the timeline and checking data reads and writes. Failure feedback needed concrete reproduction steps and expected behavior to support the next repair.

In the Opus 4.6 version, orchestration became simpler: sprint divisions were removed and evaluation moved to the end of the build. The generated applications had usable core functionality, with remaining defects to repair. A harness needs to adapt to model capabilities, and its complexity should be judged by task outcomes.

<h3 id="openai让-agent-能读取工程环境">OpenAI: make the engineering environment readable to agents</h3>

OpenAI's [engineering practice](https://openai.com/index/harness-engineering/) used a short `AGENTS.md` as an entry point, with architecture, plans, and conventions in repository documents that agents could retrieve. Each Git worktree had an independently runnable application and observability environment, allowing the agent to operate a browser and read logs and metrics.

Architecture rules also entered automated checks: lint and structural tests constrained module dependencies and returned violation locations with repair guidance. Conventions thus had both written explanations and execution-time feedback.

The dashboard can borrow this organization: an entry document supplies project structure and acceptance commands; detailed documents explain CSV fields and interaction conventions; failed tests return relevant rules and diagnostic locations.

In an internal beta-product experiment, OpenAI built a repository of roughly one million lines, including code, documentation, and tools. The team estimated development took about one-tenth the time of manual development. Humans still owned goals, acceptance, and feedback; the result does not establish the same delivery efficiency for arbitrary projects.

<h3 id="langchain沿执行记录查找失败原因">LangChain: use execution traces to locate failures</h3>

Keeping `gpt-5.2-codex` fixed, LangChain improved system prompts, tools, and execution controls. Its [Terminal-Bench 2.0 score](https://www.langchain.com/blog/improving-deep-agents-with-harness-engineering) rose from 52.8% to 66.5%, a gain of 13.7 percentage points, moving from outside the top 30 into the top five on the leaderboard at the time. These results apply to that evaluation's tasks and execution conditions.

The reusable approach is to inspect traces: does the agent finish too early, repeat attempts without progress, or leave insufficient time for verification? Harness changes can then target observed failures.

If export verification is skipped, an explicit pre-completion check is easier to evaluate than another instruction to “check carefully.” Its effectiveness still needs comparison on the same task set.

<h2 id="为什么这些工作需要一个名字">Why give this work a name?</h2>

Tool integration, business-rule analysis, state persistence, testing, and failure recovery existed before the term harness. Naming them brings these dispersed engineering activities into a common frame of discussion.

This also helps organizational communication. When managers equate model capability with product capability, they can underestimate the work of integrating business processes and verifying outcomes. A clear name helps explain where time goes, what resources are needed, and why a successful demonstration is not yet a deliverable. In that sense, it also serves “managing up”: calibrating expectations and making engineering investment visible.

A name alone does not establish value. The explanation still needs concrete answers: what capability was added, which failures were reduced, and how the effect was verified. Terminology should help explain the work rather than replace the explanation.

<h2 id="总结">Summary</h2>

(1) Prompt, context, and harness engineering cover progressively broader scopes. Instructions explain the goal, context supplies the information needed now, and the harness organizes execution, state, and feedback.

(2) A complete task needs acceptance based on actual results. Check evidence and update state after each action, retain failure causes, and bound retries and exits.

(3) Design the harness around observed failures. Add missing verification, state, or recovery capabilities first, then use task outcomes to decide whether more orchestration is needed. Revisit these structures when the model changes.

{% endraw %}
