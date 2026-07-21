const fs = require('fs');
const file = 'src/App.tsx';
let data = fs.readFileSync(file, 'utf8');

data = data.replace(
  /  \},\n\};\n\nexport default function App\(\) \{/,
  `  },
  h5pBuilder: {
    images: []
  },
};

export default function App() {`
);

fs.writeFileSync(file, data);
