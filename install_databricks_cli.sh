#!/bin/bash
set -e

cd ~
echo "Downloading Databricks CLI..."
curl -fsSL -o databricks.zip 'https://github.com/databricks/cli/releases/download/v0.236.0/databricks_cli_0.236.0_linux_amd64.zip'

echo "Extracting..."
python3 -c "import zipfile; zipfile.ZipFile('databricks.zip').extractall()"

echo "Installing to ~/.local/bin..."
mkdir -p ~/.local/bin
mv databricks ~/.local/bin/
chmod +x ~/.local/bin/databricks
rm databricks.zip

echo "Verifying installation..."
~/.local/bin/databricks --version
