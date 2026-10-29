# PRD: FormCraft

## Problem

Hosted form tools put branching behind paywalls and keep your responses on their servers. Simple open-source builders skip conditional logic entirely, so every respondent sees every question.

## Goal

A form builder you host yourself, where questions show or hide based on earlier answers, and the server enforces the same rules.

## Users

- **Owner:** builds forms, shares links, reads and exports responses
- **Respondent:** anyone with the link; no account

## User stories

| As a… | I want to… | So that… |
|---|---|---|
| owner | drag fields into a form and reorder them | building feels direct |
| owner | show a field only when an earlier answer matches | respondents only see relevant questions |
| owner | combine rules with all/any | I can express "student AND (3rd OR 4th year)" |
| owner | preview the form while editing | I can test the branching before publishing |
| owner | publish/unpublish and copy a link | I control when responses come in |
| owner | see responses in a table and export CSV | I can analyse them in a spreadsheet |
| respondent | see questions appear as I answer | the form adapts to me |
| respondent | get clear errors next to the field | I can fix mistakes quickly |

## Requirements

- Field types: short text, paragraph, email, number, dropdown, checkboxes, date
- Per-field: label, help text, placeholder, required, options, validation (length, regex, min/max)
- Conditions: rule (`field`, `op`, `value`) or `all`/`any` group, nested up to 5 levels; only fields above
- Server validates the schema on save and every submission against the visible fields
- Hidden answers are discarded on submit
- Owner pages require login; public pages only expose published forms
- CSV export with all current fields plus fields removed after receiving answers

## Non-goals

- Multiple owners or teams
- File uploads, payments, multi-page forms
- Email notifications on submission
- Schema versioning (v2)

---

<div align="center">

<h3>Akshat Gupta</h3>

<a href="https://akshatgcodes.in"><img src="https://img.shields.io/badge/Website-akshatgcodes.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/akshatgcodes"><img src="https://img.shields.io/badge/LinkedIn-akshatgcodes-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/akshatgcodes"><img src="https://img.shields.io/badge/GitHub-akshatgcodes-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:akshatgcodes@gmail.com"><img src="https://img.shields.io/badge/Email-akshatgcodes%40gmail.com-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>
