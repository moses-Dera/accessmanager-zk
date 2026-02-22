#!/bin/bash
set -e

echo "=== StarkAccess Protocol Demo Flow ==="

echo -e "\n1. Compiling Noir Circuits..."
cd circuits
nargo check
nargo compile

echo -e "\n2. Generating Witness..."
nargo execute witness

echo -e "\n3. Running Circuit Tests..."
nargo test

echo -e "\n4. Running Cairo Contract Tests..."
cd ../contracts
scarb test

echo -e "\n=== Demo Completed Successfully! ==="
