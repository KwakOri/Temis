export const getStudioTimetablePresetMessage = (
  label: string,
  { existing, linkedInput }: { existing: boolean; linkedInput: boolean },
): string => {
  if (existing) {
    return linkedInput
      ? `Linked ${label} to input`
      : `Selected existing ${label}`;
  }
  return linkedInput ? `Added ${label} with input` : `Added ${label}`;
};
