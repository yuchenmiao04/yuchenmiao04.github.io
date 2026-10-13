---
layout: blog
title: 'Progressive Disclosure for Skills: On-Demand Loading in Pi and DeepSeek Harness'
permalink: /en/blog/skill-progressive-disclosure/
description: How skill catalogs, instructions, and references enter model context
  in layers, through the implementations of Pi and DeepSeek Harness.
lang: en
translation_slug: skill-progressive-disclosure
---

{% raw %}
<h2 id="两个问题">Two Questions</h2>

An agent can have many skills installed, while any given task usually needs only a few. Loading every procedure and reference into context at startup would burden every task with irrelevant material. Progressive disclosure lets the model first learn which capabilities are available, then load their details as the task requires.

This raises two questions: how do the layers of a skill enter context? And if the model has only read its `description`, how does it know to read `SKILL.md` next?

The overall sequence is: discover skills → provide a catalog and loading rules → assess the task match → call a tool → add the instructions to context. Pi and DeepSeek Harness both follow this sequence, but differ in where the catalog appears, how paths are exposed, and which tool loads the instructions.

<h2 id="pi通过-read-读取-skill">Pi: Loading a Skill with read</h2>

<h3 id="发现技能构造目录">Discover Skills and Build a Catalog</h3>

The host first scans skill directories, such as a project's `.agents/skills/`. The actual search paths also depend on the harness configuration; this example is not the only entry point.

After discovering skills, Pi organizes their `name`, `description`, and `location` into a catalog and adds it to the system prompt. These fields answer three questions: what is the skill called, which tasks does it serve, and where are its instructions?

The following illustrates the catalog structure:

```xml
<available_skills>
  <skill>
    <name>translate</name>
    <description>Translate text using the project's terminology and language conventions</description>
    <location>/project/.agents/skills/translate/SKILL.md</location>
  </skill>
</available_skills>
```

The model can now see the skill's purpose and location, but it has not yet received the translation procedure. The `description` supports selection; the operational steps remain in the body.

Here, “load metadata first” means putting metadata into model context first. To parse frontmatter, the host may already have read the entire file from disk. [Pi's discovery logic](https://github.com/earendil-works/pi/blob/ce950d78f424dcaf9f5d6a03ce80ab141130eb1d/packages/coding-agent/src/core/skills.ts#L277) does exactly that, reading the full file before extracting the catalog fields. A file being read by the host and its contents being visible to the model are two different events.

<h3 id="加载规则把-description-与工具连接起来">Loading Rules Connect the Description to a Tool</h3>

A catalog alone does not explain how to proceed. Pi also provides an explicit rule: when a task matches a skill's description, use the `read` tool to read its file.

The rule has three parts: the trigger is a task matching the `description`; the action is a `read` call; the target is the file specified by `location`. The information needed to move on to the instructions therefore comes from the catalog, the trigger rule, and the available tool together.

A call follows this schematic sequence:

```text
LLM determines that the task needs translate
    -> read({ path: "/project/.agents/skills/translate/SKILL.md" })
Host reads the file
    -> adds its contents to context as a tool result
LLM uses the instructions to decide the next action
```

![Pi: the catalog and rules enter context first; instructions return as a tool result](/images/blog/en/skill-progressive-disclosure/01-pi-loading.png)

The model judges relevance and generates the tool call. The host reads the file and returns the result. A `description` does not execute a load, and a file does not become model input merely because it exists on disk.

Automatic selection can still miss a relevant skill or choose the wrong one. Descriptions should clearly state the applicable tasks and triggers so that the model can distinguish neighboring capabilities. Test requests that should trigger a skill, requests that should not, and requests that are easy to confuse, then refine the boundaries.

<h2 id="三层内容三种加载时机">Three Layers, Three Loading Moments</h2>

The first layer is the skill catalog, primarily names and descriptions. The model learns which capabilities are candidates and decides whether the current task needs them.

The second layer is the body of `SKILL.md`, which provides procedures, constraints, and completion criteria. It loads after the task matches, giving the model specific instructions for carrying out this kind of work.

The third layer is material referenced by the instructions, such as detailed specifications, template notes, or supplementary guides in `references/`. The model reads these when it reaches the relevant step and needs the detail.

![Progressive disclosure: the catalog, instructions, and references enter context as needed](/images/blog/en/skill-progressive-disclosure/02-disclosure-layers.png)

For example, if the instructions reference `references/translate-guide.md`, reading `SKILL.md` does not also load that guide. Its relative path must first be resolved against the skill directory, and an appropriate tool must retrieve the contents. The instructions should explain when the guide is needed; otherwise, the material has merely been moved to another file.

Progressive disclosure therefore requires both content boundaries and conditions for entering the next layer. The catalog supports selection, the instructions support execution, and the references supply details needed at the current step. Whether to load more depends on the task.

The layers must also ensure that necessary information reaches the model. Core constraints that apply whenever the skill is used should remain in the instructions. Details for a particular branch can go in references, with explicit reading conditions. If a critical restriction is buried in a reference file with no trigger in the instructions, the model may act before it ever encounters the restriction.

<h2 id="deepseek-harness通过-skill-按名称加载">DeepSeek Harness: Loading by Name with skill</h2>

<h3 id="目录作为-user-role-消息进入-context">The Catalog Enters Context as a user-role Message</h3>

DeepSeek Harness (DSH) also discovers skills first, but the model-visible catalog contains only `name` and `description`. The host generates this catalog and adds it to the conversation as a user-role message.

This message is not an extra request manually sent by the user. It is a skill notice assembled by the harness for the model. An explicit rule accompanies the catalog: if the user names a skill, or the task clearly matches its description, call the `skill` tool to load its full instructions before performing the task.

The system prompt is part of context, and so are user-role messages. The comparison concerns the role under which the catalog enters model input. Even if the message body uses a `<system-reminder>` tag, the actual role is still determined by the message's `role` field.

<h3 id="名称交给工具路径由宿主解析">Pass the Name to the Tool; Let the Host Resolve the Path</h3>

Pi uses a general file-reading interface, so it must give the model the file path. DSH provides a dedicated `skill` tool; the model only needs to pass the exact name from the catalog:

```text
skill({ name: "translate" })
```

On receiving the call, the host looks up the registered skill by name and loads its instructions through the corresponding provider. The host handles the mapping from a name to a local file or other resource; the initial catalog need not expose the path to the model.

![DSH: the model requests a skill by name; the host resolves its source and returns the instructions](/images/blog/en/skill-progressive-disclosure/03-dsh-loading.png)

The result must give the model both the instructions and the location information needed to access references. In the [DSH implementation examined here](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/skill/tool-skill/src/index.ts#L81), a tool execution result contains the body in `content` and may also include a resource base in `resourceBase`. The host turns these into model-readable instructions and resource hints. For a filesystem skill, this base is its directory.

Thus, “the catalog has no location” only means that the path is absent from the initial candidate list. After loading the instructions, the model may still need the resource base to resolve relative references correctly. It no longer has to supply a file path in its loading request; the host resolves the name to the resource.

`skill({name})` is a loading request. Once the host executes it successfully and returns the instructions and resource hints, the model can use them on the next step. This does not automatically load the entire skill folder or run every script it contains. Nor does adding the body to context turn it into a system message.

<h2 id="两种实现的区别">How the Two Implementations Differ</h2>

| Dimension | Pi's read Path | DSH's skill Path |
| --- | --- | --- |
| Where the catalog appears | System prompt | User-role conversation message |
| Model-visible catalog fields | name, description, location | name, description |
| Model's loading request | read(path) | skill(name) |
| Information used to locate instructions | File path supplied by the catalog | Source looked up by name in the host |

The table compares Pi's general `read` loading path with DSH's dedicated `skill` path. The Pi code is pinned to `ce950d78`, and DSH to `ddefc45f`; the fields and interfaces refer to those implementations.

Where the catalog appears and how the tool locates the instructions are separate design dimensions. A user-role message can carry paths, and a system prompt can ask the model to call a tool that loads by name. Pi exposing `location` and DSH omitting the path from its catalog directly reflect the parameters their loading interfaces require.

General-purpose `read` reuses existing file-reading capabilities and makes the process direct. Dedicated `skill` consolidates name lookup, source resolution, and result formatting behind one interface. The former requires the model to supply a path in its call; the latter leaves the name-to-source mapping to the host. The choice depends on how the harness organizes tools and resources.

<h2 id="自动选择与显式加载">Automatic Selection and Explicit Loading</h2>

The preceding flow relies on the model to judge whether a task matches a description. The host can also provide an explicit loading entry point so that users can select a skill directly.

In the [Pi implementation examined here](https://github.com/earendil-works/pi/blob/ce950d78f424dcaf9f5d6a03ce80ab141130eb1d/packages/coding-agent/src/core/agent-session.ts#L2143), entering `/skill:translate` makes the host read the instructions directly and expand them into the user message. The model need not first decide whether to call `read`. DSH likewise supports commands such as `/translate` for skills that allow user invocation, with the host loading the instructions.

The natural-language request “please use translate” may take a different path from a loading command recognized by the host. The former can trigger a model tool call; the latter can let the host load the skill directly. Either way, reading references and running scripts still require subsequent tool calls, and execution depends on tool and environment permissions.

<h2 id="目录成本与更新边界">Catalog Cost and Update Boundaries</h2>

Progressive disclosure reduces the upfront loading of irrelevant instructions, but the catalog itself still occupies context. More model-visible skills and longer descriptions mean a larger candidate list. Descriptions should be sufficient to distinguish tasks, with operational procedures left to the instructions. Third-layer references should be read only when a relevant step requires them.

Updates also require a distinction between catalog and instructions. In the [DSH implementation examined here](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/skill/tool-skill/src/index.ts#L213), later model steps check the catalog. When model-visible names, descriptions, or membership change, the host appends a complete replacement catalog to the conversation and tells the model to use it. The old catalog remains in the history.

Changing only the instructions may leave the catalog unchanged. This implementation reads the current body when `skill` loads it again, but does not automatically rewrite the earlier tool result. “The file has been updated” and “current context contains the new instructions” are therefore different states. When new rules must apply, reload explicitly so that subsequent steps know which version to use. Actions already taken require a separate check.

<h2 id="总结">Summary</h2>

(1) Progressive disclosure controls when content enters model context: first the catalog, then the instructions, and finally references as needed. The host reading a file and the model receiving its contents must be understood separately.

(2) Moving from description to instructions requires explicit loading rules and an executable tool interface. Users can also select a skill through an explicit entry point. The `description` guides selection; the loaded instructions guide execution.

(3) Pi and DSH demonstrate two implementations: a general `read` tool called by path, and a dedicated `skill` tool called by name. Both require clear content boundaries at each layer and explicit conditions for entering the next.
{% endraw %}
