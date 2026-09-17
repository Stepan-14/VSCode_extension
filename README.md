# Autobuilder & autorunner extension for c++ projects

Данное расширение позволяет упростить работу с проектами, написанными на c++. Оно предлагает такие возможности как:
1. Создание базовой структуры c++ проекта:  
```
    - docs/
      - README.md  
    - lib/
      - CMakeLists.txt  
    - bin/
      - main.cpp
      - CMakeLists.txt  
    - test/
      - ...
    - .gitignore
    - CMakeLists.txt
```

2. Лёгкий билдинг проекта по одной кнопке: cmake соберёт проект со стандартными настройками: `cmake -B build & cmake --build build`

## Использование

> [!CAUTION]
> В главной папке проекта обязательно должна быть директория (папка) bin. Если файл не подразумевает сборку с использованием cmake, то он должен быть сохранён **непосредтвенно** в директории bin (запрезено сохранять файлы в подкаталогах bin). Если проект подразумевает сборку cmake, то должна быть соблюдена базовая структура проекта (в корне должны быть директории bin и lib, а также файл CMakeLists.txt)

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 0.0.1

Initial release of ...

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)