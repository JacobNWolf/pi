# ACP upstream plan (fork)

Fork: [JacobNWolf/pi](https://github.com/JacobNWolf/pi). Upstream: [earendil-works/pi](https://github.com/earendil-works/pi).

Proposal: [Discussion #4444](https://github.com/earendil-works/pi/discussions/4444#discussioncomment-17580096).

This document tracks fork implementation and stacked upstream PRs. User-facing ACP docs land in `acp.md` (PR 9).

## Problem

Pi already has headless embedding via `--mode rpc`. That works, but every editor must speak Pi's private JSONL dialect.

ACP is becoming the shared editor ↔ agent stdio contract (Zed, JetBrains, others). The community adapter [`svkozak/pi-acp`](https://github.com/svkozak/pi-acp) lists Pi on the ACP agents page by spawning `pi --mode rpc` and translating. That proves demand, but the bridge has structural limits:

- no client FS / terminal delegation (breaks SSH/WSL/remote + unsaved buffers)
- no real `session/request_permission` path into the IDE
- MCP from `session/new` is accept-and-ignore
- dual session identity (`session-map.json` vs Pi session files)
- version skew forever between adapter and Pi RPC

Pi already owns the hard parts (session loop, tools, persistence, extensions). What's missing is a first-party transport, not another product surface.

## Why core (not an extension)

Extensions can register tools, hooks, commands, and providers, but they cannot own process stdin/stdout framing or register a CLI run mode. RPC is already a core mode for that reason; ACP is the same kind of thing: another I/O adapter over `AgentSession` / `AgentSessionRuntime`.

An external adapter can only approximate ACP by shelling into RPC. A native mode can call the session directly and override tool backends (`ReadOperations` / `WriteOperations` / `BashOperations` already exist for this).

This does not replace RPC. RPC stays the Pi-native embed API. ACP is the standard editor protocol.

## Architecture

```
editor (Zed / JetBrains / ...)
  ↕ ACP JSON-RPC stdio
pi --mode acp
  ↕ in-process
AgentSession / AgentSessionRuntime  (same as RPC/interactive/print)
```

Not:

```
editor → pi-acp → pi --mode rpc → AgentSession
```

## Minimalism / dependencies

- Pin `@agentclientprotocol/sdk@1.2.1` (exact version; normal lockfile/shrinkwrap review).
- Keep code under `packages/coding-agent/src/modes/acp/` (parallel to `modes/rpc/`).
- Gate behind an experimental flag until PR 9; unfinished ACP must not become default CLI behavior.
- Advertise only capabilities implemented in each PR.

If the SDK cost is a blocker, fall back to a thin hand-rolled JSON-RPC subset for required methods only.

## Product defaults (ACP mode only)

- **Ask/Code** session config for IDE tool permissions: `session/request_permission` in Ask; auto-allow in Code. Default Ask in ACP mode only. Does not add a global permission system to interactive Pi.
- Prefer client FS/terminal when the client advertises those capabilities; fall back to local ops otherwise.
- Mid-turn prompts map to Pi `steer`, not a client-side queue.
- Honest capability flags (do not advertise MCP/FS/load until implemented).

## Implementation layout

| Piece | Location |
|-------|----------|
| Mode entry | `src/modes/acp/` (parallel to `modes/rpc/`) |
| CLI wiring | `src/cli/args.ts`, `main.ts` |
| User docs | `docs/acp.md` (PR 9) |
| Tests | `test/suite/regressions/` |

## Upstream PR outline

Each PR must pass `npm run check` and `./test.sh`. Do not edit `CHANGELOG.md` in PRs. Stack in order; cherry-pick from this fork's `acp` branch into branches based on current `upstream/main`.

| PR | Branch | Scope |
|----|--------|-------|
| 1 | `acp/01-plumbing` | Dep + `--mode acp` stub + `initialize` (experimental gate) |
| 2 | `acp/02-session-loop` | `new` / `prompt` / `cancel` + event mapping (local tools) |
| 3 | `acp/03-ide-config` | Model / thinking `configOptions`, commands, auth |
| 4 | `acp/04-permissions` | Ask/Code + `request_permission` |
| 5 | `acp/05-persistence` | `load` / `list` / history replay + steer |
| 6 | `acp/06-client-fs` | Client FS + `additionalDirectories` |
| 7 | `acp/07-client-terminal` | Client terminal delegation |
| 8 | `acp/08-mcp` | MCP from `session/new` (may stay `mcpCapabilities: false` longer; separate design discussion) |
| 9 | `acp/09-docs-ungate` | `docs/acp.md`, tests, ungate |

## Open questions for maintainers

1. Is "another mode next to RPC" an acceptable core addition, or should ACP remain community-adapter-only?
2. Is `@agentclientprotocol/sdk` acceptable as a direct dep if pinned/reviewed, or prefer a minimal hand-rolled subset?
3. Should MCP-over-ACP be in-scope for native mode, or remain extension territory (`pi-mcp-adapter`) with `mcpCapabilities` false?
4. For ACP-only Ask mode permissions: any objection to IDE permission prompts that do not change interactive Pi's trust/security model?

## Contribution gate

Per [CONTRIBUTING.md](../../../CONTRIBUTING.md):

1. Proposal is in [Discussion #4444](https://github.com/earendil-works/pi/discussions/4444#discussioncomment-17580096).
2. Wait for maintainer approval (`lgtm` or explicit thumbs-up on direction) before opening PRs.
3. Use [Discord](https://discord.com/invite/3cU7Bz4UPx) for time-sensitive follow-up.

## Fork branch layout

| Branch | Purpose |
|--------|---------|
| `main` | Tracks `upstream/main`; fork-only docs (README banner, this file) |
| `acp` | Integration branch for all ACP work |
| `acp/NN-*` | Short-lived branches per upstream PR |

Sync regularly:

```bash
git fetch upstream
git checkout main && git merge upstream/main
git checkout acp && git merge main
```

## Status

- [x] Upstream proposal posted ([Discussion #4444](https://github.com/earendil-works/pi/discussions/4444#discussioncomment-17580096))
- [ ] Maintainer approval on direction
- [ ] PR 1: plumbing (gated stub)
- [ ] PR 2: session loop
- [ ] PR 3: IDE config
- [ ] PR 4: permissions
- [ ] PR 5: persistence
- [ ] PR 6: client FS
- [ ] PR 7: client terminal
- [ ] PR 8: MCP
- [ ] PR 9: docs + ungate
