# Code Review: `feature/add-finch-support`

## Scope / Diff Summary

- Branch: `feature/add-finch-support`
- Commit: `0732c96` (“Add Finch container client support”)
- High-level changes:
  - Adds a new `FinchClient` (Finch/nerdctl-based) and `FinchComposeClient`.
  - Adds Finch-specific Zod schemas + normalization for list/inspect/events.
  - Exposes the new clients via `packages/vscode-container-client/src/index.ts`.
  - Updates integration tests to allow `CONTAINER_CLIENT_TYPE=finch`.
  - Minor `package-lock.json` metadata updates (`"peer": true` entries).

## What Looks Good

- **Good reuse of existing abstractions:** `FinchClient` extends `DockerClientBase`, keeping the surface area small and leveraging existing argument builders and command patterns.
- **Explicit documentation of Finch/nerdctl differences:** clear comments around event stream limitations and the `--expose` / `--publish-all` gap.
- **Schema-first parsing:** using Zod schemas for Finch outputs is consistent with the rest of the repo and helps contain CLI drift.
- **E2E plumbing:** tests are updated to include Finch as a selectable runtime without forcing it into default execution (integration tests are opt-in).

## High-Priority Issues (Recommend Fix Before Merge)

### 1) `parseEventTimestamp` relative-time math is inverted

File: `packages/vscode-container-client/src/clients/FinchClient/FinchClient.ts`

- The docstring says:
  - `"1m"` means **in the past**
  - `"-1s"` means **in the future**
- Current logic computes `now + amount * multiplier`, which makes `"1m"` land **in the future**, causing the `since` filter to drop all events.

Recommendation:
- Use `now - amount * multiplier` (so positive durations mean “ago”; negative durations mean “in the future”), matching the intent used elsewhere in tests (e.g. `since: '1m', until: '-1s'`).

### 2) Inspect parsing likely breaks for multi-target inspect calls

Files:
- `packages/vscode-container-client/src/clients/FinchClient/FinchClient.ts` (inspect containers/images/networks/volumes)

Context:
- `DockerClientBase` adds `--format "{{json .}}"` to `* inspect` commands, which typically yields **one JSON object per line** when inspecting multiple targets.
- Finch parse functions currently do `JSON.parse(output)` and handle `Array` vs single `object`, but **do not handle newline-separated multiple JSON objects**.

Impact:
- `inspectImages({ imageRefs: [...] })`, `inspectContainers({ containers: [...] })`, etc. may fail when passed multiple refs (depending on Finch/nerdctl’s `--format` behavior).

Recommendation (pick one):
- **Option A:** Override the `getInspect*CommandArgs` methods for Finch to omit `--format` and rely on the default JSON array output (if Finch/nerdctl returns arrays by default).
- **Option B:** Make parsing tolerant:
  - Try `JSON.parse(output)` first.
  - If that fails, fall back to `output.split('\n')` and parse per-line JSON (same as `DockerClientBase`).

### 3) Shell injection / portability risks in `readFile` and `writeFile`

File: `packages/vscode-container-client/src/clients/FinchClient/FinchClient.ts`

- Both overrides use `bash -c "<string>"` with interpolated values (`this.commandName`, `options.container`, `options.path`).
- Even though these are quoted with `"..."`, a container name/path containing `"` or shell metacharacters can still cause incorrect behavior.
- This also assumes `bash`, `mktemp`, and `tar` exist on the host environment.

Recommendation:
- Avoid `bash -c` where possible:
  - Prefer invoking `finch cp` with argv arrays and do tar/mktemp in Node, or
  - Use `/bin/sh -c` with robust escaping via `ShellQuotedString` (matching patterns already used in `DockerClientBase` for exec/stat/list).
- At minimum: explicitly document platform assumptions (Finch is typically macOS) and harden quoting.

## Medium-Priority Improvements (Should Follow Soon)

### 1) Fix incorrect override parameter types

File: `packages/vscode-container-client/src/clients/FinchClient/FinchClient.ts`

- `parseInspectNetworksCommandOutput` and `parseInspectVolumesCommandOutput` declare `options` as `List*CommandOptions` types, but they override `Inspect*` parsing methods.
- It compiles today (because `options` is unused), but it weakens type safety and is confusing for future maintenance.

Recommendation:
- Align parameter types with the base class (`InspectNetworksCommandOptions`, `InspectVolumesCommandOptions`).

### 2) “Epoch” fallbacks (`new Date(0)`) may produce misleading UX

Files:
- `packages/vscode-container-client/src/clients/FinchClient/FinchListContainerRecord.ts`
- `packages/vscode-container-client/src/clients/FinchClient/FinchListImageRecord.ts`
- `packages/vscode-container-client/src/clients/FinchClient/FinchInspectVolumeRecord.ts`

Observation:
- Several normalizers use `new Date(0)` when the CLI omits or malforms timestamps.

Recommendation:
- If the CLI output should always include a timestamp in strict mode: fail in strict mode instead of silently returning epoch.
- If missing timestamps are expected: consider using `new Date()` (less misleading than 1970) or a documented sentinel strategy. For inspect volume, also validate `new Date(CreatedAt)` isn’t `Invalid Date`.

### 3) Volume label parsing drops label strings

Files:
- `packages/vscode-container-client/src/clients/FinchClient/FinchClient.ts` (listVolumes parsing)
- `packages/vscode-container-client/src/clients/FinchClient/FinchInspectVolumeRecord.ts`

Observation:
- `Labels` can be a string in Finch output (including potentially `key=value` pairs), but the implementation treats *any* string as “no labels” (`{}`).

Recommendation:
- If labels are emitted as `key=value,...`, parse via `parseDockerLikeLabels`.
- If Finch emits `""` specifically for no labels, treat only `""` as empty.

### 4) Deduplicate size parsing logic

File: `packages/vscode-container-client/src/clients/FinchClient/FinchListImageRecord.ts`

- There’s an existing `tryParseSize` utility in `DockerClientBase`.

Recommendation:
- Reuse `tryParseSize` to reduce divergence and ensure consistent unit handling across clients.

### 5) Event filters: labels are silently ignored

Files:
- `packages/vscode-container-client/src/clients/FinchClient/FinchClient.ts`

Observation:
- `getEventStream` options include `labels`, but Finch doesn’t implement label filtering.

Recommendation:
- Either document that labels are unsupported for Finch, or implement best-effort filtering if the event payload provides label data.
- Consider rejecting with a clear `CommandNotSupportedError` when `labels` are provided (to avoid surprising “filters do nothing” behavior).

## Testing Notes

- Ran locally:
  - `npm run --workspace=@microsoft/vscode-container-client build`
  - `npm run --workspace=@microsoft/vscode-container-client lint`
  - `npm test --workspace=@microsoft/vscode-container-client` (unit tests; integration tests are opt-in and destructive)

## Lockfile Note

- `package-lock.json` changed only by adding `"peer": true` metadata in several entries.
- If this wasn’t intentional, consider reverting the lockfile chunk to keep the PR focused.

## Suggested Follow-ups

- Add unit tests around Finch-specific logic:
  - `parseEventTimestamp` (relative vs absolute time)
  - `parseContainerdTopic` mappings
  - `withFinchExposedPortsArg` behavior (including edge cases)
- Consider adding a small compatibility note in the package README about Finch platform expectations and supported CLI flags.

