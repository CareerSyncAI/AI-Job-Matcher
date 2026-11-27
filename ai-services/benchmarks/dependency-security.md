# AI-service dependency security review

Reviewed on 27 November 2026. `requirements.txt` is used by CI after installing
CPU PyTorch. `pyproject.toml` is the alternate Poetry manifest. The AI service
has no committed lockfile or container image definition. The repository's
Compose file runs PostgreSQL and Redis.

Installed versions below are from the pre-change Windows Python 3.11.9
environment. The review used registry vulnerability metadata for the 69 installed
distributions and checked relevant upstream advisories and release notes. A
range in a manifest describes what the resolver may select. The installed
versions describe one environment.

| Package | Previous floor | Previous installed | New floor and basis |
| --- | --- | --- | --- |
| `pypdf` | 4.3.0 | 6.19.0 | 7.2.0. The service opens uploaded PDFs with `PdfReader` on fallback. The xref loop was patched in 6.21.4 and image allocation in 7.0.1. Release 7.2.0 adds a size check before CMap splitting in text extraction and a lookup limit in indexed color decoding. [Xref advisory](https://github.com/py-pdf/pypdf/security/advisories/GHSA-5849-834g-hvw5), [image advisory](https://github.com/py-pdf/pypdf/security/advisories/GHSA-fhff-j4m8-439h), [7.2.0 release](https://github.com/py-pdf/pypdf/releases/tag/7.2.0) |
| `pdfplumber` / `pdfminer.six` | 0.11.0 / transitive | 0.11.10 / 20260107 | 0.11.9. The primary text parser uses `pdfplumber.open` and `page.extract_text`. The 0.11.9 release pins pdfminer.six 20251230, which replaces pickle CMap storage to address CVE-2025-64512. The installed versions already contained that fix. [pdfplumber history](https://github.com/jsvine/pdfplumber/blob/stable/CHANGELOG.md), [pdfminer.six release](https://github.com/pdfminer/pdfminer.six/releases/tag/20251230) |
| `Pillow` | Transitive | 12.3.0 | 13.0.0. `pdfplumber` brings in Pillow. This floor includes fixes for multi-frame memory corruption and TIFF/EXIF memory exhaustion. Exploitability depends on which image operations run. [Multi-frame advisory](https://github.com/python-pillow/Pillow/security/advisories/GHSA-v9pv-5gc8-w2m6), [TIFF advisory](https://github.com/python-pillow/Pillow/security/advisories/GHSA-wqgw-9xfh-qf2g) |
| `pypdfium2` | Transitive | 5.13.0 | 5.15.2. `pdfplumber` brings in native PDFium via this wheel. The service uses text extraction without calling page rendering. Release 5.15.0 incorporated upstream security fixes and 5.15.2 is the first subsequent unyanked release after shutdown regressions. The release notes do not enumerate individual bundled CVEs. [5.15.0 release](https://github.com/pypdfium2-team/pypdfium2/releases/tag/5.15.0), [5.15.2 release history](https://github.com/pypdfium2-team/pypdfium2/releases) |
| `certifi` | Transitive | 2026.7.22 | 2026.10.18. HTTPX pulls in the CA bundle, including through Hugging Face Hub. The fixed bundle removes affected emSign roots following a compromised-intermediate-key incident. [Maintainer advisory](https://github.com/certifi/python-certifi/security/advisories/GHSA-6q48-6c7w-9gw2) |
| `filelock` | Transitive | 3.32.3 | 4.2.1. Torch and Hugging Face Hub depend on it. Advisories include Windows lock permissions and strict soft-lock directory permissions, with impact conditional on the lock type and local directory access. [Windows advisory](https://github.com/tox-dev/filelock/security/advisories/GHSA-8mx5-7m5m-r77g), [strict soft-lock advisory](https://github.com/tox-dev/filelock/security/advisories/GHSA-6627-m3xw-93mp) |
| `setuptools` | Transitive | 78.1.0 | 84.1.0. Torch declares it as a dependency. Package-index path traversal was patched in 78.1.1 and legacy Windows wheel installation path escape in 84.1.0. These are packaging paths. [Package-index advisory](https://github.com/pypa/setuptools/security/advisories/GHSA-5rjg-fvgr-3xxf), [Windows advisory](https://github.com/pypa/setuptools/security/advisories/GHSA-xmj3-9gf7-h52w) |
| `torch` | 2.2.0 | 2.14.1+cpu | 2.15.0. The prior floor admitted affected checkpoint-loading versions. The installed version was also in the range introduced with 2.14.0 for the checkpoint file-read issue, fixed in 2.15.0. The service loads the configured sentence transformer with a pinned default model revision and accepts resume documents via the API. [Checkpoint file-read advisory](https://github.com/pytorch/pytorch/security/advisories/GHSA-v32g-mr63-3j83), [older checkpoint advisory](https://github.com/pytorch/pytorch/security/advisories/GHSA-63cw-57p8-fm3p) |
| `sentence-transformers` | 3.0.0 | 6.1.0 | 6.0.0. The advisory lists 5.6.0 as patched. The maintainer release notes say that release began warning about implicit local trust and that 6.0.0 first enforces the explicit custom-code opt-in. The shipped default model uses built-in modules. [Advisory](https://github.com/advisories/GHSA-jhr6-gm9c-rqjv), [enforcement in 6.0.0](https://github.com/huggingface/sentence-transformers/releases/tag/v6.0.0) |
| `python-multipart` | 0.0.12 | 0.0.32 | 0.0.31. The upload API parses multipart bodies. The former floor allowed multiple resource-exhaustion findings, including a body buffering issue fixed in 0.0.31. [Maintainer advisory](https://github.com/Kludex/python-multipart/security/advisories/GHSA-v9pg-7xvm-68hf) |
| `fastapi` / `starlette` | 0.115.0 / transitive | 0.141.1 / 1.6.0 | 0.133.0 / 1.3.1. The Starlette floor includes multipart upload DoS fixes and the later request form limits fix. FastAPI first added Starlette 1.x support in 0.133.0. [FastAPI release notes](https://fastapi.tiangolo.com/release-notes/#01330-2026-02-24), [multipart advisory](https://github.com/Kludex/starlette/security/advisories/GHSA-2c2j-9gv5-cj73), [form limits advisory](https://github.com/Kludex/starlette/security/advisories/GHSA-82w8-qh3p-5jfq) |

The inspected bootstrap `pip` 24.0 also had advisories. CI already upgrades pip
in its install step. It is an installer and remains outside the application
dependency manifests.

## Compatibility checks

The isolated Windows Python 3.11.9 environment used pypdf 7.2.0, Pillow 13.0.0,
pypdfium2 5.15.2, certifi 2026.10.18, filelock 4.2.1, setuptools 84.1.0,
and torch 2.15.0+cpu. Existing compatible resolutions retained pdfplumber 0.11.10,
pdfminer.six 20260107, FastAPI 0.141.1, Starlette 1.6.0, python-multipart 0.0.32,
and Sentence Transformers 6.1.0. The CPU wheel matched the SHA-256 published by
the PyTorch index. The shared environment was used as the source of the package
copy and its installed packages were left intact.

- `python -m pip check` and `python -m pip install --dry-run --no-index -r requirements.txt` passed.
- `ruff check .` passed with Ruff 0.17.6. `python -m pytest -v` passed all 132 tests with five warnings in 18.20 s. The suite covers PDF text extraction with a forced pypdf fallback, DOCX parsing, API contracts, and embedding failure with deterministic fallback enabled and disabled. The threaded TestClient run required execution outside the restricted local sandbox.
- Valid synthetic PDF and DOCX multipart requests both returned HTTP 200 with the expected parsed summary, source format, and caller-supplied resume ID. A separate test rendered a synthetic PDF page through native PDFium into a 72 × 72 Pillow RGB image.
- A Hugging Face cache lock acquired successfully with filelock 4.2.1. The loaded certifi bundle excluded the affected emSign ECC Root CA G3 certificate.
- `HF_HUB_OFFLINE=1` with `python smoke_test_embedding.py` ran the pinned MiniLM revision `1110a243fdf4706b3f48f1d95db1a4f5529b4d41`. PyTorch reported a CPU build and inference produced 384-dimensional embeddings, raw cosine 0.6552, presentation index 65.5, and status `ok`. The same smoke passed with Sentence Transformers 6.0.0 at the declared floor.
- A separate overlay used pdfplumber 0.11.9, pdfminer.six 20251230, FastAPI 0.133.0, Starlette 1.3.1, python-multipart 0.0.31, Sentence Transformers 6.0.0, torch 2.15.0+cpu, and pip 26.2.2. It passed `pip check` and all 29 focused parser and API tests with five warnings in 18.52 s. Valid PDF and DOCX uploads also returned HTTP 200 in this configuration.

No major-version incompatibility appeared on these paths. The Windows test
environment and public advisory metadata do not establish Linux CI compatibility
or comprehensive vulnerability coverage of bundled native libraries. The model
revision and weights stayed fixed for the checks.
