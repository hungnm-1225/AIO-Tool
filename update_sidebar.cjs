const fs = require('fs');
const file = 'src/components/Sidebar.tsx';
let data = fs.readFileSync(file, 'utf8');

data = data.replace(
  /import \{\n  FileText,\n  GitCompare,\n  Terminal,/,
  `import {
  FileText,
  GitCompare,
  Terminal,
  Image as ImageIcon,`
);

data = data.replace(
  /    \{\n      id: ActiveModule.DATA_CONVERTER,[\s\S]*?    \},\n  \];/,
  `    {
      id: ActiveModule.DATA_CONVERTER,
      label: "Data & HTML Runner",
      description: "Format, JSON-Grid, HTML Live Preview",
      icon: Terminal,
      hashId: "formatter",
    },
    {
      id: ActiveModule.H5P_BUILDER,
      label: "H5P Builder",
      description: "Generate H5P Image Presentation",
      icon: ImageIcon,
      hashId: "h5p-builder",
    }
  ];`
);

fs.writeFileSync(file, data);
