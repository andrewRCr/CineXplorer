# AI Workflow State Management

This document provides protocols for AI assistants to handle context management, session handoffs, and workflow state recovery.

## Session Initialization Protocol

### **MANDATORY**: Rules Acknowledgment
Before ANY work, AI must state:
```
"Acknowledging DEVELOPMENT-RULES v{current version}, hash {current hash}. I understand:
- Manual commit initiation: Never initiate commits without explicit approval
- Quality gates: Zero tolerance for test failures, linting violations, type errors
- Task protocol: One sub-task at a time with incremental quality checks
- Readiness reporting: Use standardized format from DEVELOPMENT-RULES.md"
```

### **REQUIRED**: Context Verification
Confirm access to essential documents:
1. **DEVELOPMENT-RULES.md** (v{current version}) - Core rules and protocols
2. **AI-SHARED.md** - Project context and standards
3. **META-PRD.md** - Product vision alignment
4. **PROJECT-STATUS.md** - Current progress state
5. **Current task list** (if resuming work)

### **RECOMMENDED**: Capability Statement
Briefly state understanding of:
- 3-step workflow (create-prd → generate-tasks → process-tasks)
- Incremental quality checking after each sub-task
- Standardized readiness reporting format
- PROJECT-STATUS maintenance protocol

## Context Handoff Protocol

### When Passing Work to Another AI Session
Create a handoff summary in this format:

```markdown
# AI Context Handoff Summary
**Date**: [timestamp]
**Session ID**: [if available]
**Handoff Reason**: [session limit, user request, etc.]

## Current Workflow State
- **Phase**: [create-prd | generate-tasks | process-tasks]
- **Active Document**: [path to current Sub-PRD or task list]
- **Feature Branch**: [current branch name, e.g., feature/user-profile-editing]
- **Last Completed**: [specific task/sub-task reference]
- **Next Action**: [what should happen next]

## Work in Progress
- **Modified Files**: [list any files with unsaved changes]
- **Quality Gate Status**: [any pending linting/test issues]
- **Commit Status**: [changes ready for commit or work incomplete]
- **Branch Status**: [clean working directory or pending commits]

## Context Notes
- **Key Decisions Made**: [important choices affecting implementation]
- **User Preferences Noted**: [specific instructions or preferences from this session]
- **Outstanding Questions**: [anything awaiting user clarification]

## Handoff Verification
Next AI should:
1. Acknowledge this handoff summary
2. Confirm access to all referenced documents
3. Verify understanding of current state
4. Ask user for permission to continue from specified point
```

### When Receiving a Handoff
1. **Acknowledge the handoff**: Reference the summary and confirm understanding
2. **Verify context access**: Ensure all referenced documents are available
3. **Check branch status**: Verify you're on the correct feature branch
4. **Confirm state**: Ask user to verify the handoff summary is accurate
5. **Request permission**: Explicitly ask approval to continue from the handoff point

## Mid-Session Context Recovery

### When Context Seems Lost
If you realize you may have lost context or violated established protocols:

1. **Stop immediately** - don't continue the current action
2. **Acknowledge the issue**: "I may have lost context or violated established protocols"
3. **Re-establish context**: Re-read DEVELOPMENT-RULES.md and current task list
4. **Seek clarification**: Ask user to confirm current state and expectations
5. **Resume with confirmation**: Only continue after user explicitly approves

### Context Consistency Checks
Periodically verify:
- Are you on the correct feature branch for the current work?
- Are you following the one-sub-task-at-a-time protocol?
- Are you running incremental quality checks after each sub-task?
- Are you updating task documentation immediately after completion?
- Are you using the correct readiness report format?

## Long Session Management

### Every 10-15 Sub-Tasks
1. **Summarize progress**: Brief update on completed work
2. **Verify alignment**: Confirm still following established patterns
3. **Check for drift**: Ask if any protocols need reinforcement
4. **Refresh critical rules**: Re-read DEVELOPMENT-RULES.md key sections

### Signs Context May Be Degrading
- Forgetting to run incremental quality checks
- Bundling multiple sub-tasks together
- Using non-standard reporting formats
- Initiating commits without approval
- Skipping task documentation updates

## Recovery Procedures

### Full Context Reset
If severe context loss occurs:
1. **Stop all work immediately**
2. **Re-read essential documents** in order:
   - DEVELOPMENT-RULES.md (acknowledge version)
   - AI-SHARED.md (project context)
   - Current task list (work state)
3. **Create recovery summary**: What was lost, what needs to be recovered
4. **User verification**: Confirm understanding before resuming
5. **Restart with clean state**: Begin from verified checkpoint

### Partial Context Reset
For minor context issues:
1. **Pause current sub-task**
2. **Re-read relevant workflow document**
3. **Confirm current position** in task list
4. **Ask user for state verification**
5. **Resume with renewed focus**

## Multi-AI Consistency

### When Working in Teams or Sequences
- **Always acknowledge** previous AI's work and handoffs
- **Follow established patterns** even if you might prefer different approaches
- **Maintain documentation consistency** in formatting and updates
- **Respect existing task granularity** and breakdown decisions
- **Continue commit message patterns** and reference styles

### Version Synchronization
- **Check rules version** before starting any work
- **Confirm hash matches** expected value (a7f3d9e2 for v2.0)
- **Ask for update** if versions don't match
- **Never assume** rules are the same as previous experience

## Best Practices

### Context Preservation
- **Reference task numbers** when reporting progress
- **Maintain consistent terminology** throughout session
- **Update documentation immediately** to preserve state
- **Use established formats** for all communications

### Proactive Management
- **Set internal checkpoints** every few sub-tasks
- **Monitor for protocol drift** and self-correct
- **Ask clarifying questions** rather than making assumptions
- **Maintain explicit approval loops** with user

### Quality Assurance
- **Verify each step** against documented workflows
- **Cross-reference decisions** with META-PRD and PROJECT-STATUS
- **Maintain readiness report consistency**
- **Preserve user preferences** across session boundaries

---

**Remember**: This system prioritizes human control and understanding over AI automation. Context management serves to maintain consistency and quality while preserving the deliberate human oversight built into the workflow system.