#think

Follow this steps to achieve the task:

# rules

- [MANDATORY] When asked to follow instructions step by step, break down the task into clear steps, selecting the appropriate tools and fallbacks (multiple if needed) from your tool list for each step.
  - ools are in `.github/.knowledge_base/0-tool_usage/1-simple_tool_list.md`.
  - You will also find more information about each tool in `.github/.knowledge_base/0-tool_usage/tools_and_mcps.md`.
- [MANDATORY] Always prefer tools that are specialized for the task at hand, rather than general-purpose tools.
- [MANDATORY] You are obliged to #think and `optimize tool selection`[^1] before executing any task where tools are not explictly set.

# tasks

## setup task

1. Check the git repository remote. it should be this

    - `git remote get-url origin`
    - if not, set it to this: `git remote set-url origin https://github.com/lucasgaldinos/mcp-server-deep-code-reasoning-mcp`
    - it should point to my forked repository.
    - create the pull request after pushing the changes.
    - approve the pull request and merge it.

---

#think

Follow this steps to achieve the task:

# rules

- [MANDATORY] When asked to follow instructions step by step, break down the task into clear steps, selecting the appropriate tools and fallbacks (multiple if needed) from your tool list for each step.
  - The available tools are in `.github/.knowledge_base/0-tool_usage/1-simple_tool_list.md`.
  - You will also find more information about each tool in `.github/.knowledge_base/0-tool_usage/tools_and_mcps.md`.
- [MANDATORY] Always prefer tools that are specialized for the task at hand, rather than general-purpose tools.
- [MANDATORY] You are obliged to #think and `optimize tool selection`[^1] before executing any task where tools are not explictly set.

#request_copilot_review Analyze this repository, then:

1. for any patterns, disorganized configuration, non-standard-software patterns.
   - also read the `.github/.knowledge_base/2-software_and_patterns.md` to identify any patterns or anti-patterns.
   - register the findings in a `TODO.md` file
2. Add to #file:README.md : What is the difference between:
    - Running `node dist`, `node dist/index.js`?
    - Can I also use npx or other executables?
3. update your #memory with these findings. See if there's anything relatable, but REALLY RELATABLE. If there is, create relations of it.
4. Proceed to apply the changes.
