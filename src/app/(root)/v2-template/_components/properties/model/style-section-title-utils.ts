const v2_PROPERTIES_STYLE_EDITOR_TITLE_BY_SECTION: Record<string, string> = {
  topObjectContainer: "container style",
  memoContainer: "object container style",
  memoContentContainer: "content container style",
  memoTextContainer: "content wrapper style",
  memoTextStyle: "content text style",
  profileImage: "image style",
  profileFrame: "frame style",
  artistTextRootStyle: "root style",
  artistTextWrapperStyle: "wrapper style",
  artistTextStyle: "text style",
  artistObjectStyle: "artist object style",
};

export const v2_getPropertiesStyleEditorTitle = (section: string): string =>
  v2_PROPERTIES_STYLE_EDITOR_TITLE_BY_SECTION[section] ?? "style";
