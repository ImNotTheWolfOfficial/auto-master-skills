# Recover an interrupted run

Recompute the run's repository, worktree and original roadmap identity using the run-ID inputs in the skill body. Select the matching run suffix before opening its private records. If the identity differs or several runs match, establish which run belongs to this checkout first. Keep a distinct run's records separate.

Compare the roadmap, branch, HEAD and current dirty diff with the last checkpoint and completed receipts. Reconcile partial edits and any gate whose outcome was never recorded. Recover the in-flight slice, its baseline receipt, attempt count and prior failure signature. Charge the interrupted attempt and apply the circuit breaker before another try.

Continue from the verified `RESUME:` action. Investigate mismatches before proceeding.
