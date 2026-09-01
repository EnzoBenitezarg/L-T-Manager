import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // El patrón fetch→setState en useEffect es válido y estándar para client
      // components. Esta regla es un hint de optimización del React Compiler,
      // no un indicador de bugs. Desactivada para evitar ruido en data fetching.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
