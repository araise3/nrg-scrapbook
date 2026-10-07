# NRG Shanghai passport data

`nrg_shanghai_accounts.json` contains the six event account IDs supplied by the
user, who confirmed the **AP client**. These are separate from the main accounts
in `src/lib/trackerLinks.json` and from `player_act_stats.json`.

Create a GitHub **repository secret** named exactly `HENRIKDEV_API_KEY`, with
the Henrik API key as its value: **Settings → Secrets and variables → Actions →
New repository secret**. The collector and workflow already use that exact name.
For local execution, provide the same name as an environment variable.

Run `python data_prep/fetch_nrg_shanghai.py`. The `Collect NRG Shanghai diary`
workflow runs the collector inside Actions and returns `nrg-shanghai-diary` as
an artifact. It has read-only repository permissions and does not deploy or
commit results. It is published on `codex/nrg-shanghai-data`, separately from
the unfinished site redesign. A push touching its collector/config/workflow
starts a collection; `workflow_dispatch` is also defined. Download the
`nrg-shanghai-diary` artifact, validate it, then copy its JSON into
`public/data/nrg_shanghai.json` for the local preview. The API key remains in
Actions and never goes into the frontend or the downloaded data.

First collection succeeded on 2026-10-07 at 11:36 UTC:
[Actions run 37614216288](https://github.com/araise3/nrg-scrapbook/actions/runs/37614216288).
All six accounts resolved, with 165 account-game appearances across 97 unique
competitive lobbies: ethan 29, skuba 4, mada 41, brawk 43, keiko 42, bonkar 6.
The returned coverage spans 2026-09-11 to 2026-10-06 (individual ranges differ),
with no unreadable games or paging-limit truncation. This describes the API's
available history, not a guarantee that Riot retains every old game.

The collector sums raw match counters using the existing Act-stat calculations,
pages up to 300 competitive games per account and resumes at a cached match ID.
It does not stop at an Act boundary: the supplied accounts are the dedicated
Shanghai accounts. Each page reports its actual collected date coverage; no
arrival date is assumed. Partial coverage is flagged if paging hits the cap.
Failures preserve existing results and timestamps rather than inventing zeroes.

Lobby records retain match ID, date, queue, PUUID, Riot ID and team ID. The UI
matches PUUIDs against the curated pro registry and the supplied NRG accounts.
It counts teammates and opponents separately, deduplicates matches and never
guesses an identity from a similar display name. The frontend excludes all six
NRG passport members from Familiar Faces, including their saved main accounts.
Pros on unlisted event accounts will be absent until those identities are
verified and added.

Account-region metadata is not used to reject exact lobby identities. A targeted
[audit run](https://github.com/araise3/nrg-scrapbook/actions/runs/37616262088)
verified match `00b01706-b209-4c39-b894-a3a2752db7b3` on 2026-09-28:
Henrik's match metadata reports `region: ap`, `cluster: Hong Kong`, with mada
on Blue and `JAWGEMO#MANGO` on Red. Jawgemo's PUUID exactly matches the curated
registry, while the current account lookup still reports `region: na`. The
encounter is supported by the actual match; these responses do not establish
why the account and match region labels differ. Do not claim a region transfer
or temporary event access without additional evidence.

Offline checks: `python data_prep/test_nrg_shanghai.py`.
