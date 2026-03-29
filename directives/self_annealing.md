# Self-Annealing Workflow

The "Self-Annealing" loop is how the system improves itself over time. When a deterministic script fails, the Orchestration layer (you) shouldn't just retry blindly. Follow this workflow:

## 1. Failure Detection
- Check exit codes of execution scripts.
- Monitor `.tmp/execution.log` for stack traces.

## 2. Root Cause Analysis
- Is it a transient error (e.g., 503 Service Unavailable)? -> **Retry with backoff.**
- Is it a data error (e.g., missing field in input)? -> **Check Directive for input validation rules.**
- Is it a logic error (e.g., unexpected API response)? -> **Update Execution Script.**

## 3. The "Fix & Update" Pattern
- **Step A: Fix the Script**. Manually or with AI assistance, fix the deterministic code in `execution/`.
- **Step B: Test the Script**. Run the script in isolation until it works.
- **Step C: Update the Directive**. Add a new "Edge Case" or "Error Handling" rule to the corresponding `.md` file in `directives/` to prevent future occurrences.

## 4. Verification
- Once fixed, log the fix to today's session log and close the fault entry in `AGENT_BRAIN/FAULT_LOG.md`.
- The system is now more robust for the next run.
