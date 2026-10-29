# Security Policy

## 1. Supported Versions

| Version | Supported |
|:---:|:---:|
| `v0.2.x` | :white_check_mark: |
| `< v0.2.0` | :x: |

---

## 2. Reporting a Vulnerability

If you discover a security vulnerability in **PD Playground**, please report it responsibly rather than opening a public issue.

Please report vulnerabilities via **GitHub Security Advisories** on the repository or email the maintainer directly at:  
**ppawar-7** on GitHub.

We will acknowledge receipt within 48 hours and provide a remediation timeline.

---

## 3. Security Design Principles

PD Playground implements strict security hardening measures:

1. **Zero Dynamic Code Evaluation**:
   - `eval()`, `new Function()`, and dynamic code generation are strictly prohibited in the browser client.
   - All state machine conditions are parsed through a safe, recursive-descent AST evaluator (`safeEvalBooleanExpr`) with token whitelisting.
2. **SVG & DOM Injection Prevention**:
   - Component labels and user text in SVG circuits are sanitized using HTML entity escaping (`&`, `<`, `>`, `"`, `'`).
3. **Static Client Runtime**:
   - The application runs purely as client-side static assets (HTML, CSS, JS) with **zero production npm dependencies**, eliminating third-party supply chain risks.
4. **Isolated WebAssembly Compilers**:
   - HDL verification compilers (`@yowasp/yosys` and `@veriflow/iverilog-wasm`) run in sandboxed WebAssembly execution contexts.
