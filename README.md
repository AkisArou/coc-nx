# coc-nx

First dirty implementation for experimentation.
Code taken and modified from <https://github.com/nrwl/nx-console/blob/master/libs/vscode/typescript-plugin/src/lib/typescript-plugin.ts>
Uses: @monodon/typescript-nx-imports-plugin

For NOW, you have to:

-- SETUP

1. clone this repo
2. add `sh vim.opt.runtimepath:prepend('<PATH_OF_coc-nx>')` into your nvim config
3. Add plugin paths into your coc-settings.json:

```json
  "tsserver.pluginPaths": [
    "<PATH_OF-coc-nx>/node_modules/@monodon/typescript-nx-imports-plugin/"
  ]
```

-- Your Nx monorepo

Include all external files for typescript plugin @monodon/typescript-nx-imports-plugin to work, in your nx tsconfig.base.json (should be absolute paths)

Example:

```json
    "plugins": [
      {
        "name": "@monodon/typescript-nx-imports-plugin",
        "externalFiles": [
          {
            "mainFile": "/home/<user>/nx-nvim/libs/lib-1/src/index.ts",
            "directory": "/home/<user>/nx-nvim/libs/lib-1"
          },
          {
            "mainFile": "/home/<user>/nx-nvim/libs/lib-2/src/index.ts",
            "directory": "/home/<user>/nx-nvim/libs/lib-2"
          }
        ]
      }
    ]

```

(Should not be needed in the future)

## License

MIT

---

> This extension is built with [create-coc-extension](https://github.com/fannheyward/create-coc-extension)
