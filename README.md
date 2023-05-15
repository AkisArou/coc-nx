# coc-nx

First dirty implementation for experimentation.

For NOW, you have to:

1. Include all external files of typescript plugin @monodon/typescript-nx-imports-plugin in your nx tsconfig.base.json (should be absolute paths)

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

2. Add plugin paths into coc-settings.json:

```json
  "tsserver.pluginPaths": [
    "/home/<user>/coc-nx/node_modules/@monodon/typescript-nx-imports-plugin/"
  ]
```

()

## Install

`:CocInstall coc-nx`

## Keymaps

`nmap <silent> <C-l> <Plug>(coc-coc-nx-keymap)`

## Lists

`:CocList demo_list`

## License

MIT

---

> This extension is built with [create-coc-extension](https://github.com/fannheyward/create-coc-extension)
