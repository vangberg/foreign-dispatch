# Foreign Dispatch Autocomplete

- [Building SQLite JS/WASM bundles](https://sqlite.org/wasm/doc/trunk/building.md)

## Download WikDict databases

```bash
./download-wikdict.sh
```

## Run locally

We need to run a local server to be able to load the WASM file,
otherwise we'll get a CORS error:

```bash
python -m http.server
```
