const v2_PROPERTIES_STYLE_EDITOR_TITLE_BY_SECTION: Record<string, string> = {
  topObjectContainer: "container style",
  memoContainer: "object container style",
  memoContentContainer: "content container style",
  memoTextContainer: "content wrapper style",
  memoTextStyle: "content text style",
  profileImage: "image style",
  profileFrame: "frame style",
  profileTextRootStyle: "root style",
  profileTextWrapperStyle: "wrapper style",
  profileTextStyle: "text style",
  profileTextArtistImageStyle: "artist object style",
};

export const v2_getPropertiesStyleEditorTitle = (section: string): string =>
  v2_PROPERTIES_STYLE_EDITOR_TITLE_BY_SECTION[section] ?? "style";
