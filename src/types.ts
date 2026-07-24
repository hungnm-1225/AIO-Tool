export enum ActiveModule {
  TEXT_UTILS = "text_utils",
  COMPARE_MERGE = "compare_merge",
  DATA_CONVERTER = "data_converter",
  EXCEL_SPLITTER = "excel_splitter",
  EXCEL_MERGER = "excel_merger",
  DOCUMENT_SCANNER = "document_scanner",
  FILE_RENAMER = "file_renamer",
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

export interface ExcelMergerState {
  pageSize: number;
}

export interface FileRenamerState {
  prefix: string;
  suffix: string;
  findStr: string;
  replaceStr: string;
  enableNumbering: boolean;
  numberingPattern: string; // e.g. "[name]_[x]"
  startNumber: number;
  stepNumber: number;
  zeroPadding: number; // e.g. 1 -> 01 or 001
  caseMode: "original" | "lowercase" | "uppercase" | "titlecase";
  extensionCase: "original" | "lowercase" | "uppercase";
}

export interface AppState {
  theme: "dark" | "light";
  activeModule: ActiveModule;
  textUtils: TextUtilsState;
  compareMerge: CompareMergeState;
  dataConverter: DataConverterState;
  excelSplitter: ExcelSplitterState;
  excelMerger: ExcelMergerState;
  fileRenamer: FileRenamerState;
}
