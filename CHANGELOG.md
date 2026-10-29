# Changelog

All notable changes to **FormCraft** are documented here.

---

## [Unreleased]

---

## [0.1.0] — 2026-10-29

### ✨ Added
- Form schema with seven field types, per-field validation and `show_if` conditions (rules and nested all/any groups)
- Schema checks on save: upward-only references, operator/type fit, option values, regex validity
- Server-side submission validation that re-runs conditional logic and drops hidden answers
- Owner login with a single admin password
- Forms CRUD, publish/unpublish, random share slugs, responses list and CSV export
- Drag-and-drop builder (dnd-kit) with inspector, condition editor, JSON mode for nested conditions and live preview
- Public form page with fields that appear as you answer
- Responses table with search, and an example form to start from

### 🧪 Tests
- Shared condition cases run by both pytest and Vitest
- Schema, submission and API tests, including formula-safe CSV export

---

[Unreleased]: https://github.com/akshatgcodes/FormCraft/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/akshatgcodes/FormCraft/releases/tag/v0.1.0

---

<div align="center">

<h3>Akshat Gupta</h3>

<a href="https://akshatgcodes.in"><img src="https://img.shields.io/badge/Website-akshatgcodes.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/akshatgcodes"><img src="https://img.shields.io/badge/LinkedIn-akshatgcodes-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/akshatgcodes"><img src="https://img.shields.io/badge/GitHub-akshatgcodes-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:akshatgcodes@gmail.com"><img src="https://img.shields.io/badge/Email-akshatgcodes%40gmail.com-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>
