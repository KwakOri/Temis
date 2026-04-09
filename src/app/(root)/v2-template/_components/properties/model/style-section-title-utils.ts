const v2_PROPERTIES_STYLE_EDITOR_TITLE_BY_SECTION: Record<string, string> = {
  topObjectContainer: "container style",
  profileImage: "image style",
  profileFrame: "frame style",
  profileTextRootStyle: "root style",
  profileTextWrapperStyle: "wrapper style",
  profileTextStyle: "text style",
  profileTextArtistImageStyle: "artist image style",
};

export const v2_getPropertiesStyleEditorTitle = (section: string): string =>
  v2_PROPERTIES_STYLE_EDITOR_TITLE_BY_SECTION[section] ?? "style";
