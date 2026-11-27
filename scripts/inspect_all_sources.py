import httpx
import json
import re
import io
import zipfile

client = httpx.Client(follow_redirects=True, timeout=20.0, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})

print("=== 1. OpenApply Jobs ===")
# Inspect parquet file 0
oa_url = 'https://huggingface.co/api/datasets/edwarddgao/open-apply-jobs/parquet/default/train/0.parquet'
try:
    head = client.head(oa_url)
    print("0.parquet status:", head.status_code, "Content-Length:", head.headers.get('content-length'))
    r_pq = client.get(oa_url, headers={'Range': 'bytes=0-100000'})
    print("Range read 100KB:", len(r_pq.content), "Status:", r_pq.status_code)
except Exception as e:
    print("OpenApply err:", e)

print("\n=== 2. ResumeExtractBench ===")
reb_base = 'https://huggingface.co/datasets/Careerflow/ResumeExtractBench/raw/main/'
for fname in ['schema.json', 'mini.jsonl', 'README.md']:
    try:
        r = client.get(reb_base + fname)
        print(f"File {fname}: status {r.status_code}, len {len(r.content)}")
        if fname == 'schema.json':
            schema = r.json()
            print("  Schema top keys:", list(schema.keys())[:8])
        elif fname == 'mini.jsonl':
            first_line = r.text.splitlines()[0]
            first_obj = json.loads(first_line)
            print("  Mini.jsonl keys:", list(first_obj.keys()))
            print("  Sample file_name:", first_obj.get('file_name'))
    except Exception as e:
        print(f"REB {fname} err:", e)

print("\n=== 3. O*NET Database 31.0 ===")
try:
    head_onet = client.head('https://www.onetcenter.org/dl_files/database/db_31_0_text.zip')
    print("O*NET 31.0 zip status:", head_onet.status_code, "Size:", head_onet.headers.get('content-length'))
except Exception as e:
    print("O*NET err:", e)

print("\n=== 4. Mendeley CareerCorpus ===")
# Let's inspect Mendeley API for dataset wzzwn37gmd version 1
try:
    # Mendeley data uses Elsevier API
    # Check https://data.mendeley.com/public-files/datasets/wzzwn37gmd/files/ or similar
    r = client.get('https://data.mendeley.com/datasets/wzzwn37gmd/1')
    # search for data-file or json in page
    for match in re.finditer(r'href="([^"]*(?:download|file|wzzwn37gmd)[^"]*)"', r.text):
        print("  Found href:", match.group(1))
    for match in re.finditer(r'https://[^"]+\.xlsx', r.text):
        print("  Found xlsx URL:", match.group(0))
    # Also check Elsevier / ScienceDirect / Mendeley public API
    r_pub = client.get('https://data.mendeley.com/api/datasets/wzzwn37gmd/1', headers={'Accept': 'application/json'})
    print("  Mendeley public status:", r_pub.status_code)
except Exception as e:
    print("Mendeley err:", e)

print("\n=== 5. ESCO v1.2.1 ===")
# ESCO has direct CSV packages
esco_urls = [
    'https://esco.ec.europa.eu/en/use-esco/download',
    'https://esco.ec.europa.eu/sites/default/files/2024-04/ESCO_dataset_v1.2.1.zip',
    'https://esco.ec.europa.eu/sites/default/files/2024-01/skills_en.csv',
    'https://esco.ec.europa.eu/sites/default/files/2024-01/occupations_en.csv',
    'https://ec.europa.eu/esco/portal/download',
]
for u in esco_urls:
    try:
        h = client.head(u)
        print(f"ESCO probe {u}: status {h.status_code}, len {h.headers.get('content-length')}")
    except Exception as e:
        print(f"ESCO probe {u} err:", e)

print("\n=== 6. Indian NCO ===")
nco_urls = [
    'https://dge.gov.in/dge/nco-2015',
    'https://labour.gov.in/national-classification-occupations-nco',
]
for u in nco_urls:
    try:
        client_insecure = httpx.Client(verify=False, follow_redirects=True, timeout=10.0)
        r_nco = client_insecure.get(u)
        print(f"NCO probe {u}: status {r_nco.status_code}, len {len(r_nco.content)}")
        for match in re.finditer(r'href="([^"]*(?:nco|NCO|\.pdf|\.csv)[^"]*)"', r_nco.text):
            print("  NCO link:", match.group(1))
    except Exception as e:
        print(f"NCO probe {u} err:", e)
