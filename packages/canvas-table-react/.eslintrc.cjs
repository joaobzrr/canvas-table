module.exports = {
    "env": {
        "browser": true,
        "es2021": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended"
    ],
    "overrides": [
        {
            "env": {
                "node": true
            },
            "files": [
                ".eslintrc.{js,cjs}"
            ],
            "parserOptions": {
                "sourceType": "script"
            }
        }
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module"
    },
    "plugins": [
        "@typescript-eslint",
        "@stylistic"
    ],
    "rules": {
      "no-debugger":"off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      '@typescript-eslint/no-non-null-assertion': 'off',
      "@typescript-eslint/no-unused-vars": [
        "warn", // or "error"
        { 
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }
      ],
      "@stylistic/semi": "error",
      "@stylistic/linebreak-style": ["error", "unix"],
      "@stylistic/comma-dangle": ["error", "never"]
    }
}
