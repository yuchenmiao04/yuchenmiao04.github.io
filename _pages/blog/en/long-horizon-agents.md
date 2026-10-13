---
layout: blog
lang: en
translation_slug: long-horizon-agents
title: 'Long-Horizon Agents: Sustaining Progress Until the Task Is Truly Complete'
permalink: /en/blog/long-horizon-agents/
description: From measuring long-horizon capability to the mechanisms behind action
  feedback, session handoff, goal control, experience memory, and reusable skills.
---

{% raw %}
Long-Horizon Agents: Sustaining Progress Until the Task Is Truly Complete

<h2 id="长程任务为什么容易中途失效">Why Long Tasks Break Down Midway</h2>

Later actions in a long task often depend on state established earlier. Fixing one bug can reveal another, and adding a feature requires checking that existing behavior still works. The task's path therefore changes with execution feedback.

Sustained progress requires retaining the objective, the current environment, strategies already tried, and verification results. If this information lives only in the current conversation, a context switch can lose it. Unclear acceptance conditions also make partial output easy to mistake for completion. A long-horizon agent needs a process that can be resumed, corrected, and checked against its requirements.

<h2 id="metr先明确长指什么">METR: First Define What “Long” Means</h2>

[METR's time horizon](https://metr.org/time-horizons/) uses the time a human expert takes to complete a task as the measure of task length. It first estimates human completion time for each task, then measures agent success and fits a curve relating success rate to task length.

The 50%-time horizon is the human task duration at which the fitted success rate is 50%. The 80%-time horizon uses a higher reliability requirement. Comparisons of long-horizon capability need to specify both the task distribution and the reliability threshold.

![METR: task duration and success rate jointly define the time horizon; the curve is illustrative](/images/blog/en/long-horizon-agents/01-metr.png)

This time measures task difficulty. It cannot be read directly as how long an agent can run autonomously, or taken to imply that it can perform every human job of the corresponding duration. The tasks mainly come from software engineering, machine learning, and cybersecurity.

Long tasks here also involve dependencies across steps. Independent small questions mainly increase throughput demands; sustained debugging of a complex system requires preserving earlier attempts and changes to the environment. METR provides an evaluation method, while the following mechanisms support actual progress.

<h2 id="react把行动接到真实反馈上">ReAct: Connect Actions to Real Feedback</h2>

[ReAct](https://arxiv.org/abs/2210.03629) alternates reasoning and action. The model chooses an action from its current context, a tool or environment executes it, and an actual observation returns to context. The model adjusts subsequent plans using that new observation.

![ReAct: the model generates an action, the environment returns an observation, and the model chooses the next step](/images/blog/en/long-horizon-agents/02-react.png)

The overall process is: current context → reasoning and action → environment execution → new observation → next step. Reasoning can appear between important actions; it need not be a fixed-format thought paragraph before every tool call.

This loop makes execution responsive to external changes. Preserving objectives across contexts, handing off progress, and recovering still require separate system design. The harness and goal mechanisms below add constraints and control at those points.

<h2 id="long-running-harness让下一次会话能够接手">Long-running Harness: Let the Next Session Take Over</h2>

[Anthropic's long-running harness](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) separates initial setup from later incremental execution. An Initializer first creates a feature list, startup script, progress file, and initial Git commit. Each subsequent Coding Agent session reads these records, chooses an unfinished feature, implements and verifies it, and leaves state that the next session can take over.

![Long-running harness: the first session creates external state; later sessions read it, make progress, and write it back](/images/blog/en/long-horizon-agents/03-harness.png)

The feature list preserves what must be accepted, the progress file records completed work and next-step clues, and Git preserves code changes and recoverable versions. A session must also check its current environment. A file saying that work is complete does not mean the environment remains usable. Starting the application and checking basic behavior before further development exposes problems left by the previous session early.

Limiting each session's scope, then verifying and recording before it ends, reduces the handoff of unfinished work. The original approach requires protecting the feature list and acceptance requirements and changing `passes` only after checks succeed, so requirements cannot be edited away to manufacture completion. The checks themselves must cover real user behavior.

Initializer and Coding Agent are roles in different stages, distinguished by their starting prompts in the original approach. The emphasis is a cross-session handoff protocol, not a requirement for two models to collaborate simultaneously. The approach was mainly validated around web application development; applying it elsewhere requires redefining state and acceptance.

<h2 id="codex-goal把完成条件保留在线程中">Codex Goal: Keep Completion Conditions in the Thread</h2>

[Codex Goals](https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex) store an objective as persistent thread state. The objective should specify the final outcome, verification evidence, and constraints that must remain intact. New evidence may change the route, but completion judgments should remain tied to that objective.

![Codex Goal: a persistent objective constrains multiple turns, evidence determines completion, and run conditions govern continuation](/images/blog/en/long-horizon-agents/04-codex-goal.png)

After a turn ends, the system continues only when all continuation conditions hold: the thread is idle, there is neither pending work nor queued user input, the goal remains active, and the budget allows it. The agent can choose its next step from the current result without asking the user to restate the objective after every intermediate outcome.

> An objective can specify four things: the desired outcome; the evidence used for acceptance; constraints that must not be violated; and how to stop when the budget runs out or external information is needed.

A persistent goal and project files have different responsibilities. The goal preserves why to continue and when the task is complete. Files, test results, and logs preserve the environment and evidence. A thread goal is not global memory and does not imply that other threads automatically share all its working state.

Goal achievement, budget exhaustion, and blocking conditions mean different things. Stopping establishes only that this execution has ended. Achievement can be declared only when evidence supports the completion conditions. The figure shows the control relationships described in public documentation, without assuming an undisclosed independent evaluator model.

<h2 id="claude-goal在尝试结束时检查目标">Claude /goal: Check the Objective When an Attempt Ends</h2>

[Claude Code's goal-based loop](https://claude.com/resources/articles/getting-started-with-loops) likewise requires explicit completion conditions. Its public description further specifies a stop check: whenever the executing agent attempts to stop, an evaluator model checks the user's conditions. If they remain unmet, work is sent back for continuation until the goal is reached or the configured iteration limit is hit.

![Claude /goal: after the executing agent tries to stop, an evaluator checks the conditions and decides whether to continue](/images/blog/en/long-horizon-agents/05-claude-goal.png)

This separates “the executing agent thinks it can stop” from “the goal check permits stopping.” Measurable conditions, such as a number of passing tests or a performance score, give the evaluator a clearer basis for judgment. A requirement like “make it better” leaves both continuation and termination ambiguous.

The evaluator still depends on evidence and evaluation criteria. It does not automatically eliminate omissions, incorrect judgments, or inadequate test coverage. Important requirements need checkable results, and the iteration cap should be treated as a cost boundary rather than proof of success.

A goal-based loop and a timed loop have different triggers. The former keeps iterating around the completion conditions of one task. Scheduled entry points such as `/loop` and `/schedule` trigger work again at a later time. Long tasks can combine the two, but completion should still be determined by objectives and evidence.

<h2 id="reflexion让下一次尝试使用上一次的经验">Reflexion: Let the Next Attempt Use the Previous Attempt's Experience</h2>

[Reflexion](https://arxiv.org/abs/2303.11366) adds textual experience memory between attempts. The Actor performs the task and produces a trajectory; the Evaluator provides feedback. Self-reflection combines that trajectory, feedback, and existing experience into a reflection, which is written to episodic memory for the next attempt.

![Reflexion: execution feedback becomes a reflection, and experience memory guides the next attempt](/images/blog/en/long-horizon-agents/06-reflexion.png)

The retry input therefore changes. The next execution receives both the original task and experience about where the previous attempt failed and how to adjust. Textual feedback in context influences decisions without updating model weights.

Reflections need to point to actions that can change. “The last attempt failed” carries little information. Recording the failure conditions, missing evidence, and locations to inspect next is more useful for correcting a strategy. This is a writing principle for applying the idea in a practical system.

Experience memory also needs limits on size and quality. A mistaken attribution, repeatedly reread, can keep misleading later attempts. Reflexion mainly studies how feedback and memory improve performance across attempts. This mechanism alone does not establish reliable recovery and acceptance for tasks spanning days.

<h2 id="memgpt让有限上下文访问外部记忆">MemGPT: Give a Finite Context Access to External Memory</h2>

[MemGPT](https://arxiv.org/abs/2310.08560) borrows hierarchical memory from operating systems, separating the main context currently visible to the model from external context. Main context contains system instructions, editable working context, and a FIFO queue of recent interactions. Retrievable history and archival material live outside it.

![MemGPT: the model works in finite main context and accesses external memory through functions and queue management](/images/blog/en/long-horizon-agents/07-memgpt.png)

Through function calls, the model edits working memory, searches history, or reads archives. Retrieved external material must enter main context as a result before the model can use it in its current decision. External storage capacity and currently visible information are different quantities.

As main context nears capacity, warnings, summaries, and queue eviction manage space. The original approach retains a recursive summary of earlier conversation and stores historical messages in searchable storage. Summaries preserve continuity; retrieval supplies details needed by the current step.

For long tasks, this suggests separating stable facts, recent working information, and full history. Stable information stays in working memory, recent information stays in the current queue, and further details are retrieved on demand. The actual division should follow the task.

MemGPT was mainly evaluated on long-document analysis and multi-session conversations. It provides memory management; execution recovery, objective preservation, and completion checks for long tasks still need complementary mechanisms.

<h2 id="voyager把成功行为积累成能力">Voyager: Accumulate Successful Behavior as Capability</h2>

[Voyager](https://arxiv.org/abs/2305.16291) organizes open-ended exploration in Minecraft through three main components. An Automatic Curriculum chooses tasks from the current state and exploration progress. A Skill Library stores and retrieves executable code skills. Iterative Prompting generates and revises programs using existing skills and feedback.

![Voyager: a curriculum chooses tasks, skills support execution, feedback revises code, and successful behavior enters the skill library](/images/blog/en/long-horizon-agents/08-voyager.png)

During execution, environment feedback, program errors, and self-verification results inform the next revision. Only successfully completed skills enter the library. They are indexed by embeddings of their descriptions for retrieval and composition in later tasks. Task outcomes also return to the curriculum module, influencing what to explore next.

Long-term operation can thus accumulate capability in an external skill library without fine-tuning model weights. Experience can be stored as textual reflection or callable code; code allows a solved subproblem to be reused directly. A Voyager skill is executable code behavior.

A separate GPT-4 critic performs self-verification against the current state and task, providing correction clues on failure. The original approach allows at most four code-generation rounds per task. If the task still fails, it moves to another task instead of retrying without end.

These results come from a specific game environment, and code skills depend on its API. The useful pattern connects task selection, feedback-driven revision, and accumulation of successful capabilities. Applying it to real engineering still requires new verification methods and skill boundaries.

<h2 id="这些机制分别保存了什么">What Each Mechanism Preserves</h2>

Objectives, facts about the environment, experience, and skills serve different purposes. They can be stored separately and combined for the current step. The mechanisms operate at the following points:

| Mechanism | Main object | Where it helps |
| --- | --- | --- |
| METR | Task length and success rate | Measures the difficulty of tasks a system can handle |
| ReAct | Current observations and action trajectories | Chooses the next step from environmental feedback |
| Long-running Harness | Feature list, progress, and code state | Lets later sessions resume work |
| Codex / Claude Goal | Objectives, completion conditions, and run boundaries | Governs continued execution and exit |
| Reflexion | Textual experience | Improves the strategy of the next attempt |
| MemGPT | Working memory, history, and archives | Retrieves information needed for the current decision |
| Voyager | Executable code skills | Reuses successful behavior and supports further exploration |

An engineering system can preserve a persistent objective, advance a project through incremental sessions, turn feedback into experience, and retrieve details from external memory. A skill library suits stable behavior worth calling repeatedly.

This combination is a design synthesis. Each line of work validates its own mechanisms and settings; the reliability of the combined system still needs fresh evaluation.

<h2 id="怎样确认持续运行带来了进展">How to Check That Continued Execution Produces Progress</h2>

First, check the objective. New findings may change the plan, but must not quietly narrow acceptance. A completion record should correspond to the original requirements and provide verification evidence.

Then, check state. When resuming, verify file versions, the environment, and actual artifacts. Records describe past observations; important facts still need confirmation in the current environment. Resolve conflicts before proceeding.

Finally, check progress. New artifacts, verification results, reusable experience, or a confirmed external wait can support subsequent decisions. Repeated plans or the same failure across turns call for a changed method, more information, or an explicit reason to stop.

Evaluation should record completion rate, cost, human intervention, and recovery behavior using comparable tasks, tool conditions, and budgets. Running longer does not itself establish improved capability.

<h2 id="总结">Summary</h2>

(1) Long-horizon capability must be understood in terms of both task difficulty and reliability. METR provides one measurement approach; runtime alone cannot establish task-completion capability.

(2) Sustained progress requires continuity of objectives, environment state, and experience. ReAct connects actions and feedback. A harness manages session handoff. Goals specify completion conditions and continuation control. Reflexion and MemGPT support experience use and memory management respectively.

(3) Long-term work can also accumulate reusable capability, as Voyager's code skill library illustrates. Whatever combination is used, the final check remains the same: has the original objective been achieved, and is the current evidence sufficient to support that conclusion?
{% endraw %}
