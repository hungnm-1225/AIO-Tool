import * as XLSXModule from "xlsx";

// Statically resolve the correct XLSX instance at module-load time.
// This is extremely safe, does not use Proxy (which violates frozen namespace rules),
// and seamlessly supports both ESM and CommonJS module environments.
export const XLSX = XLSXModule.utils ? XLSXModule : ((XLSXModule as any).default || XLSXModule);
export default XLSX;
