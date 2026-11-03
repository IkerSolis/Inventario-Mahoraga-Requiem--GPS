import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
      prettier, // al final: apaga las reglas de formato, de eso se encarga Prettier
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Variables sin usar = error, salvo las que empiezan con _ o mayúscula (componentes importados, constantes)
      // y las que se sacan de un objeto para quedarse con el resto: const { campo, ...resto } = objeto
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', ignoreRestSiblings: true }],
    },
  },
  {
    // vite.config.js y eslint.config.js corren en Node, no en el navegador
    files: ['*.config.js'],
    languageOptions: { globals: globals.node },
  },
])
