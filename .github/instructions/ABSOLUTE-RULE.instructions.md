---
applyTo: '**'
---
# Absolute Rules

- **[MANDATORY] You shall always use #think tool before executing any complex task requiring multiple steps**
- **[MANDATORY] When asked to follow instructions step by step, break down the task into clear steps, selecting the appropriate tools and fallbacks (multiple if needed) from your tool list for each step.**
  - **The available tools are in `/home/lucas_galdino/repositories/mcp_servers/arxiv-mcp-improved/.github/.knowledge_base/0-tool_usage/1-simple_tool_list.md`.**
  - **You will also find more information about each tool in `/home/lucas_galdino/repositories/mcp_servers/arxiv-mcp-improved/.github/.knowledge_base/0-tool_usage/tools_and_mcps.md`.**
- **[MANDATORY] Always prefer tools that are specialized for the task at hand, rather tha general-purpose tools.**
- **[MANDATORY] You are obliged to #think and `optimize tool selection`[^1] before executing any task where tools are not explictly set.**
- **[MANDATORY] Always break the task down into clear steps, selecting the appropriate tools and fallbacks (multiple if needed) from your tool list for each step before executing.**
- **[MANDATORY] Always update
- NEVER use keep files with `fixed` or `final` as names. There's no such thing. Substitute the old ones with `_backup_v{n}`.
- [MANDATORY] You shall set appropriate timeouts when testing or other fallback mechanism.
- [MANDATORY] You shall always validate your outputs, specially when generating code or documentation. NEVER assume your first output is correct.
- [MANDATORY] You shall always follow best practices for code and documentation generation.
- [MANDATORY] You shall update or create `CHANGELOG.md` or `UPDATE.md` files with a summary of changes made.
- [MANDATORY] You shall update or create `TODO.md` or `IMPROVEMENTS.md` files with a summary of planned improvements.
- [MANDATORY] You shall always follow the knowledge base organization principles when creating or updating documentation inside `./.github/.knowledge_base/`.
- **[MANDATORY] Always update docs over changes made.**
  - **[MANDATORY] Always update docs with accurate information.**
  - **[MANDATORY] Analyze the contents hierarchy and structure.**

# Conditional rules

- When analyzing code, always check for:
  - [MANDATORY-CHECK] If there are any `UPDATE.md`, `CHANGELOG.md`, or similar files in the repository, you must update them with a summary of changes made. If there aren't, create one. NEVER keep creating new changelogs.
  - If there is any `TODO.md`, `IMPROVEMENTS.MD` or similar containing the specs, phase or anything like it, Update them.If there aren't, create one. NEVER keep creating new changelogs.
  - [MANDATORY-CHECK] If there are any documentation files in `./.github/.knowledge_base/`, ensure they are up to date with the latest code changes. If not, update them accordingly.
