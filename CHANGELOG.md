# Change Log

## 1.2.0

- `destroy` will now reject functional backlogs
- `promise` asyncs now fallback to invocations
- `README.md` has API docs

## 1.1.0

- exports commonjs modules

## 1.0.4

- exports `Remote` and `RemoteDesc`

## 1.0.3

- Minification safe fixes
- Adds debug testing tool pkg.scripts.test:debug
- (Internal) enums no longer used due to awkwardness between TS enums and Google Closure Compiler enums
- No more global state for responders
- No more global uid state
- Faster uid function
- exports as es6
- does not export as goog.module

## 1.0.2

- Package for Closure Compiler JS

## 1.0.1

- Fix `pkg.typings` in `package.json`
