import urllib.request
import zipfile
import os
import stat

# Download URL for latest Databricks CLI
url = "https://github.com/databricks/cli/releases/download/v0.250.0/databricks_cli_0.250.0_linux_amd64.zip"
zip_path = "/tmp/databricks.zip"
bin_dir = os.path.expanduser("~/.local/bin")

print("Downloading Databricks CLI v0.250.0...")
urllib.request.urlretrieve(url, zip_path)

print("Extracting...")
with zipfile.ZipFile(zip_path, 'r') as zip_ref:
    zip_ref.extractall("/tmp")

print(f"Installing to {bin_dir}...")
os.makedirs(bin_dir, exist_ok=True)
src = "/tmp/databricks"
dst = os.path.join(bin_dir, "databricks")
if os.path.exists(dst):
    os.remove(dst)
os.rename(src, dst)
os.chmod(dst, os.stat(dst).st_mode | stat.S_IEXEC)

print("Cleaning up...")
os.remove(zip_path)

print("Done! Testing...")
os.system(f"{dst} version")
