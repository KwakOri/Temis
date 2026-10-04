"use client";

import React from "react";
import type { StudioTimetableGraphDocument } from "@/types/studio-timetable-graph";
import { StudioTimetablePreview } from "./studio-timetable-preview";

/** Typed entry point for the native timetable graph renderer. */
export function StudioTimetableGraphPreview({
  document,
  ...props
}: Omit<React.ComponentProps<typeof StudioTimetablePreview>, "document"> & {
  document: StudioTimetableGraphDocument;
}) {
  return <StudioTimetablePreview {...props} document={document} />;
}
