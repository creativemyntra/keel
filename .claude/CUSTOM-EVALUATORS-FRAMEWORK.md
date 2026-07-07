# Phase 3.2: Custom Evaluators Framework

**Optimization - Component 2 of 4**

---

## Overview

Built-in evaluators (syntax, reference, logic, etc.) are great, but every team has unique quality criteria. This component lets you build custom evaluators for domain-specific validation.

Examples:
- Domain logic validation (business rules)
- Performance benchmarks (latency, memory)
- Style enforcement (naming conventions)
- Compliance checks (PII handling)
- Custom architecture rules
- Team-specific patterns

---

## Evaluator Anatomy

### Basic Structure

```python
# example_evaluators/NamingConventionEval.py

from keel.evaluators import BaseEvaluator, EvaluationResult

class NamingConventionEval(BaseEvaluator):
    """
    Evaluates code against team naming conventions.
    
    Rules:
      - Classes: PascalCase
      - Methods: camelCase
      - Constants: UPPER_SNAKE_CASE
      - Private vars: _leadingUnderscore
    """
    
    name = "NamingConventionEval"
    priority = "high"
    applies_to = ["code_generated"]
    
    def evaluate(self, code: str, context: dict) -> EvaluationResult:
        """
        Args:
            code: Generated code to evaluate
            context: {
              'language': 'php',
              'style_guide': 'psr-12',
              'strictness': 'high'
            }
        
        Returns:
            EvaluationResult: {
              'score': 0.92,
              'passed': True,
              'issues': [...],
              'suggestions': [...]
            }
        """
        
        issues = []
        suggestions = []
        
        # Parse code
        ast = parse_code(code, context['language'])
        
        # Check class names
        for cls in ast.classes:
            if not is_pascal_case(cls.name):
                issues.append({
                    'type': 'class_naming',
                    'name': cls.name,
                    'rule': 'Must be PascalCase',
                    'suggestion': to_pascal_case(cls.name)
                })
        
        # Check method names
        for method in ast.methods:
            if method.is_private:
                expected = f"_{to_camel_case(method.name)}"
            else:
                expected = to_camel_case(method.name)
            
            if method.name != expected:
                issues.append({
                    'type': 'method_naming',
                    'name': method.name,
                    'rule': 'Must be camelCase (or _camelCase if private)',
                    'suggestion': expected
                })
        
        # Check constants
        for const in ast.constants:
            if not is_upper_snake_case(const.name):
                issues.append({
                    'type': 'constant_naming',
                    'name': const.name,
                    'rule': 'Must be UPPER_SNAKE_CASE',
                    'suggestion': to_upper_snake_case(const.name)
                })
        
        # Calculate score
        total_violations = len(issues)
        total_names = len(ast.classes) + len(ast.methods) + len(ast.constants)
        score = 1.0 - (total_violations / max(total_names, 1)) * 0.3
        
        return EvaluationResult(
            score=max(0.0, score),
            passed=len(issues) == 0,
            issues=issues,
            suggestions=suggestions,
            confidence=0.95,
            duration_ms=150
        )
```

---

## Evaluator Lifecycle

### Registration

```yaml
# .keel/evaluators.yaml

custom_evaluators:
  - id: naming-convention
    name: "NamingConventionEval"
    module: "example_evaluators/NamingConventionEval.py"
    class: "NamingConventionEval"
    enabled: true
    priority: "high"
    applies_to: ["code_generated"]
    timeout: 5000  # ms
    cache_results: true
  
  - id: performance-benchmark
    name: "PerformanceBenchmarkEval"
    module: "example_evaluators/PerformanceBenchmarkEval.py"
    class: "PerformanceBenchmarkEval"
    enabled: true
    priority: "high"
    applies_to: ["code_generated"]
    timeout: 10000
    cache_results: true
  
  - id: compliance-check
    name: "ComplianceCheckEval"
    module: "example_evaluators/ComplianceCheckEval.py"
    class: "ComplianceCheckEval"
    enabled: true
    priority: "critical"
    applies_to: ["code_generated"]
    timeout: 5000
    cache_results: false  # Always re-check compliance
    failure_action: "block"  # Block on violation
```

### Execution Flow

```
Agent generates output
    ↓
Built-in evaluators run
    ├─ SyntaxEval
    ├─ ReferenceEval
    ├─ LogicEval
    ├─ ... (5-layer validation)
    ↓
Custom evaluators run (in priority order)
    ├─ NamingConventionEval (high)
    ├─ PerformanceBenchmarkEval (high)
    ├─ ComplianceCheckEval (critical)
    ↓
Composite score calculated
    ├─ Built-in: 70% weight
    ├─ Custom: 30% weight
    ↓
Output validated
    ├─ Score >= 0.70? → Continue
    ├─ Score < 0.70? → Try auto-fix or rollback
    ↓
Results cached (if enabled)
```

---

## Custom Evaluator Examples

### Example 1: Performance Benchmark

```python
class PerformanceBenchmarkEval(BaseEvaluator):
    """Validates code meets performance targets."""
    
    name = "PerformanceBenchmarkEval"
    applies_to = ["code_generated"]
    
    def evaluate(self, code: str, context: dict) -> EvaluationResult:
        issues = []
        
        # Extract methods/functions
        ast = parse_code(code, context['language'])
        
        for func in ast.functions:
            # Check for O(n²) algorithms
            if has_nested_loops(func) and not explicitly_intentional(func):
                issues.append({
                    'type': 'algorithmic_complexity',
                    'location': func.name,
                    'problem': 'O(n²) complexity detected',
                    'suggestion': 'Consider O(n log n) approach'
                })
            
            # Check for memory leaks
            if has_unresolved_resources(func):
                issues.append({
                    'type': 'resource_leak',
                    'location': func.name,
                    'problem': 'Resource not released',
                    'suggestion': 'Add try-finally block'
                })
            
            # Check method length
            if func.line_count > 50:
                issues.append({
                    'type': 'method_too_long',
                    'location': func.name,
                    'problem': f'Method is {func.line_count} lines',
                    'suggestion': 'Break into smaller methods'
                })
        
        score = 1.0 - (len(issues) / max(len(ast.functions), 1)) * 0.2
        
        return EvaluationResult(
            score=max(0.0, score),
            passed=len(issues) == 0,
            issues=issues
        )
```

### Example 2: Compliance Check

```python
class ComplianceCheckEval(BaseEvaluator):
    """Validates code doesn't expose PII or secrets."""
    
    name = "ComplianceCheckEval"
    applies_to = ["code_generated"]
    
    # Patterns that indicate violations
    FORBIDDEN_PATTERNS = [
        (r'password\s*=', 'Hardcoded password'),
        (r'api[_-]?key\s*=', 'Hardcoded API key'),
        (r'secret\s*=', 'Hardcoded secret'),
        (r'SELECT.*WHERE.*email', 'Email query without encryption'),
        (r'ssn|social.?security', 'SSN reference without encryption'),
        (r'credit.?card|cc.?number', 'Credit card without encryption'),
    ]
    
    def evaluate(self, code: str, context: dict) -> EvaluationResult:
        issues = []
        
        for pattern, violation_type in self.FORBIDDEN_PATTERNS:
            matches = re.finditer(pattern, code, re.IGNORECASE)
            for match in matches:
                line_num = code[:match.start()].count('\n') + 1
                issues.append({
                    'type': 'compliance_violation',
                    'severity': 'critical',
                    'line': line_num,
                    'violation': violation_type,
                    'suggestion': 'Use environment variables or secure vaults'
                })
        
        score = 1.0 if len(issues) == 0 else 0.0
        
        return EvaluationResult(
            score=score,
            passed=len(issues) == 0,
            issues=issues,
            failure_action='block'  # Block if compliance violated
        )
```

### Example 3: Architecture Rule

```python
class ArchitectureEval(BaseEvaluator):
    """Validates code follows architecture patterns."""
    
    name = "ArchitectureEval"
    applies_to = ["code_generated"]
    
    RULES = {
        'controller': {
            'must_have': ['__construct', 'validate_input'],
            'must_not_have': ['database_query', 'external_api_call'],
            'should_extend': 'BaseController'
        },
        'service': {
            'must_have': ['execute', 'validate'],
            'must_not_have': ['http_request'],
            'should_have_methods': >= 3
        },
        'model': {
            'must_have': ['validate', 'to_array'],
            'should_extend': 'BaseModel'
        }
    }
    
    def evaluate(self, code: str, context: dict) -> EvaluationResult:
        issues = []
        ast = parse_code(code, context['language'])
        
        # Determine class type
        class_type = detect_class_type(ast.classes[0])
        
        if class_type in self.RULES:
            rules = self.RULES[class_type]
            cls = ast.classes[0]
            
            # Check must-have methods
            for required_method in rules.get('must_have', []):
                if not has_method(cls, required_method):
                    issues.append({
                        'type': 'missing_required_method',
                        'class': cls.name,
                        'method': required_method,
                        'suggestion': f'Add {required_method} method'
                    })
            
            # Check must-not-have methods
            for forbidden_method in rules.get('must_not_have', []):
                if has_method(cls, forbidden_method):
                    issues.append({
                        'type': 'forbidden_method',
                        'class': cls.name,
                        'method': forbidden_method,
                        'suggestion': f'Move to appropriate class'
                    })
        
        score = 1.0 - (len(issues) / 5) * 0.2  # Max 5 issues expected
        
        return EvaluationResult(
            score=max(0.0, score),
            passed=len(issues) == 0,
            issues=issues
        )
```

---

## Evaluator Composition

### Combine Multiple Evaluators

```python
class CompositeEval(BaseEvaluator):
    """Combines multiple evaluators into one."""
    
    evaluators = [
        NamingConventionEval(),
        PerformanceBenchmarkEval(),
        ComplianceCheckEval(),
        ArchitectureEval()
    ]
    
    def evaluate(self, code: str, context: dict):
        results = []
        all_issues = []
        
        for evaluator in self.evaluators:
            result = evaluator.evaluate(code, context)
            results.append(result)
            all_issues.extend(result.issues)
        
        # Weighted composite score
        composite_score = (
            results[0].score * 0.25 +  # Naming
            results[1].score * 0.25 +  # Performance
            results[2].score * 0.35 +  # Compliance (most important)
            results[3].score * 0.15    # Architecture
        )
        
        # All issues combined
        return EvaluationResult(
            score=composite_score,
            passed=all([r.passed for r in results]),
            issues=all_issues
        )
```

---

## Evaluator Scoring

### Weighted Scoring

```yaml
scoring_model: "weighted"

evaluators:
  built_in:
    weight: 0.70
    evaluators:
      - SyntaxEval: 0.30
      - ReferenceEval: 0.25
      - LogicEval: 0.20
      - ClaimEval: 0.15
      - PatternEval: 0.10
  
  custom:
    weight: 0.30
    evaluators:
      - ComplianceCheckEval: 0.50  # Most important
      - ArchitectureEval: 0.25
      - PerformanceBenchmarkEval: 0.15
      - NamingConventionEval: 0.10

gates:
  phase_4a_dev:
    min_score: 0.70
    critical_evaluators:
      - SyntaxEval: must pass (score >= 0.95)
      - ComplianceCheckEval: must pass (100%)
    optional_evaluators:
      - NamingConventionEval: nice to have

  phase_4b_test:
    min_score: 0.75
    critical_evaluators:
      - CoverageEval: must pass (>= 80%)
      - ReliabilityEval: must pass (>= 90%)
```

---

## Evaluator Performance

### Timeout & Limits

```yaml
evaluator_limits:
  default:
    timeout_ms: 5000
    max_memory_mb: 512
    max_cpu_percent: 50
  
  specific:
    ComplianceCheckEval:
      timeout_ms: 3000  # Fast security scan
      cache: false  # Always run
    
    PerformanceBenchmarkEval:
      timeout_ms: 10000  # Might run complex analysis
      cache: true
    
    NamingConventionEval:
      timeout_ms: 2000  # Very fast
      cache: true

  on_timeout:
    action: "use_cached_result"  # or "fail_open" or "escalate"
```

---

## Dashboard Integration

### Evaluator Metrics

```
┌──────────────────────────────────────────┐
│ CUSTOM EVALUATORS - Performance         │
├──────────────────────────────────────────┤
│                                          │
│ NamingConventionEval:                    │
│   Pass rate: 87%                         │
│   Avg score: 0.89                        │
│   Avg time: 150ms                        │
│   Cache hit rate: 65%                    │
│                                          │
│ PerformanceBenchmarkEval:                │
│   Pass rate: 92%                         │
│   Avg score: 0.94                        │
│   Avg time: 300ms                        │
│   Cache hit rate: 45%                    │
│                                          │
│ ComplianceCheckEval:                     │
│   Pass rate: 99.8%                       │
│   Avg score: 0.99                        │
│   Avg time: 80ms                         │
│   Cache hit rate: 0% (always runs)       │
│                                          │
│ ArchitectureEval:                        │
│   Pass rate: 84%                         │
│   Avg score: 0.86                        │
│   Avg time: 200ms                        │
│   Cache hit rate: 55%                    │
│                                          │
│ Composite (all):                         │
│   Overall pass rate: 88%                 │
│   Avg composite score: 0.91              │
│   Total time: 730ms (parallel)           │
│                                          │
└──────────────────────────────────────────┘
```

---

## Commands

```bash
# List custom evaluators
/keel eval --list
/keel eval --list --enabled

# Create new evaluator
/keel eval --create --name=MyCustomEval --template=base

# Test evaluator
/keel eval --test --evaluator=NamingConventionEval --file=Example.php

# Enable/disable evaluator
/keel eval --enable --evaluator=NamingConventionEval
/keel eval --disable --evaluator=PerformanceBenchmarkEval

# View evaluator results
/keel eval --results --evaluator=ComplianceCheckEval
/keel eval --results --story=KEEL-42

# Evaluate code manually
/keel eval --run --evaluator=NamingConventionEval --file=src/Example.php

# Benchmark evaluators
/keel eval --benchmark
/keel eval --benchmark --evaluator=ComplianceCheckEval
```

---

## API Endpoints

```
POST /api/evaluators/register
  Register new custom evaluator
  
GET /api/evaluators
  List all evaluators (built-in + custom)
  
GET /api/evaluators/{evaluator_id}/results
  Get results for specific evaluator
  
POST /api/evaluators/{evaluator_id}/test
  Test evaluator on code sample
  
GET /api/evaluators/{evaluator_id}/performance
  Get performance metrics
  
PUT /api/evaluators/{evaluator_id}/config
  Update evaluator configuration
```

---

## Testing Custom Evaluators

### Unit Test Example

```python
# tests/test_naming_convention_eval.py

from unittest import TestCase
from example_evaluators.NamingConventionEval import NamingConventionEval

class TestNamingConventionEval(TestCase):
    
    def setUp(self):
        self.evaluator = NamingConventionEval()
    
    def test_valid_class_name(self):
        code = """
        class UserService {
            public function getUserById() { }
        }
        """
        result = self.evaluator.evaluate(code, {'language': 'php'})
        self.assertEqual(result.score, 1.0)
        self.assertTrue(result.passed)
    
    def test_invalid_class_name(self):
        code = """
        class user_service {
            public function getUserById() { }
        }
        """
        result = self.evaluator.evaluate(code, {'language': 'php'})
        self.assertLess(result.score, 1.0)
        self.assertFalse(result.passed)
        self.assertTrue(any(i['type'] == 'class_naming' for i in result.issues))
    
    def test_invalid_method_name(self):
        code = """
        class UserService {
            public function get_user_by_id() { }
        }
        """
        result = self.evaluator.evaluate(code, {'language': 'php'})
        self.assertFalse(result.passed)
        self.assertTrue(any(i['type'] == 'method_naming' for i in result.issues))
```

---

## Performance Considerations

### Optimization Tips

```yaml
optimization:
  # Cache evaluator results
  caching:
    enabled: true
    ttl_hours: 24
  
  # Run evaluators in parallel
  parallelization:
    enabled: true
    max_parallel: 4
    respect_dependencies: true
  
  # Skip expensive evaluators for quick feedback
  quick_mode:
    enabled: true
    skip_evaluators:
      - PerformanceBenchmarkEval  # Expensive
      - ComplianceCheckEval  # Always run, even in quick
    for_features: ["quick_feedback", "preview"]
  
  # Lazy load evaluator modules
  lazy_loading:
    enabled: true
    load_on_first_use: true
```

---

## Evaluator Library

### Community Evaluators

```
Official library at: https://github.com/keelai/evaluators/

Available:
  - NamingConventionEval (PHP, Python, JS)
  - ComplianceCheckEval (universal)
  - PerformanceBenchmarkEval (PHP, Python, Java)
  - ArchitectureEval (universal)
  - SecurityEval (OWASP, CWE)
  - AccessibilityEval (web)
  - TypeSafetyEval (TypeScript)
  - DocstringEval (Python)
  - TestCoverageEval (universal)
  - APIContractEval (REST, GraphQL)
```

---

**Status:** Component 2 of 4 (Phase 3 Optimization)  
**Effort:** ~3-4 days to implement  
**Priority:** MEDIUM (enables custom quality criteria)

Next: Component 3 - Advanced Pattern Detection & Predictions
