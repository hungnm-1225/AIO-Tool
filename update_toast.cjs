const fs = require('fs');
const file = 'src/components/DataConverterHtml.tsx';
let data = fs.readFileSync(file, 'utf8');

data = data.replace(
  /const showToast = \(msg: string, isError = false\) => \{[\s\S]*?  \};/,
  `const showToast = (msg: string, isError = false) => {
    if (isError) {
      toast.error(msg);
    } else {
      toast.success(msg);
    }
  };`
);

data = data.replace(/ *const \[toastMessage, setToastMessage\].*?\n/g, '');
data = data.replace(/ *const \[errorMessage, setErrorMessage\].*?\n/g, '');

data = data.replace(/ *\{\/\* Toast Alert \*\/\}[\s\S]*?\{\/\* Error Toast Alert \*\/\}[\s\S]*?<\/[dD]iv>\n *\n *\}\)\n*/, '');

fs.writeFileSync(file, data);
