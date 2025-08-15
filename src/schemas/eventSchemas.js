import { z } from "zod";

// Validation schema for event query parameters
export const EventFilterSchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  search: z.string().optional(),
  categories: z.string().optional(), // Comma-separated list
  user_id: z.string().uuid().optional(), // For admin queries
});

// Validation schema for event creation
export const CreateEventSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200, "Title too long"),
    description: z.string().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format"),
    notes: z.string().optional(),
    start_time: z.string().datetime("Invalid start time format"),
    end_time: z.string().datetime("Invalid end time format"),
    recurrence: z.enum(["none", "daily", "weekly", "monthly"]).default("none"),
    category: z.string().optional(),
  })
  .refine(
    (data) => {
      const startTime = new Date(data.start_time);
      const endTime = new Date(data.end_time);
      return endTime > startTime;
    },
    {
      message: "End time must be after start time",
      path: ["end_time"],
    }
  );

// Validation schema for event updates
export const UpdateEventSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(200, "Title too long")
      .optional(),
    description: z.string().optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format")
      .optional(),
    notes: z.string().optional(),
    start_time: z.string().datetime("Invalid start time format").optional(),
    end_time: z.string().datetime("Invalid end time format").optional(),
    recurrence: z.enum(["none", "daily", "weekly", "monthly"]).optional(),
    category: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.start_time && data.end_time) {
        const startTime = new Date(data.start_time);
        const endTime = new Date(data.end_time);
        return endTime > startTime;
      }
      return true;
    },
    {
      message: "End time must be after start time",
      path: ["end_time"],
    }
  );
