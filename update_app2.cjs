const fs = require('fs');
const file = 'src/App.tsx';
let data = fs.readFileSync(file, 'utf8');

data = data.replace(
  /import DataConverterHtml from "\.\/components\/DataConverterHtml";/,
  `import DataConverterHtml from "./components/DataConverterHtml";
import H5pBuilder from "./components/H5pBuilder";`
);

data = data.replace(
  /        \{\s*state.activeModule === ActiveModule.DATA_CONVERTER && \([\s\S]*?        \)\}/,
  `        {state.activeModule === ActiveModule.DATA_CONVERTER && (
          <DataConverterHtml
            state={state.dataConverter}
            onChange={(subState) => handleModuleStateChange("dataConverter", subState)}
          />
        )}
        {state.activeModule === ActiveModule.H5P_BUILDER && (
          <H5pBuilder
            state={state.h5pBuilder}
            onChange={(subState) => handleModuleStateChange("h5pBuilder", subState)}
          />
        )}`
);

data = data.replace(
  /const HASH_MAP: Record<string, ActiveModule> = \{[\s\S]*?  "#chuyen-doi": ActiveModule.DATA_CONVERTER,\n\};/,
  `const HASH_MAP: Record<string, ActiveModule> = {
  "#case-converter": ActiveModule.TEXT_UTILS,
  "#text-utilities": ActiveModule.TEXT_UTILS,
  "#string-cutter": ActiveModule.TEXT_UTILS,
  "#compare-text": ActiveModule.COMPARE_MERGE,
  "#merge-columns": ActiveModule.COMPARE_MERGE,
  "#auto-increment": ActiveModule.COMPARE_MERGE,
  "#formatter": ActiveModule.DATA_CONVERTER,
  "#data-converter": ActiveModule.DATA_CONVERTER,
  "#data_converter": ActiveModule.DATA_CONVERTER,
  "#chuyen-doi-du-lieu": ActiveModule.DATA_CONVERTER,
  "#chuyen-doi": ActiveModule.DATA_CONVERTER,
  "#h5p-builder": ActiveModule.H5P_BUILDER,
};`
);

fs.writeFileSync(file, data);
