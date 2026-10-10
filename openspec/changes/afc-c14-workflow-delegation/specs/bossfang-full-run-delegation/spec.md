# Spec Delta

## ADDED Requirements

### Requirement: Ordinary workflows can target admitted UAR execution

An ordinary workflow step SHALL support an explicit bound UAR target and invoke complete delegated execution through the existing authenticated full-run authority. Native targets SHALL retain their existing execution behavior.

#### Scenario: UAR-bound ordinary step
- **WHEN** an authenticated operator runs an ordinary workflow with a UAR-bound step
- **THEN** the selected admitted UAR owns that step's execution, effects, approval and budgets, and BossFang retains workflow/run/step/delegation correlation and actual output.

#### Scenario: Native target remains native
- **WHEN** a workflow step selects an existing native agent target
- **THEN** its native workflow execution remains unchanged.

### Requirement: Dashboard controls the original delegated workflow run

The existing dashboard SHALL author the explicit target and display the delegated run's original identities, actual output, authoritative pending approval and cancellation state. Controls SHALL use the original admitted connection.

#### Scenario: Effect awaits approval
- **WHEN** UAR reports a pending host-issued approval for a workflow step
- **THEN** the dashboard presents that existing approval identity and submits its decision through the original delegated run control, without duplicating approval authority.

#### Scenario: Workflow cancellation
- **WHEN** the operator cancels an ordinary workflow with active delegated steps
- **THEN** BossFang forwards cancellation to those original UAR tasks and distinguishes cancellation acknowledgement, terminal state and unresolved cleanup.
