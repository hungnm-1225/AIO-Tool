export enum ActiveModule {
  TEXT_UTILS = "text_utils",
  COMPARE_MERGE = "compare_merge",
  DATA_CONVERTER = "data_converter",
  H5P_BUILDER = "h5p_builder",
}

export interface TextUtilsState {
  inputText: string;
  countSpaces: boolean;
  countEmptyLines: boolean;
  findQuery: string;
  replaceQuery: string;
  isRegex: boolean;
}

export interface CompareMergeState {
  diffOriginal: string;
  diffModified: string;
  combineCol1: string;
  combineCol2: string;
  combineDelimiter: string;
  autoIncTemplate: string;
  autoIncStart: number;
  autoIncStep: number;
  autoIncCount: number;
}

export interface DataConverterState {
  rawJson: string;
  rawCsv: string;
  labelValueMode: boolean;
  lockEdit: boolean;
  activeFormatType: "json" | "html" | "css" | "javascript";
  formatInput: string;
  htmlPreviewMode: "single" | "split";
  htmlSingleInput: string;
  htmlSplitInput: string;
  cssSplitInput: string;
  jsSplitInput: string;
}

export interface H5pImage {
  id: string;
  file: File;
  previewUrl: string;
  crop?: { x: number, y: number, width: number, height: number };
  rotation?: number;
  texts?: { id: string, text: string, x: number, y: number, fontSize: number, fill: string, stroke: string, strokeWidth: number, fontFamily: string }[];
}

export interface H5pBuilderState {
  images: H5pImage[];
}

export interface AppState {
  theme: "dark" | "light";
  activeModule: ActiveModule;
  textUtils: TextUtilsState;
  compareMerge: CompareMergeState;
  dataConverter: DataConverterState;
  h5pBuilder: H5pBuilderState;
}
