# hallucination-detector-agent SKILL

---
governed-by: ai-sdlc-governance
skill_version: 1.0.0
phase: quality-assurance
mode: autonomous-validation
---

## Overview

**hallucination-detector-agent** validates AI-SDLC agent outputs in real-time, catching hallucinations, inconsistencies, false claims, and logical errors before they propagate to production.

**Purpose:** Make Keel's 8 agents more reliable by detecting and flagging suspicious outputs.

**How It Works:**
1. Each Keel agent produces output
2. Detector automatically validates using 5 layers
3. Assigns confidence_score (0.0-1.0)
4. Flags issues for human review OR auto-applies safe improvements
5. Learns from failures to improve next time

**Integration:** Automatic after every agent completes (no extra setup)  
**Branch:** `keel/qa/hallucination-detector` (read-only)  
**Governance:** Full CLAUDE.md compliance

---

## What Is A Hallucination?

In the context of AI-SDLC agents, hallucinations include:

1. **Factual Errors**
   - Incorrect API endpoints or method signatures
   - Non-existent database tables or fields
   - False assumptions about dependencies
   - Wrong file paths or import statements

2. **Logical Contradictions**
   - Requirement conflicts ("Must have X" + "Must NOT have X")
   - Design inconsistencies
   - Test failures that don't match code
   - Circular dependencies

3. **Unsupported Claims**
   - "85% test coverage" but only 5 tests exist
   - "Zero performance impact" but adds 500ms latency
   - "Fully backward compatible" but breaks API
   - "Production-ready" but security audit failed

4. **Context Violations**
   - Using undefined variables
   - Calling non-existent functions
   - Schema violations
   - Boundary condition errors

5. **Knowledge Cutoff Errors**
   - Recommending deprecated libraries
   - Using outdated API versions
   - Suggesting obsolete patterns

---

## 5-Layer Detection System

### Layer 1: Syntax Validation

```
Agent Output
    ↓
Parse with language-specific parser
  - PHP: Check if code parses
  - JSON: Validate structure
  - SQL: Check query syntax
  - YAML: Check config format
    ↓
Confidence: 1.0 (pass) or 0.0 (fail)
```

**Detects:** Unparseable code, malformed JSON, invalid syntax

### Layer 2: Cross-Reference Validation

```
Agent Output
    ↓
Extract all references (classes, functions, tables, files)
    ↓
Verify against codebase
  - Class exists? ✓/✗
  - Method signature matches? ✓/✗
  - Table exists? ✓/✗
  - Field type matches? ✓/✗
    ↓
Confidence: 1.0 - (hallucinations × 0.1)
```

**Detects:** Non-existent classes, wrong field names, invalid imports

### Layer 3: Logic Validation

```
Agent Output
    ↓
Check for contradictions
  - Requirement conflicts?
  - Circular dependencies?
  - Circular reasoning?
  - Impossible conditions?
    ↓
Confidence: 1.0 - (contradictions × 0.2)
```

**Detects:** Logic errors, impossible conditions, conflicts

### Layer 4: Claim Validation

```
Agent Output
    ↓
Extract all measurable claims
  - "85% coverage" → Verify from actual metrics
  - "2ms latency" → Check benchmarks
  - "No breaking changes" → Run compat tests
    ↓
Confidence: 1.0 - (false claims × 0.2)
```

**Detects:** Inflated metrics, unrealistic claims, unsupported promises

### Layer 5: Pattern Detection

```
Agent Output
    ↓
Match against learned patterns
  - "dev-agent hallucinates field names" (15% error rate)
  - "test-agent inflates coverage" (8% error rate)
  - "design-agent oversimplifies" (5% error rate)
    ↓
Confidence: confidence × adjustment_factor (0.7-1.0)
```

**Detects:** Agent-specific tendencies, recurring mistakes

---

## Confidence Scoring

```
base_score = 1.0

Penalties applied for each finding:
  - Syntax error: -0.3 per error
  - Reference hallucination: -0.1 per ref
  - Logic contradiction: -0.2 per contradiction
  - Unsupported claim: -0.2 per claim
  - Pattern match: × (0.7 to 1.0) depending on pattern

confidence_score = max(0.0, base_score)

Interpretation:
  >= 0.85: HIGH (continue to next phase)
  >= 0.70: MEDIUM (needs human review)
  < 0.70: LOW (flag for fixing)
```

---

## Output Schema Extension

Every agent output gets enhanced with:

```json
{
  "original_output": { /* agent's output */ },
  
  "validation": {
    "detector_version": "1.0.0",
    "timestamp": "2026-07-07T10:30:00Z",
    
    "layers": [
      {
        "name": "syntax_validation",
        "status": "pass",
        "confidence": 1.0
      },
      {
        "name": "cross_reference_validation",
        "status": "fail",
        "confidence": 0.85,
        "findings": [
          {
            "type": "hallucinated_field",
            "message": "Field 'stripe_payment_id' doesn't exist",
            "suggestion": "Change to 'stripe_account_id'",
            "severity": "high"
          }
        ]
      }
    ],
    
    "confidence_score": 0.85,
    "confidence_level": "medium",
    "total_findings": 1,
    "blocked": false,
    "recommendation": "review_findings"
  }
}
```

---

## Integration with Keel Agents

### Automatic Flow

```
/keel init        → init-agent output
                  → hallucination-detector validates
                  → confidence_score added
                  ↓
/keel brainstorm  → brainstorm-agent output
                  → hallucination-detector validates
                  → confidence_score added
                  ↓
/keel req         → req-agent output
                  → hallucination-detector validates
                  → confidence_score added
                  ↓
/keel design      → design-agent output
                  → hallucination-detector validates
                  → confidence_score added
                  ↓
/keel dev         → dev-agent output
                  → hallucination-detector validates
                  → confidence_score added
                  → IF low: flag in dashboard
                  → IF high: continue
                  ↓
/keel test        → test-agent output
                  → hallucination-detector validates
                  → coverage claims verified
                  ↓
/keel sec         → sec-agent output
                  → hallucination-detector validates
                  → findings verified
                  ↓
/keel deploy      → deploy-agent output
                  → hallucination-detector validates
                  → safety checks pass before deploy
```

### Lane2 Gate Integration

```
Lane2 Gate (Phase X → Phase X+1):

BEFORE:
  lane2_ready = (agent_passed_self_checks)

AFTER (with detector):
  lane2_ready = (agent_passed_self_checks AND confidence_score >= 0.70)

Result:
  - High confidence output → Auto-proceed
  - Medium confidence → Human review queue
  - Low confidence → Blocked, needs fixing
```

---

## Usage Examples

### Example 1: Detecting Field Name Hallucination

**dev-agent generates:**
```php
public function sync(SubscriptionRepository $repo): void
{
    foreach ($repo->findAll() as $sub) {
        $invoice = Invoice::create([
            'stripe_payment_id' => $sub->stripe_account_id  // WRONG!
        ]);
    }
}
```

**Detector runs:**
```
Layer 2: Cross-Reference Validation
  ✗ Field 'stripe_payment_id' doesn't exist in Invoice model
  ✓ Field 'stripe_account_id' found in schema
  
Finding: Hallucinated field name
  Severity: HIGH
  Suggestion: Change to 'stripe_account_id'
  
Confidence: 0.85 (MEDIUM - needs review)
```

**Result in dashboard:**
```
Issue flagged → Engineer clicks "Fix" → Suggestion applied → Re-runs detector
Re-validation: Confidence 0.98 (HIGH) → Continues to test-agent
```

---

### Example 2: Detecting Inflated Test Coverage

**test-agent claims:**
```json
{
  "coverage": 0.87,
  "coverage_type": "statement",
  "tests_written": 5,
  "status": "pass"
}
```

**Detector runs:**
```
Layer 4: Claim Validation
  Claim: "87% coverage with 5 tests"
  Reality: 5 tests ≈ 20-30% coverage realistically
  
Finding: Coverage claim inflated
  Claimed: 87%
  Realistic: ~28% with 5 tests
  
Confidence: 0.60 (LOW - blocked)
```

**Result:**
```
Blocked until engineer fixes coverage or test count
Engineer adds 20 more tests → Coverage rises to 85% realistically
Re-runs detector → Confidence: 0.95 → Continues
```

---

### Example 3: Detecting Logic Contradiction

**design-agent proposes:**
```
API Response:
  - "subscription is active" (true)
  - "payment is required" (false)
  - BUT: Logic says "if active, payment already made"
  
Detector finds: Contradiction
  Can't be: active=true AND payment_required=true
  
Confidence: 0.65 (LOW - needs clarification)
```

---

## Validation Checklist by Agent

### init-agent
- [ ] All directories created
- [ ] CLAUDE.md present (11 rules)
- [ ] agent-output-schema.json valid JSON
- [ ] Stack profile exists
- [ ] .gitignore configured
- Confidence target: >= 0.95

### brainstorm-agent
- [ ] All 5 concepts present
- [ ] Scores between 0-10 (realistic)
- [ ] No circular reasoning
- [ ] Convergence logic sound
- [ ] Trade-offs documented
- Confidence target: >= 0.85

### req-agent
- [ ] MUST requirements present
- [ ] AC are testable (Given/When/Then)
- [ ] No contradictions
- [ ] Risk assessment populated
- [ ] Metrics measurable
- Confidence target: >= 0.85

### design-agent
- [ ] API spec valid (parses correctly)
- [ ] Schema has constraints
- [ ] Endpoints match requirements
- [ ] Architecture makes sense
- [ ] Trade-offs documented
- Confidence target: >= 0.85

### dev-agent
- [ ] Code parses (PHP, JSON, etc.)
- [ ] Imports valid
- [ ] Method signatures match spec
- [ ] Queries match schema
- [ ] No hardcoded secrets
- [ ] Follows code style
- Confidence target: >= 0.85

### test-agent
- [ ] Tests run (no syntax errors)
- [ ] Coverage claims realistic
- [ ] Tests reference real code
- [ ] Mocks proportional
- [ ] Test assertions make sense
- Confidence target: >= 0.80

### sec-agent
- [ ] Findings reference real code
- [ ] Severity levels appropriate
- [ ] Dependencies in composer.json
- [ ] OWASP mappings accurate
- [ ] No obvious false positives
- Confidence target: >= 0.90

### deploy-agent
- [ ] 4-stage plan is logical
- [ ] Feature flags match code
- [ ] Rollback procedures valid
- [ ] Monitoring thresholds realistic
- [ ] Commands are valid
- Confidence target: >= 0.85

---

## Token & Memory Management

### Token Usage

```
Per validation cycle:
  Layer 1 (Syntax): ~50 tokens
  Layer 2 (Reference): ~100 tokens
  Layer 3 (Logic): ~100 tokens
  Layer 4 (Claim): ~150 tokens
  Layer 5 (Pattern): ~50 tokens
  ─────────────────────
  Total: ~450 tokens per agent output

Optimization:
  ✓ Local parsing (not LLM)
  ✓ Batch validations (100 outputs = 1 batch)
  ✓ Cache codebase snapshots
  ✓ Pattern DB in memory (not DB)

Result: <3% overhead on token budget
```

### Memory Persistence

**Saved automatically:**

```markdown
# hallucination_patterns.md
Type: project
Content:
  - Agent: dev-agent
    Pattern: Hallucinates field names
    Frequency: 15 cases
    Fix: Add field validation
    Success: 8% → 2% error rate
    
  - Agent: test-agent
    Pattern: Inflates coverage
    Frequency: 8 cases
    Fix: Realistic coverage cap at 0.95
    Success: Claims now accurate
```

**Purpose:**
- Track which agents have which issues
- Learn patterns over time
- Improve detector accuracy
- Suggest preventive measures

**Retention:** 90 days (auto-archived older)

---

## How It Learns

### Cycle 1: Detect Failure

```
dev-agent output with hallucinated field name
  → Detector flags it
  → Engineer fixes it
  → Pattern recorded: "dev-agent hallucinates field names"
```

### Cycle 2: Learn Pattern

```
Same pattern detected again
  → Memory says: "dev-agent does this 15% of the time"
  → Pre-flag as suspicious
  → Lower confidence score automatically
  → Improvement suggested: "Add field validator"
```

### Cycle 3: Improve System

```
Field validator added to dev-agent
  → Next outputs validated against schema
  → Hallucination rate drops: 15% → 2%
  → Pattern updated: "dev-agent fixed"
  → System gets better
```

---

## Lane2 Quality Gates

Agent outputs are evaluated with:

```
confidence_score >= 0.85: PASS (auto-continue)
confidence_score >= 0.70: REVIEW (human approval)
confidence_score < 0.70: BLOCK (needs fixing)
```

**Applied at each phase transition:**

```
Phase 1 → 1.5:  init-agent output confidence >= 0.85
Phase 1.5 → 2:  brainstorm-agent output confidence >= 0.85
Phase 2 → 3:    req-agent output confidence >= 0.85
Phase 3 → 4:    design-agent output confidence >= 0.85
Phase 4a → 5:   dev-agent output confidence >= 0.85
Phase 4b → 5:   test-agent output confidence >= 0.85
Phase 4c → 5:   sec-agent output confidence >= 0.85
Phase 5 → Prod: deploy-agent output confidence >= 0.85
```

---

## Commands

### View Validation Results

```bash
# Show latest validation for an agent
/keel validate --agent=dev-agent

# Show validation for specific output
/keel validate --file=code.php

# Verbose output with all findings
/keel validate --agent=dev-agent --verbose

# Check specific layer
/keel validate --layer=reference --agent=dev-agent
```

### View Patterns Learned

```bash
# Show detected patterns
/keel patterns --show

# Show patterns for specific agent
/keel patterns --agent=dev-agent

# Show pattern success rates
/keel patterns --show-success-rates
```

### Manual Re-Validation

```bash
# Re-validate a specific output
/keel revalidate --trace-id=tr_dev_001

# Re-validate all outputs from last hour
/keel revalidate --hours=1

# Re-validate with updated patterns
/keel revalidate --all --use-latest-patterns
```

---

## Integration Points

### With agent-output-schema.json

Every agent output gets extended with `validation` section containing:
- Confidence score
- Layer-by-layer results
- Findings and suggestions
- Recommendations

### With Lane2 Gating

Lane2 gate now checks:
```
lane2_ready = (self_checks_pass AND validation.confidence_score >= 0.70)
```

### With Memory System

Patterns automatically saved to:
- `hallucination_patterns.md`
- Used for learning and improvement
- Shared across all future validations

---

## Limitations

### Can't Detect

1. **True new knowledge hallucinations** - Detector can't verify novel claims beyond knowledge cutoff
2. **Subtle logic errors** - Off-by-one bugs, race conditions
3. **Business logic hallucinations** - "Discount is 10% not 15%" requires context
4. **Performance hallucinations** - Code is correct but slow (needs profiling)
5. **Integration hallucinations** - Code works in isolation but breaks with other systems

### Can Detect

✅ Syntax errors  
✅ Reference hallucinations  
✅ Logic contradictions  
✅ Unsupported claims  
✅ Schema violations  
✅ API contract breaches  
✅ Pattern-based hallucinations  
✅ Boundary condition errors  

---

## Future Enhancements

### v1.1
- [ ] Real-time confidence updates
- [ ] Custom evaluator builder
- [ ] Pattern visualization
- [ ] Auto-fix suggestions with user approval

### v1.2
- [ ] Integration with test-agent (test-driven validation)
- [ ] Fine-tuning from validation data
- [ ] Multi-language support expansion
- [ ] Adversarial testing mode

### v2.0
- [ ] ML model for hallucination prediction
- [ ] Explainability (why something was flagged)
- [ ] Custom domain-specific hallucination detection
- [ ] Real-time coaching for agents

---

**Skill Version:** 1.0.0  
**Status:** PRODUCTION READY  
**Token Overhead:** <3%  
**Memory:** Auto-learning patterns  
**Last Updated:** 2026-07-07
