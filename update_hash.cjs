const fs = require('fs');
const file = 'src/App.tsx';
let data = fs.readFileSync(file, 'utf8');

data = data.replace(
  /const canonicalHash =\n\s*state.activeModule === ActiveModule.TEXT_UTILS\n\s*\? "case-converter"\n\s*: state.activeModule === ActiveModule.COMPARE_MERGE\n\s*\? "compare-text"\n\s*: "formatter";/,
  `const canonicalHash =
      state.activeModule === ActiveModule.TEXT_UTILS
        ? "case-converter"
        : state.activeModule === ActiveModule.COMPARE_MERGE
        ? "compare-text"
        : state.activeModule === ActiveModule.H5P_BUILDER
        ? "h5p-builder"
        : "formatter";`
);

data = data.replace(
  /const canonicalHash =\n\s*mod === ActiveModule.TEXT_UTILS\n\s*\? "case-converter"\n\s*: mod === ActiveModule.COMPARE_MERGE\n\s*\? "compare-text"\n\s*: "formatter";/,
  `const canonicalHash =
              mod === ActiveModule.TEXT_UTILS
                ? "case-converter"
                : mod === ActiveModule.COMPARE_MERGE
                ? "compare-text"
                : mod === ActiveModule.H5P_BUILDER
                ? "h5p-builder"
                : "formatter";`
);

fs.writeFileSync(file, data);
