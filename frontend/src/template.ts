import type { FormSchema } from "./types";

/** Example form that shows off branching: student → college/year → internship. */
export const TEMPLATE: { title: string; description: string; schema: FormSchema } = {
  title: "Hackathon signup",
  description: "Tell us a bit about yourself. Questions change based on your answers.",
  schema: {
    fields: [
      { id: "name", type: "text", label: "Full name", required: true, validation: { min_length: 2 } },
      { id: "email", type: "email", label: "Email", required: true, placeholder: "you@example.com" },
      { id: "is_student", type: "dropdown", label: "Are you a student?", required: true, options: ["Yes", "No"] },
      {
        id: "college",
        type: "text",
        label: "College name",
        required: true,
        show_if: { field: "is_student", op: "equals", value: "Yes" },
      },
      {
        id: "year",
        type: "dropdown",
        label: "Year of study",
        options: ["1st", "2nd", "3rd", "4th"],
        show_if: { field: "is_student", op: "equals", value: "Yes" },
      },
      {
        id: "company",
        type: "text",
        label: "Where do you work?",
        show_if: { field: "is_student", op: "equals", value: "No" },
      },
      { id: "langs", type: "checkbox", label: "Languages you use", options: ["Python", "JavaScript", "Go", "Rust"] },
      {
        id: "rust_exp",
        type: "number",
        label: "Years of Rust experience",
        validation: { min: 0, max: 20 },
        show_if: { field: "langs", op: "contains", value: "Rust" },
      },
      {
        id: "internship",
        type: "textarea",
        label: "Looking for an internship? Tell us what kind.",
        show_if: {
          all: [
            { field: "is_student", op: "equals", value: "Yes" },
            { any: [{ field: "year", op: "equals", value: "3rd" }, { field: "year", op: "equals", value: "4th" }] },
          ],
        },
      },
      { id: "date", type: "date", label: "Preferred start date", validation: { min: "2024-01-01" } },
    ],
  },
};
