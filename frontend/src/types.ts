export type FieldType = "text" | "textarea" | "email" | "number" | "dropdown" | "checkbox" | "date";

export type Op =
  | "equals" | "not_equals" | "contains" | "not_contains" | "empty" | "not_empty" | "gt" | "lt";

export type Rule = { field: string; op: Op; value?: string | number | null };
export type Condition = Rule | { all: Condition[] } | { any: Condition[] };

export type Validation = {
  min?: number | string;
  max?: number | string;
  min_length?: number;
  max_length?: number;
  pattern?: string;
};

export type Field = {
  id: string;
  type: FieldType;
  label: string;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: string[];
  validation?: Validation;
  show_if?: Condition;
};

export type Answer = string | number | string[] | null | undefined;
export type Answers = Record<string, Answer>;

export type FormSchema = { fields: Field[] };

export type Form = {
  id: number;
  slug: string;
  title: string;
  description: string;
  schema: FormSchema;
  published: boolean;
  created_at: string;
  updated_at: string;
  response_count?: number;
};

export type PublicForm = Pick<Form, "title" | "description" | "schema">;

export type ResponsesPage = {
  columns: { id: string; label: string }[];
  responses: { id: number; created_at: string; answers: Answers }[];
};
