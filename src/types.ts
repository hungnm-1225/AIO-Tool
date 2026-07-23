export enum ActiveModule {
  TEXT_UTILS = "text_utils",
  COMPARE_MERGE = "compare_merge",
  DATA_CONVERTER = "data_converter",
  EXCEL_SPLITTER = "excel_splitter",
}

export interface TextUtilsState {
  inputText: string;
  countSpaces: boolean;
  countEmptyLines: boolean;
  findQuery: string;
  replaceQuery: string;
  isRegex: boolean;
  matchCase?: boolean;
}

export interface CompareMergeState {
  diffOriginal: string;
  diffModified: string;
  ignoreCase?: boolean;
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

export interface ExcelSplitterState {
  maxRecordsPerFile: number;
  showErrorsOnly: boolean;
  pageSize: number;
  exportFormat?: "individual" | "zip";
}

export interface AppState {
  theme: "dark" | "light";
  activeModule: ActiveModule;
  textUtils: TextUtilsState;
  compareMerge: CompareMergeState;
  dataConverter: DataConverterState;
  excelSplitter: ExcelSplitterState;
}
