# Best Practices for 3-Layer Architecture

To maximize the reliability of your AI operations, follow these optimization principles:

## 1. Directive Optimization
- **Be Explicit**: Directives should read like SOPs for a human. If a step feels ambiguous to you, it will be probabilistic for the AI.
- **Input/Output Tables**: Always define exactly what the script expects and what it will produce.
- **Version Control**: If a script changes significantly, update the directive immediately to reflect new capabilities.

## 2. Execution Script Standards
- **Silent Failures are the Enemy**: Always log errors to stderr or a log file in `.tmp/`.
- **Statelessness**: Try to make scripts stateless. Read from a file, write to a file (or cloud service). Avoid complex memory-resident states.
- **Environment Isolation**: Use `.env` for all keys. Never hardcode credentials.

## 3. The .tmp/ Workflow
- **Mirroring**: Use `.tmp/` for all intermediate states. This allows you to "restart" a process by looking at the last successful intermediate file.
- **Regenerative**: Assume `.tmp/` can be deleted at any time.

## 4. Self-Annealing Loop
> See canonical definition: [`directives/self_annealing.md`](./self_annealing.md)
> Do not duplicate the steps here — update self_annealing.md if the process changes.
